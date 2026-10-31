import fs from 'fs';
import path from 'path';

/* ------------------------------------------------------------------ *
 * DBE subject codes as they appear in ATP / CAPS SP filenames.
 * Key = canonical subject, value = all tokens that mean it.
 * ------------------------------------------------------------------ */
export const SUBJECT_ALIASES: Record<string, string[]> = {
  'Mathematics': ['maths', 'math', 'mathematik', 'wiskunde', 'mathslit', 'mathsliterature'],
  'Mathematics Literature': ['mathslit', 'mathsliterature', 'lit'],
  'Physical Sciences': ['physic', 'physical', 'phys', 'science', 'fysika', 'natuurkunde'],
  'Life Sciences': ['lifesci', 'lifesciences', 'biology', 'lewetenskap'],
  'Natural Sciences': ['natsci', 'naturalsciences', 'naturalscience'],
  'Accounting': ['acc', 'accounting', 'rekening'],
  'Business Studies': ['busstu', 'business', 'besigheid'],
  'Economic Management Studies': ['ems', 'econmgmt'],
  'Economics': ['eco', 'economics', 'ekonomie'],
  'Geography': ['geo', 'geog', 'geography', 'aardrykunde'],
  'History': ['his', 'history', 'geskiedenis'],
  'Life Orientation': ['lo', 'lifeorientation'],
  'Tourism': ['tour', 'tou', 'tourism', 'toerisme'],
  'Consumer Studies': ['cons', 'consstudies', 'consumers', 'verbruikerstudies'],
  'Construction Studies': ['constu', 'constro', 'construction', 'constructionstudies'],
  'Hospitality Studies': ['hosstu', 'hospitality', 'hospitalitystudies'],
  'Design': ['design', 'des'],
  'Fitting and Machining': ['fittandmach', 'fitting', 'machining', 'fitt'],
  'Welding': ['weld', 'weldmet', 'welding', 'sweiswerk'],
  'Mechanical Technology': ['mechtech', 'mechanical', 'mechtechaut'],
  'Electrical Technology': ['electech', 'electrical', 'electechpowsys'],
  'Digital Technology': ['digtech', 'digital', 'digelec', 'digitalelectronics'],
  'Information Technology': ['infotech', 'informationtechnology', 'it'],
  'Computer Applications Technology': ['compapptech', 'computerapplications'],
  'Engineering Graphics and Design': ['enggraphdes', 'engineeringgraphics', 'egd'],
  'Dance Studies': ['danstu', 'dance', 'dancestudies'],
  'Dramatic Arts': ['dramart', 'dramatic', 'dramaticarts'],
  'Music': ['mus', 'music', 'muswam', 'musiam', 'musjazz'],
  'Visual Arts': ['visarts', 'visualarts'],
  'Agricultural Sciences': ['agricsci', 'agricultural'],
  'Agricultural Technology': ['agrictech', 'agriculturaltechnology'],
  'Agricultural Management Practices': ['agricmanprac', 'agriculturalmanagement'],
  'Religious Studies': ['relstu', 'religious', 'religiousstudies'],
  'Sign Language': ['signla', 'sign', 'signlanguage'],
  'Civil Services': ['civser', 'civilservices'],
  'English Home Language': ['english', 'eng', 'ehl', 'home'],
  'English First Additional Language': ['english', 'eng', 'fal'],
  'English Second Additional Language': ['english', 'eng', 'sal'],
  'Afrikaans': ['afrikaans', 'afr'],
  'IsiZulu': ['isizulu', 'izu'],
  'IsiXhosa': ['isixhosa', 'xhosa'],
  'IsiNdebele': ['isindebele', 'nde', 'sindebele'],
  'Sepedi': ['sepedi', 'pedi'],
  'Setswana': ['setswana', 'tswana', 'setswana'],
  'Sesotho': ['sesotho', 'sotho'],
  'Tshivenda': ['tshivenda', 'tiven', 'tshiven'],
  'Siswati': ['siswati', 'siSwati', 'swati'],
  'SiSwati': ['siswati', 'siSwati', 'swati'],
  'Xitsonga': ['xitsonga', 'tsonga', 'xi'],
  'TshiVenda': ['tshivenda', 'tiven'],
};

/* ------------------------------------------------------------------ *
 * Canonical subject -> alias groups that also count as a match
 * ------------------------------------------------------------------ */
const CANONICAL_TO_ALIASES: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [canon, aliases] of Object.entries(SUBJECT_ALIASES)) {
    out[canon] = aliases;
  }
  return out;
})();

export type DocKind = 'atp' | 'policy' | 'content';

export interface CatalogEntry {
  file: string;
  kind: DocKind;
  subjects: string[];
  grades: number[];
}

/* ------------------------------------------------------------------ *
 * Doc classification: ATP = pacing law, CAPS SP = policy law,
 * everything else = enrichment content.
 * ------------------------------------------------------------------ */
export function classifyDoc(file: string): DocKind {
  const f = file.toLowerCase();
  if (/\batp\b/.test(f) || /annual\s*teaching\s*plan/.test(f)) return 'atp';
  if (/caps\s*(sp|\.\s*sp)\b/.test(f) || /curriculum\s*and\s*assessment\s*policy/.test(f)) return 'policy';
  if (/programme\s*requirements|program\s*requirements|assessment\s*guidelines/.test(f)) return 'policy';
  return 'content';
}

/* ------------------------------------------------------------------ *
 * Grade extraction. Handles "Gr 12", "Grade 8", "GR 7-9", "Gr 10".
 * GR 7-9 => [7,8,9]
 * ------------------------------------------------------------------ */
export function parseGrades(file: string): number[] {
  const f = file.toLowerCase().replace(/[_]+/g, ' ');
  const range = f.match(/gr(?:ade)?\s*(\d{1,2})\s*(?:-|to|–|—)\s*(\d{1,2})/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (a > 0 && b > 0) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const out: number[] = [];
      for (let g = lo; g <= hi; g++) out.push(g);
      return out;
    }
  }
  const single = f.match(/gr(?:ade)?\s*(\d{1,2})/);
  if (single) return [Number(single[1])];
  return [];
}

export function gradeNumber(grade: string): number | null {
  const m = String(grade || '').match(/(\d{1,2})/);
  return m ? Number(m[1]) : null;
}

/* ------------------------------------------------------------------ *
 * Subject matching.
 * ------------------------------------------------------------------ */
export function matchSubject(file: string, subject: string): boolean {
  if (!subject) return true;

  // Keep separators so short aliases can be matched on word boundaries.
  // "IsiNdebele HL" must not match the alias "ehl".
  const spaced = file.toLowerCase().replace(/[_]+/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const flat = spaced.replace(/\s+/g, '');

  const canon = String(subject).trim();
  const head = canon.replace(/\(.*?\)/g, '').trim();

  const groups: string[][] = [];
  if (CANONICAL_TO_ALIASES[canon]) groups.push(CANONICAL_TO_ALIASES[canon]);
  if (head && head !== canon && CANONICAL_TO_ALIASES[head]) groups.push(CANONICAL_TO_ALIASES[head]);

  if (!groups.length) {
    const toks = head.toLowerCase().split(/[^a-z]+/).filter((t) => t.length > 2);
    return toks.some((t) => flat.includes(t));
  }

  for (const g of groups) {
    for (const alias of g) {
      const a = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (a.length <= 3) {
        // short alias: require a real word boundary
        const re = new RegExp(`(^|[^a-z])${a}([^a-z]|$)`, 'i');
        if (re.test(spaced)) return true;
      } else if (flat.includes(a)) {
        return true;
      }
    }
  }
  return false;
}

export function matchGrade(file: string, grade: string): boolean {
  const want = gradeNumber(grade);
  if (want === null) return true;
  const grades = parseGrades(file);
  if (grades.length === 0) return false;
  return grades.includes(want);
}

/* ------------------------------------------------------------------ *
 * Build the catalog from manifest.json
 * ------------------------------------------------------------------ */
export function readManifest(): string[] {
  const mp = path.resolve(process.cwd(), 'caps_vault', 'manifest.json');
  if (!fs.existsSync(mp)) return [];
  try {
    const m = JSON.parse(fs.readFileSync(mp, 'utf-8'));
    return Array.isArray(m?.files) ? m.files : [];
  } catch {
    return [];
  }
}

export function buildCatalog(files?: string[]): CatalogEntry[] {
  const list = files && files.length ? files : readManifest();
  const seen = new Set<string>();
  const out: CatalogEntry[] = [];
  for (const f of list) {
    if (seen.has(f)) continue;
    seen.add(f);
    out.push({
      file: f,
      kind: classifyDoc(f),
      grades: parseGrades(f),
      subjects: Object.keys(SUBJECT_ALIASES).filter((s) => matchSubject(f, s)),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Pick files for a subject+grade, optionally by document kind.
 * Exact grade beats a grade range (e.g. GR 12 beats GR 10-12).
 * ------------------------------------------------------------------ */
/* Language-of-teaching variants. A request for "English Home Language"
   must prefer the HL ATP over FAL/SAL. */
const LANG_RANK: Array<[RegExp, number]> = [
  [/\bhl\b|homelanguage|home\s*lang/, 3],
  [/\bfal\b|firstadditional/, 2],
  [/\bsal\b|secondadditional/, 1],
];

function languageScore(file: string, subject: string): number {
  const s = subject.toLowerCase();
  if (!/home|additional|language/.test(s)) return 0;
  const f = file.toLowerCase();
  for (const [re, rank] of LANG_RANK) if (re.test(f)) return rank;
  return 0;
}

export function pickFiles(params: {
  files?: string[];
  subject: string;
  grade: string;
  kind?: DocKind | 'any';
  limit?: number;
}): string[] {
  const { subject, grade, kind = 'any' } = params;
  const limit = params.limit ?? 50;
  const want = gradeNumber(grade);
  const scored: { f: string; s: number }[] = [];

  for (const e of buildCatalog(params.files)) {
    if (kind !== 'any' && e.kind !== kind) continue;
    if (!matchSubject(e.file, subject)) continue;
    if (!matchGrade(e.file, grade)) continue;

    let s = 0;
    if (want !== null && e.grades.length === 1 && e.grades[0] === want) s += 3;
    else if (want !== null && e.grades.includes(want)) s += 2;
    if (e.kind === 'atp') s += 1;
    s += languageScore(e.file, subject);

    // drop duplicate copies like "...final(1).pdf"
    const base = e.file.replace(/\(\d+\)(?=\.pdf$)/i, '');
    if (base !== e.file && scored.some((x) => x.f.replace(/\(\d+\)(?=\.pdf$)/i, '') === base)) continue;

    scored.push({ f: e.file, s });
  }

  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.f);
}