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

export async function buildCapsVaultIndex(): Promise<{ total: number; processed: number; results: PdfTOCResult[] }> {
  const vaultDir = path.resolve(process.cwd(), 'caps_vault');
  const manifestPath = path.resolve(vaultDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return { total: 0, processed: 0, results: [] };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const files: string[] = Array.isArray(manifest?.files) ? manifest.files : [];
  const results: PdfTOCResult[] = [];
  for (const file of files) {
    const fullPath = path.resolve(vaultDir, file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const fullText = await extractPdfText(fullPath);
      if (!fullText || fullText.length < 50) continue;
      const toc = detectTOC(fullText); const chapters = splitByTOC(fullText, toc);
      const fn = file.toLowerCase(); const subject = fn.includes('math') ? 'Mathematics (Pure)' : fn.includes('physic') || fn.includes('science') ? 'Physical Sciences' : fn.includes('life') ? 'Life Sciences' : fn.includes('account') ? 'Accounting' : fn.includes('geog') ? 'Geography' : fn.includes('english') ? 'English Home Language' : 'General';
      const grade = /grade\s*(\d+)/i.test(fn) ? `Grade ${fn.match(/grade\s*(\d+)/i)![1]}` : 'Grade 12'; const term = /term\s*([1-4])/i.test(fn) ? `Term ${fn.match(/term\s*([1-4])/i)![1]}` : 'Term 1';
      results.push({ file, subject, grade, term, toc, chapters, fullText, totalChars: fullText.length });
    } catch (err) { console.warn(`Skipping ${file}:`, err); }
  }
  const enriched = { files: results.map((r) => r.file), tocIndex: results.map((r) => ({ file: r.file, subject: r.subject, grade: r.grade, term: r.term, toc: r.toc, chapterCount: r.chapters.length })) };
  fs.writeFileSync(path.resolve(vaultDir, 'manifest-toc.json'), JSON.stringify(enriched, null, 2));
  return { total: files.length, processed: results.length, results };
}

export async function searchCapsVault(query: string, limit: number = 5): Promise<any[]> {
  const manifestPath = path.resolve(process.cwd(), 'caps_vault', 'manifest-toc.json');
  if (!fs.existsSync(manifestPath)) return [];
  const enriched = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); const q = query.toLowerCase(); return enriched.tocIndex.filter((entry: any) => entry.toc.some((t: any) => t.title.toLowerCase().includes(q))).slice(0, limit);
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
