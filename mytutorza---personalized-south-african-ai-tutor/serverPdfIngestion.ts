import fs from 'fs';
import path from 'path';

export interface TOCEntry { level: 1 | 2; title: string; page?: number; startIndex?: number; endIndex?: number; }
export interface ChapterContent { title: string; level: 1 | 2; content: string; parent?: string; }
export interface PdfTOCResult { file: string; subject: string; grade: string; term: string; toc: TOCEntry[]; chapters: ChapterContent[]; fullText: string; totalChars: number; }

export async function extractPdfText(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error('PDF not found');
  try {
    const mod: any = await import('pdf-parse');
    const pdfParse = mod.default || mod;
    const buf = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    let text = typeof data?.text === 'string' ? data.text : '';
    text = text.replace(/\r/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (text.length > 50) return text;
    return fs.readFileSync(filePath).toString('latin1');
  } catch (err: any) {
    console.warn('pdf-parse failed, raw fallback:', err?.message);
    return fs.readFileSync(filePath).toString('latin1');
  }
}

/** Extracts text from an uploaded PDF buffer (used by the tutoring source ingest route). */
export async function extractPdfTextFromBuffer(buf: Buffer): Promise<string> {
  try {
    const mod: any = await import('pdf-parse');
    const pdfParse = mod.default || mod;
    const data = await pdfParse(buf);
    let text = typeof data?.text === 'string' ? data.text : '';
    text = text.replace(/\r/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (text.length > 50) return text;
    return buf.toString('latin1');
  } catch (err: any) {
    console.warn('pdf-parse (buffer) failed, raw fallback:', err?.message);
    return buf.toString('latin1');
  }
}

export async function extractPdfPages(filePath: string): Promise<string[]> {
  const text = await extractPdfText(filePath);
  return text.split(/\f/).filter((p) => p.trim().length > 0);
}


export function splitByTOC(fullText: string, toc: TOCEntry[]): ChapterContent[] {
  const chapters: ChapterContent[] = [];
  if (toc.length === 0) { chapters.push({ title: 'Full Document', level: 1, content: fullText.slice(0, 12000) }); return chapters; }
  const boundaries = toc.map((entry, idx) => ({ ...entry, nextStart: toc[idx + 1]?.startIndex ?? fullText.length }));
  for (const entry of boundaries) {
    const start = entry.startIndex ?? 0; const end = entry.nextStart ?? fullText.length;
    const content = fullText.slice(start, end).trim(); if (!content || content.length < 30) continue;
    chapters.push({ title: entry.title, level: entry.level, content: content.slice(0, 12000), parent: entry.level === 2 ? toc.find((t) => t.level === 1 && t.startIndex! < entry.startIndex!)?.title : undefined });
  }
  return chapters;
}

const CAPS_SUBJECT_PATTERNS: Array<[RegExp, string]> = [
  [/\bmaths?\s*lit(eracy)?\b|\bwiskunde\s*geletterdheid\b/i, 'Mathematical Literacy'],
  [/\btech(nical)?\s*math/i, 'Technical Mathematics'],
  [/\bmaths?\b|\bmathematics\b|\bwiskunde\b/i, 'Mathematics'],
  [/\bphys(ical)?\s*sci/i, 'Physical Sciences'],
  [/\blife\s*sci/i, 'Life Sciences'],
  [/\bagric\s*man\s*prac/i, 'Agricultural Management Practices'],
  [/\bagric\s*sci/i, 'Agricultural Sciences'],
  [/\bagric\s*tech/i, 'Agricultural Technology'],
  [/\bacc\b|\baccounting\b|\bgrondslag\b/i, 'Accounting'],
  [/\bbus\s*stu|\bbusiness\s*studies\b|\bbesigheid/i, 'Business Studies'],
  [/\beco\b|\beconomics\b|\bekonomie\b/i, 'Economics'],
  [/\bgeo\b|\bgeography\b|\bgeografie\b/i, 'Geography'],
  [/\bhis\b|\bhistory\b|\bgeskiedenis\b/i, 'History'],
  [/\blo\b|\blife\s*orientation\b|\blewensori[eë]ntasie\b/i, 'Life Orientation'],
  [/\bcomp\s*app\s*tech|\bcat\b/i, 'Computer Applications Technology'],
  [/\binfo\s*tech|\binformation\s*technology\b/i, 'Information Technology'],
  [/\bcon\s*stu|\bconsumer\s*studies\b/i, 'Consumer Studies'],
  [/\bhos\s*stu|\bhospitality\b/i, 'Hospitality Studies'],
  [/\btou\b|\btourism\b/i, 'Tourism'],
  [/\bdram|\bdan\s*stu|\bdance\b/i, 'Dramatic Arts'],
  [/\bmus\b|\bmusic\b|\bmusiek\b/i, 'Music'],
  [/\bvis\s*art|\bvisual\s*arts\b/i, 'Visual Arts'],
  [/\brel\s*stu|\breligion\b/i, 'Religion Studies'],
  [/\bsign\s*la|\bsign\s*language\b/i, 'South African Sign Language'],
  [/\benglish\b|\bengels\b/i, 'English'],
  [/\bafrikaans\b/i, 'Afrikaans'],
  [/\bisizulu\b|\bzulu\b/i, 'isiZulu'],
  [/\bisixhosa\b|\bxhosa\b/i, 'isiXhosa'],
  [/\bisindebele\b|\bndebele\b/i, 'isiNdebele'],
  [/\bsepedi\b|\bpedi\b/i, 'Sepedi'],
  [/\bsesotho\b|\bsotho\b/i, 'Sesotho'],
  [/\bsetswana\b|\btswana\b/i, 'Setswana'],
  [/\bsiswati\b|\bswati\b/i, 'siSwati'],
  [/\btshivenda\b|\bvenda\b/i, 'Tshivenda'],
  [/\bxitsonga\b|\btsonga\b/i, 'Xitsonga'],
];

const LANGUAGE_SUBJECTS = new Set([
  'English',
  'Afrikaans',
  'isiZulu',
  'isiXhosa',
  'isiNdebele',
  'Sepedi',
  'Sesotho',
  'Setswana',
  'siSwati',
  'Tshivenda',
  'Xitsonga',
  'South African Sign Language',
]);

/** Infers subject / grade / language variant from a CAPS vault filename. */
export function inferCapsMeta(file: string): { subject: string; grade: string; term: string } {
  const name = String(file || '').replace(/[_-]+/g, ' ');

  let subject = 'General';
  for (const [pattern, label] of CAPS_SUBJECT_PATTERNS) {
    if (pattern.test(name)) {
      subject = label;
      break;
    }
  }

  if (LANGUAGE_SUBJECTS.has(subject)) {
    if (/\bhl\b|\bhome\s*language\b|\bhuistaal\b/i.test(name)) subject = `${subject} Home Language`;
    else if (/\bfal\b|\bfirst\s*additional\b|\beerste\s*addisionele\b/i.test(name))
      subject = `${subject} First Additional Language`;
    else if (/\bsal\b|\bsecond\s*additional\b|\btweede\s*addisionele\b/i.test(name))
      subject = `${subject} Second Additional Language`;
  }

  const gradeMatch = name.match(/\bgr(?:ade)?\s*(\d{1,2})\b/i);
  const grade = gradeMatch ? `Grade ${gradeMatch[1]}` : 'Grade 12';
  const termMatch = name.match(/\bterm\s*([1-4])\b/i);
  const term = termMatch ? `Term ${termMatch[1]}` : 'Term 1';

  return { subject, grade, term };
}

/**
 * Builds `caps_vault/manifest-toc.json` from the PDFs that are actually in the
 * vault. Previously this required a `manifest.json` that did not exist, so the
 * index (and therefore all CAPS retrieval) was always empty.
 *
 * Only ATP / examination-guideline documents are indexed: question papers have
 * no curriculum table of contents and would add noise.
 */
export async function buildCapsVaultIndex(): Promise<{ total: number; processed: number; results: PdfTOCResult[] }> {
  const vaultDir = path.resolve(process.cwd(), 'caps_vault');
  if (!fs.existsSync(vaultDir)) return { total: 0, processed: 0, results: [] };

  const manifestPath = path.resolve(vaultDir, 'manifest.json');
  let files: string[] = [];
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      files = Array.isArray(manifest?.files) ? manifest.files : [];
    } catch {
      files = [];
    }
  }
  if (!files.length) {
    files = fs
      .readdirSync(vaultDir)
      .filter((file) => /\.pdf$/i.test(file))
      .filter((file) => /atp|guideline/i.test(file))
      .sort((a, b) => a.localeCompare(b));
  }

  const results: PdfTOCResult[] = [];
  for (const file of files) {
    const fullPath = path.resolve(vaultDir, file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const fullText = await extractPdfText(fullPath);
      if (!fullText || fullText.length < 50) continue;
      const toc = detectTOC(fullText);
      const chapters = splitByTOC(fullText, toc);
      const { subject, grade, term } = inferCapsMeta(file);
      results.push({ file, subject, grade, term, toc, chapters, fullText, totalChars: fullText.length });
    } catch (err) {
      console.warn(`Skipping ${file}:`, err);
    }
  }

  const enriched = {
    generatedAt: new Date().toISOString(),
    files: results.map((r) => r.file),
    tocIndex: results.map((r) => ({
      file: r.file,
      subject: r.subject,
      grade: r.grade,
      term: r.term,
      toc: r.toc,
      chapterCount: r.chapters.length,
      // Short, cleaned digest so matched subjects give the model real CAPS
      // wording instead of only chapter titles. Kept small for prompt cost.
      preview: String(r.fullText || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 900),
    })),
  };

  fs.writeFileSync(path.resolve(vaultDir, 'manifest-toc.json'), JSON.stringify(enriched, null, 2));
  return { total: files.length, processed: results.length, results };
}

let capsManifestCache: { mtimeMs: number; entries: any[] } | null = null;

function readCapsManifest(): any[] {
  const manifestPath = path.resolve(process.cwd(), 'caps_vault', 'manifest-toc.json');
  try {
    if (!fs.existsSync(manifestPath)) return [];
    const stat = fs.statSync(manifestPath);
    if (capsManifestCache && capsManifestCache.mtimeMs === stat.mtimeMs) {
      return capsManifestCache.entries;
    }
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const entries = Array.isArray(parsed?.tocIndex) ? parsed.tocIndex : [];
    capsManifestCache = { mtimeMs: stat.mtimeMs, entries };
    return entries;
  } catch (err: any) {
    console.warn('CAPS manifest read failed:', err?.message || err);
    return [];
  }
}

/**
 * Synchronous, safe retrieval over the CAPS vault table of contents.
 *
 * IMPORTANT: this used to be `async` but was consumed synchronously by the
 * prompt builders, so the CAPS PDF snippets were never actually injected.
 * It now returns plain arrays (manifest is cached in memory and re-read only
 * when the file changes).
 */
export function searchCapsVault(query: string, limit: number = 5): any[] {
  const entries = readCapsManifest();
  if (!entries.length) return [];

  const terms = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
  if (!terms.length) return [];

  const scored = entries
    .map((entry: any) => {
      const toc = Array.isArray(entry?.toc) ? entry.toc : [];
      const matchedChapters = toc
        .filter((t: any) => {
          const title = String(t?.title || '').toLowerCase();
          return terms.some((term) => title.includes(term));
        })
        .slice(0, 10)
        .map((t: any) => ({ title: String(t.title || ''), page: t.page }));

      const header = `${entry?.subject || ''} ${entry?.grade || ''} ${entry?.term || ''}`.toLowerCase();
      const headerHits = terms.filter((term) => header.includes(term)).length;
      const score = matchedChapters.length * 2 + headerHits;

      if (score === 0) return null;

      // Subject/grade-only queries (e.g. "isiZulu Grade 11") still return the
      // document with its opening chapters so callers get a usable reference.
      const chapters = matchedChapters.length
        ? matchedChapters
        : toc
            .slice(0, 4)
            .map((t: any) => ({ title: String(t?.title || ''), page: t?.page }))
            .filter((t: any) => t.title);

      return {
        file: String(entry?.file || ''),
        subject: entry?.subject || '',
        grade: entry?.grade || '',
        term: entry?.term || '',
        chapters,
        preview: String(entry?.preview || ''),
        score,
      };
    })
    .filter(Boolean) as any[];

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, limit));
}

function cleanTitle(raw: string): string {
  const t = (raw || '').replace(/\s+/g, ' ').replace(/[|_]+/g, ' ').trim();
  if (!t || t.length < 3 || t.length > 70) return '';
  if (t.split(' ').length > 9) return '';
  if (/street|private\s+bag|postnet|www\.|https?:|@|copyright|isbn|press|publishers|fax|tel:/i.test(t)) return '';
  if (/[.!?]$/.test(t)) return '';
  return t;
}
export function detectTOC(text: string): any[] {
  const raw = String(text || '').split('\n');
  const lines = raw.map((l) => l.replace(/\s+/g, ' ').trim());
  let tocStart = -1;
  for (let i = 0; i < Math.min(lines.length, 400); i++) {
    if (/table of contents/i.test(lines[i])) { tocStart = i; break; }
  }
  const out: any[] = [];
  if (tocStart >= 0) {
    for (let i = tocStart + 1; i < Math.min(lines.length, tocStart + 160); i++) {
      const line = lines[i];
      if (!line || line.length > 80) continue;
      let m = line.match(/^(\d+\.\d+(?:\.\d+)?)\s+(.+?)\s*\.{0,3}\s*(\d{1,4})?$/);
      if (!m) m = line.match(/^(?:chapter\s+)?(\d{1,2})[\.:]\s+(.+?)\s*\.{0,3}\s*(\d{1,4})?$/i);
      if (!m) continue;
      const title = cleanTitle(m[2]);
      if (!title) continue;
      const d = m[1].includes('.') ? (m[1].split('.').length > 2 ? 3 : 2) : 1;
      out.push({ level: Math.min(d, 2), title, page: m[3] ? parseInt(m[3], 10) : undefined });
    }
  }
  if (out.length === 0) {
    const re = /^(?:chapter\s+)?(\d{1,2})[\.:]\s+([A-Z][A-Za-z0-9 ,&()'\-]{3,60})$/;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (!m) continue;
      const title = cleanTitle(m[2]);
      if (!title) continue;
      out.push({ level: 1, title, startIndex: text.indexOf(raw[i]) });
    }
  }
  const seen = new Set<string>();
  return out.filter((e) => { const k = e.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
