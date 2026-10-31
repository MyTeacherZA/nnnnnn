import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import {
  extractPdfText,
  extractPdfPages,
  detectTOC,
  splitByTOC,
  buildCapsVaultIndex,
  searchCapsVault,
} from './serverPdfIngestion';
import { getSelectiveCapsCurriculumContext } from './serverCapsVault';
import { buildFirmamentSystemPrompt } from './serverFirmamentRules';

dotenv.config();

const LLAMA_API_KEY = process.env.LLAMA_API_KEY || '';
const LLAMA_BASE_URL = process.env.LLAMA_BASE_URL || 'https://ollama.com/api';
const LLAMA_MODEL = process.env.LLAMA_MODEL || 'gemma4:31b-cloud';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

function getSupabaseServerClient(req?: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const clientOptions: any = {};
  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    clientOptions.global = { headers: { Authorization: authHeader } };
  }
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions);
  } catch { return null; }
}

function getServiceSupabaseClient() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || '';
  if (!SUPABASE_URL || !key) return null;
  try {
    return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch { return null; }
}

async function callLlamaChat(params: {
  system?: string;
  user?: string;
  messages?: { role: string; content: string }[];
  jsonMode?: boolean;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  if (!LLAMA_API_KEY) return null;
  const { system, user, messages = [], jsonMode = false, temperature = 0.3, timeoutMs = 90000 } = params;
  const payload: any = {
    model: LLAMA_MODEL,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
      ...(user ? [{ role: 'user', content: user }] : []),
    ],
    temperature,
  };
  if (jsonMode) payload.response_format = { type: 'json_object' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${LLAMA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${LLAMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) { const t = await res.text(); console.warn('Llama error:', res.status, t); return null; }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err: any) {
    clearTimeout(timer);
    console.warn('Llama failed:', err?.message || err);
    return null;
  }
}

function chunkText(text: string, maxChars: number = 6000): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    chunks.push(clean.slice(start, start + maxChars));
    start += maxChars;
  }
  return chunks;
}

function isMathOrPhysics(subject: string): boolean {
  return /math|physic|science/i.test(subject);
}

function hardLock(subject: string): string {
  return isMathOrPhysics(subject)
    ? '\nHARD RULE: Every formula in this chapter MUST be generated with full notation, variables explained, and worked examples. No omission.'
    : '';
}

async function generateChapterNotes(params: {
  subject: string; grade: string; term: string;
  chapter: string; section?: string;
  content: string; sourceFile: string;
  tocContext: string;
  req?: Request;
}): Promise<{ ok: boolean; id?: string; note?: any; error?: string }> {
  const { subject, grade, term, chapter, section = 'General', content, sourceFile, tocContext, req } = params;
  const excerpt = content.slice(0, 6000);
  const caps = getSelectiveCapsCurriculumContext(subject, grade, chapter);

  const systemInstruction = `
You are a DBE CAPS study notes generator.

CURRICULUM TABLE OF CONTENTS (read first):
${tocContext}

TASK:
Write study notes for ONLY this chapter/section:
Subject: ${subject}  Grade: ${grade}  Term: ${term}
Chapter: ${chapter}  Section: ${section || 'General'}

RAW CAPS reference:
${caps}
${hardLock(subject)}

Source content:
${excerpt}

Return valid JSON:
{
  "summary": string,
  "topics": [ { "heading": string, "details": string } ],
  "keyPoints": string[],
  "formulas": [ { "name": string, "formula": string, "variables": string, "when": string, "example": string } ],
  "terminology": [ { "term": string, "definition": string } ],
  "examinerTips": string[]
}
`.trim();

  let paper: any = null;
  if (LLAMA_API_KEY) {
    try {
      const raw = await callLlamaChat({
        system: systemInstruction,
        user: `Generate study notes for this chapter/section only.`,
        jsonMode: true,
        temperature: 0.3,
        timeoutMs: 90000,
      });
      if (raw) {
        let cleaned = raw.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        paper = JSON.parse(cleaned);
      }
    } catch (err: any) {
      console.warn('Chapter note gen error:', err?.message);
    }
  }
  if (!paper) return { ok: false, error: 'Generation failed' };

  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  let id: string | null = null;
  if (client) {
    try {
      const { data } = await client.from('subject_notes').upsert([{
        subject, grade, term,
        chapter,
        section: section || null,
        content: paper,
        formulas: paper.formulas || [],
        source_file: sourceFile,
        generated_at: new Date().toISOString(),
      }], { onConflict: 'subject,grade,term,chapter,section' }).select('id').single();
      id = data?.id || null;
    } catch (err) {
      console.warn('Note save error:', err);
    }
  }
  return { ok: true, id, note: paper };
}

app.post('/api/caps/ingest', async (req: Request, res: Response) => {
  try {
    const result = await buildCapsVaultIndex();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

app.get('/api/caps/pdf-list', (req: Request, res: Response) => {
  const subject = (req.query.subject as string) || '';
  const grade = (req.query.grade as string) || '';
  const maxFiles = Number(req.query.maxFiles || 20);
  try {
    const manifestPath = path.resolve(process.cwd(), 'caps_vault', 'manifest.json');
    if (!fs.existsSync(manifestPath)) return res.json({ pdfs: [], message: 'No manifest' });
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const files: string[] = Array.isArray(manifest?.files) ? manifest.files : [];
    if (!files.length) return res.json({ pdfs: [] });

    const normSubject = subject.toLowerCase().replace(/\s+/g, '');
    const normGrade = grade.toLowerCase().replace(/\s+/g, '');
    const matched = files.filter((f) => {
      const fn = f.toLowerCase().replace(/\s+/g, '');
      const gradeOk = !normGrade || fn.includes(normGrade) || fn.includes('gr');
      const subjOk = !normSubject ||
        fn.includes(normSubject) ||
        normSubject.split('').some((w) => w.length > 2 && fn.includes(w));
      return gradeOk && subjOk;
    });

    return res.json({
      subject, grade, totalMatched: matched.length,
      pdfs: matched.slice(0, maxFiles).map((f, i) => ({ index: i, file: f })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

app.get('/api/caps/toc', (req: Request, res: Response) => {
  const { pdfFile } = req.query as any;
  if (!pdfFile) return res.status(400).json({ error: 'pdfFile required' });

  const tocPath = path.resolve(process.cwd(), 'caps_vault', 'manifest-toc.json');
  if (!fs.existsSync(tocPath)) return res.json({ toc: [], message: 'Run /api/caps/ingest first' });

  const enriched = JSON.parse(fs.readFileSync(tocPath, 'utf-8'));
  const entry = (enriched.tocIndex || []).find((e: any) => e.file === pdfFile);
  if (!entry) return res.json({ toc: [], message: 'PDF not in TOC index' });

  return res.json({ file: pdfFile, subject: entry.subject, grade: entry.grade, term: entry.term, toc: entry.toc });
});

app.post('/api/notes/generate-from-pdf-toc', async (req: Request, res: Response) => {
  const { subject, grade, term, pdfFile, chapterOverride, sectionOverride, maxChapters } = req.body || {};
  if (!subject || !grade || !term || !pdfFile) {
    return res.status(400).json({ error: 'subject, grade, term, pdfFile required' });
  }

  const fullPath = path.resolve(process.cwd(), 'caps_vault', pdfFile);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'PDF not found' });

  const fullText = await extractPdfText(fullPath);
  if (!fullText || fullText.length < 50) return res.status(400).json({ error: 'No extractable text' });

  const toc = detectTOC(fullText);
  const chapters = splitByTOC(fullText, toc);
  const tocContext = toc.map((t) => `${'  '.repeat(t.level - 1)}${t.title}`).join('\n');

  const limit = Number(maxChapters || chapters.length);
  const results: any[] = [];

  for (let i = 0; i < Math.min(limit, chapters.length); i++) {
    const ch = chapters[i];
    const targetChapter = chapterOverride || ch.title;
    const targetSection = sectionOverride || (ch.level === 2 ? ch.title : undefined);

    if (chapterOverride && !ch.title.toLowerCase().includes(chapterOverride.toLowerCase())) continue;

    const result = await generateChapterNotes({
      subject, grade, term,
      chapter: targetChapter,
      section: targetSection,
      content: ch.content,
      sourceFile: pdfFile,
      tocContext,
      req,
    });

    results.push({ chapter: ch.title, section: ch.section, level: ch.level, ...result });
  }

  return res.json({
    success: true, subject, grade, term, pdfFile,
    toc,
    chaptersProcessed: results.length,
    results,
  });
});

app.post('/api/notes/batch-from-pdfs-toc', async (req: Request, res: Response) => {
  const { subject, grade, term, maxPdfs, maxChaptersPerPdf } = req.body || {};
  const sub = subject || 'Mathematics (Pure)';
  const grd = grade || 'Grade 12';
  const trm = term || 'Term 1';
  const pdfLimit = Number(maxPdfs || 10);
  const chapterLimit = Number(maxChaptersPerPdf || 5);

  try {
    const manifestPath = path.resolve(process.cwd(), 'caps_vault', 'manifest.json');
    if (!fs.existsSync(manifestPath)) return res.json({ error: 'No manifest' });
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const files: string[] = Array.isArray(manifest?.files) ? manifest.files : [];
    if (!files.length) return res.json({ error: 'No PDFs in vault' });

    const normSubject = sub.toLowerCase().replace(/\s+/g, '');
    const normGrade = grd.toLowerCase().replace(/\s+/g, '');
    const matched = files.filter((f) => {
      const fn = f.toLowerCase().replace(/\s+/g, '');
      const gradeOk = !normGrade || fn.includes(normGrade) || fn.includes('gr');
      const subjOk = !normSubject ||
        fn.includes(normSubject) ||
        normSubject.split('').some((w) => w.length > 2 && fn.includes(w));
      return gradeOk && subjOk;
    }).slice(0, pdfLimit);

    const allResults: any[] = [];

    for (const file of matched) {
      try {
        const fullPath = path.resolve(process.cwd(), 'caps_vault', file);
        const fullText = await extractPdfText(fullPath);
        if (!fullText || fullText.length < 50) continue;

        const toc = detectTOC(fullText);
        const chapters = splitByTOC(fullText, toc);
        const tocContext = toc.map((t) => `${'  '.repeat(t.level - 1)}${t.title}`).join('\n');

        for (let i = 0; i < Math.min(chapterLimit, chapters.length); i++) {
          const ch = chapters[i];
          const result = await generateChapterNotes({
            subject: sub, grade: grd, term: trm,
            chapter: ch.title,
            section: ch.level === 2 ? ch.title : undefined,
            content: ch.content,
            sourceFile: file,
            tocContext,
            req,
          });
          allResults.push({ file, chapter: ch.title, section: ch.level === 2 ? ch.title : 'General', ...result });
        }
      } catch (err: any) {
        console.warn('PDF processing error:', file, err);
      }
    }

    return res.json({
      success: true, subject: sub, grade: grd, term: trm,
      pdfsProcessed: matched.length,
      totalChapters: allResults.length,
      results: allResults,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post('/api/notes/batch-generate', async (req: Request, res: Response) => {
  const { subject, grade, terms } = req.body || {};
  const sub = subject || 'Mathematics (Pure)';
  const grd = grade || 'Grade 12';
  const termList = Array.isArray(terms) && terms.length ? terms : ['Term 1', 'Term 2', 'Term 3', 'Term 4'];
  const results: any[] = [];

  for (const term of termList) {
    try {
      const r = await fetch(`${req.protocol}://${req.get('host')}/api/notes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: sub, grade: grd, term,
          chapter: `CAPS ${term} Core Coverage`,
          section: 'Core curriculum blocks',
          text: getSelectiveCapsCurriculumContext(sub, grd, term),
          sourceFile: 'CAPS vault',
        }),
      });
      const data = await r.json();
      results.push({ term, ok: !!data?.success, id: data?.id || null });
    } catch (err: any) {
      results.push({ term, ok: false, error: err?.message });
    }
  }
  return res.json({ batch: true, subject: sub, grade: grd, results });
});

app.post('/api/notes/generate', async (req: Request, res: Response) => {
  const { subject, grade, term, chapter, section, text, sourceFile } = req.body || {};
  if (!subject || !grade || !term || !chapter) return res.status(400).json({ error: 'subject, grade, term, chapter required' });

  const fallbackText = getSelectiveCapsCurriculumContext(subject, grade, chapter);
  const excerpt = (text ? text : fallbackText).slice(0, 6000);
  const caps = getSelectiveCapsCurriculumContext(subject, grade, chapter);

  const systemInstruction = `
You are a DBE CAPS study notes generator.
Subject: ${subject}  Grade: ${grade}  Term: ${term}
Chapter: ${chapter}  Section: ${section || 'General'}
RAW CAPS reference: ${caps}${hardLock(subject)}

Source excerpt:
${excerpt}

Return valid JSON:
{
  "summary": string,
  "topics": [ { "heading": string, "details": string } ],
  "keyPoints": string[],
  "formulas": [ { "name": string, "formula": string, "variables": string, "when": string, "example": string } ],
  "terminology": [ { "term": string, "definition": string } ],
  "examinerTips": string[]
}
`.trim();

  let paper: any = null;
  if (LLAMA_API_KEY) {
    try {
      const raw = await callLlamaChat({
        system: systemInstruction,
        user: `Generate study notes for this chapter only.`,
        jsonMode: true,
        temperature: 0.3,
        timeoutMs: 90000,
      });
      if (raw) {
        let cleaned = raw.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        paper = JSON.parse(cleaned);
      }
    } catch (err: any) {
      console.warn('Note gen error:', err?.message);
    }
  }
  if (!paper) return res.status(503).json({ error: 'Generation failed' });

  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  let id: string | null = null;
  if (client) {
    try {
      const { data } = await client.from('subject_notes').upsert([{
        subject, grade, term, chapter, section: section || null,
        content: paper, formulas: paper.formulas || [], source_file: sourceFile || undefined,
        generated_at: new Date().toISOString(),
      }], { onConflict: 'subject,grade,term,chapter,section' }).select('id').single();
      id = data?.id || null;
    } catch (err) { console.warn('Note save error:', err); }
  }
  return res.json({ success: true, id, note: paper });
});

app.get('/api/notes', async (req: Request, res: Response) => {
  const { subject, grade, term, chapter } = req.query as any;
  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  if (!client) return res.json({ items: [] });
  let q = client.from('subject_notes').select('*').order('generated_at', { ascending: true });
  if (subject) q = q.eq('subject', subject);
  if (grade) q = q.eq('grade', grade);
  if (term) q = q.eq('term', term);
  if (chapter) q = q.eq('chapter', chapter);
  const { data, error } = await q;
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ items: data || [] });
});

app.post('/api/termtests/generate', async (req: Request, res: Response) => {
  const { subject, grade, term, examType, durationMinutes } = req.body || {};
  const sub = subject || 'Mathematics (Pure)';
  const grd = grade || 'Grade 12';
  const trm = term || 'Term 1';
  const exam = examType || 'Term Test';
  const dur = Number(durationMinutes) || 60;
  const caps = getSelectiveCapsCurriculumContext(sub, grd, '');

  const systemInstruction = `
You are a DBE Senior Chief Examiner. Generate a ${exam} for ${grd} ${sub} (${trm}).
Duration: ${dur} minutes. Include sections, questions, mark allocations, examiner traps, and an official answer sheet with rubrics.
Ground all content in the CAPS curriculum:
${caps}

Return valid JSON with:
{
  "title": string,
  "subject": string,
  "grade": string,
  "term": string,
  "examType": string,
  "durationMinutes": number,
  "totalMarks": number,
  "instructions": string[],
  "sections": [ { "title": string, "questions": [ { "number": string, "prompt": string, "type": "mcq"|"calculation"|"short"|"essay", "marks": number, "rubric": string, "examinerTrap": string, "solution": string } ] } ],
  "answerSheet": [ { "question": string, "answer": string, "marking": string } ],
  "essayCriteria": string
}
`.trim();

  let paper: any = null;
  if (LLAMA_API_KEY) {
    try {
      const raw = await callLlamaChat({
        system: systemInstruction,
        user: `Generate the ${exam} now for ${grd} ${sub} (${trm}).`,
        jsonMode: true,
        temperature: 0.3,
        timeoutMs: 90000,
      });
      if (raw) {
        let cleaned = raw.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        paper = JSON.parse(cleaned);
      }
    } catch (err: any) { console.warn('Term test error:', err?.message); }
  }
  if (!paper) return res.status(503).json({ error: 'Generation failed' });

  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  let id: string | null = null;
  if (client) {
    try {
      const { data } = await client.from('term_tests').insert([{
        subject: sub, grade: grd, term: trm, exam_type: exam, duration_minutes: dur, paper, answer_sheet: paper.answerSheet || null,
        generated_at: new Date().toISOString(),
      }]).select('id').single();
      id = data?.id || null;
    } catch (err) { console.warn('Term test save error:', err); }
  }
  return res.json({ success: true, id, paper });
});

app.get('/api/termtests', async (req: Request, res: Response) => {
  const { subject, grade, term } = req.query as any;
  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  if (!client) return res.json({ items: [] });
  let q = client.from('term_tests').select('*').order('generated_at', { ascending: true });
  if (subject) q = q.eq('subject', subject);
  if (grade) q = q.eq('grade', grade);
  if (term) q = q.eq('term', term);
  const { data, error } = await q;
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ items: data || [] });
});

app.get('/api/billing/status', (req: Request, res: Response) => {
  const configured = !!process.env.PAYFAST_MERCHANT_ID;
  return res.json({
    betaMode: !configured,
    payfastConfigured: configured,
    plans: [
      { id: 'weekly', label: 'R25 / 7 days', price: 25, cycle: 'weekly' },
      { id: 'monthly', label: 'R80 / month', price: 80, cycle: 'monthly' },
    ],
  });
});

async function startServer() {
  const isDev = process.env.npm_lifecycle_event === 'dev' || process.env.NODE_ENV === 'development';
  const distExists = fs.existsSync(path.resolve(__dirname, 'dist/index.html'));

  if (!isDev && distExists) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Endpoint not found' });
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else if (isDev) {
    const { default: viteDefault } = await import('vite');
    app.use(viteDefault.middlewares);
  } else {
    if (distExists) {
      app.use(express.static(path.resolve(__dirname, 'dist')));
      app.get('*', (req: Request, res: Response) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Endpoint not found' });
        res.sendFile(path.resolve(__dirname, 'dist/index.html'));
      });
    } else {
      app.get('*', (req: Request, res: Response) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Endpoint not found' });
        res.status(200).send('<h1>MyTutorZA is starting up...</h1>');
      });
    }
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`MyTutorZA Full-Stack Server running on http://0.0.0.0:${port}`);
  });
}
startServer().catch((err) => { console.error('Failed to start server:', err); });