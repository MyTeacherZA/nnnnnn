import fs from 'fs';
import path from 'path';

export interface TOCEntry {
  level: 1 | 2;
  title: string;
  page?: number;
  startIndex?: number;
  endIndex?: number;
}

export interface ChapterContent {
  title: string;
  level: 1 | 2;
  content: string;
  parent?: string;
}

export interface PdfTOCResult {
  file: string;
  subject: string;
  grade: string;
  term: string;
  toc: TOCEntry[];
  chapters: ChapterContent[];
  fullText: string;
  totalChars: number;
}

export async function extractPdfText(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error('PDF not found');
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('latin1').replace(/\u0000/g, '');
}

export async function extractPdfPages(filePath: string): Promise<string[]> {
  const text = await extractPdfText(filePath);
  const pages = text.split(/\f/).filter((p) => p.trim().length > 0);
  return pages.length > 0 ? pages : [text];
}

export function detectTOC(text: string): TOCEntry[] {
  const toc: TOCEntry[] = [];
  const lines = text.split('\n');
  let tocStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/table of\s*contents/i.test(lines[i])) { tocStart = i; break; }
  }
  const searchFrom = tocStart >= 0 ? tocStart : 0;
  const ch1 = /^(?:chapter\s+)?(\d+)[:\.\s]+([A-Z][A-Za-z\s,&\-]+?)\s*\.{0,}\s*(\d+)?\s*$/;
  const ch2 = /^(\d+\.\d+(?:\.\d+)?)\s+([A-Z][A-Za-z\s,&\-]+?)\s*\.{0,}\s*(\d+)?\s*$/;
  let currentChapter: string | null = null;
  for (let i = searchFrom; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (i > searchFrom + 50 && /^chapter\s+\d+/i.test(line)) break;
    const m1 = line.match(ch1);
    const m2 = line.match(ch2);
    if (m1) {
      const title = m1[2].trim();
      const page = m1[3] ? parseInt(m1[3], 10) : undefined;
      toc.push({ level: 1, title, page });
      currentChapter = title;
    } else if (m2 && currentChapter) {
      const title = m2[2].trim();
      const page = m2[3] ? parseInt(m2[3], 10) : undefined;
      toc.push({ level: 2, title, page, startIndex: undefined });
    }
  }
  if (toc.length === 0) {
    const headingRe = /^(?:chapter\s+)?(\d+)[:\.\s]+([A-Z][A-Za-z\s,&\-]{3,})\s*$/im;
    const re = new RegExp(headingRe.source, 'gim');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const title = match[2].trim();
      toc.push({ level: 1, title, startIndex: match.index });
    }
  }
  return toc;
}

export function splitByTOC(fullText: string, toc: TOCEntry[]): ChapterContent[] {
  const chapters: ChapterContent[] = [];
  if (toc.length === 0) {
    chapters.push({ title: 'Full Document', level: 1, content: fullText.slice(0, 12000) });
    return chapters;
  }
  const boundaries = toc.map((entry, idx) => ({
    ...entry,
    nextStart: toc[idx + 1]?.startIndex ?? fullText.length,
  }));
  for (const entry of boundaries) {
    const start = entry.startIndex ?? 0;
    const end = entry.nextStart ?? fullText.length;
    const content = fullText.slice(start, end).trim();
    if (!content || content.length < 30) continue;
    chapters.push({
      title: entry.title,
      level: entry.level,
      content: content.slice(0, 12000),
      parent: entry.level === 2 ? toc.find((t) => t.level === 1 && t.startIndex! < entry.startIndex!)?.title : undefined,
    });
  }
  return chapters;
}

export async function buildCapsVaultIndex(): Promise<{
  total: number;
  processed: number;
  results: PdfTOCResult[];
}> {
  const vaultDir = path.resolve(process.cwd(), 'caps_vault');
  const manifestPath = path.resolve(vaultDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { total: 0, processed: 0, results: [] };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const files: string[] = Array.isArray(manifest?.files) ? manifest.files : [];
  const results: PdfTOCResult[] = [];

  for (const file of files) {
    const fullPath = path.resolve(vaultDir, file);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const fullText = await extractPdfText(fullPath);
      if (!fullText || fullText.length < 50) continue;
      const toc = detectTOC(fullText);
      const chapters = splitByTOC(fullText, toc);
      const fn = file.toLowerCase();
      const subject = fn.includes('math') ? 'Mathematics (Pure)'
        : fn.includes('physic') || fn.includes('science') ? 'Physical Sciences'
        : fn.includes('life') ? 'Life Sciences'
        : fn.includes('account') ? 'Accounting'
        : fn.includes('geog') ? 'Geography'
        : fn.includes('english') ? 'English Home Language'
        : 'General';
      const grade = /grade\s*(\d+)/i.test(fn) ? `Grade ${fn.match(/grade\s*(\d+)/i)![1]}` : 'Grade 12';
      const term = /term\s*([1-4])/i.test(fn) ? `Term ${fn.match(/term\s*([1-4])/i)![1]}` : 'Term 1';
      results.push({ file, subject, grade, term, toc, chapters, fullText, totalChars: fullText.length });
    } catch (err) {
      console.warn(`Skipping ${file}:`, err);
    }
  }

  const enriched = {
    files: results.map((r) => r.file),
    tocIndex: results.map((r) => ({
      file: r.file, subject: r.subject, grade: r.grade, term: r.term,
      toc: r.toc, chapterCount: r.chapters.length,
    })),
  };
  fs.writeFileSync(path.resolve(vaultDir, 'manifest-toc.json'), JSON.stringify(enriched, null, 2));

  return { total: files.length, processed: results.length, results };
}

export async function searchCapsVault(query: string, limit: number = 5): Promise<any[]> {
  const manifestPath = path.resolve(process.cwd(), 'caps_vault', 'manifest-toc.json');
  if (!fs.existsSync(manifestPath)) return [];
  const enriched = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const q = query.toLowerCase();
  return enriched.tocIndex
    .filter((entry: any) => entry.toc.some((t: any) => t.title.toLowerCase().includes(q)))
    .slice(0, limit);
}