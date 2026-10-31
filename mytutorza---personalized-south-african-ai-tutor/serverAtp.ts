import fs from 'fs';
import path from 'path';

export interface AtpTopic {
  term: string;
  week?: string;
  topic: string;
  periods?: number;
  assessment?: string;
}

export interface AtpPlan {
  file: string;
  subject: string;
  grade: string;
  terms: Record<string, AtpTopic[]>;
  allTopics: string[];
  rawTextChars: number;
  parsed: boolean;
}

export interface ContentAreaWeighting {
  contentArea: string;
  percentages: number[];
  byGrade: Record<string, number>;
}

export interface PolicySection {
  heading: string;
  text: string;
}

export interface PolicyDoc {
  file: string;
  subject: string;
  contentAreas: string[];
  weighting: ContentAreaWeighting[];
  timeAllocation: string[];
  sections: PolicySection[];
  textChars: number;
}

/* ================================================================== *
 * ATP PARSER
 *
 * Real DBE ATP PDFs are spreadsheet exports. pdf-parse flattens the
 * grid, so the reliable structure is:
 *
 *   TERM 1 WEEK 1 WEEK 2 ... WEEK 11      <- term marker (+ week headers)
 *   CAPS TOPIC COMPANIES:                  <- the prescribed topics begin
 *   UNIQUE TRANSACTIONS
 *   FINAL ACCOUNTS, FINANCIAL STATEMENTS
 *   ASSESSMENT: CONTROLLED TEST           <- assessment ends the topic run
 *   CORE CONCEPTS, SKILLS AND VALUES       <- detail begins, stop here
 *   • bullet ...
 *   REQUISITE KNOWLEDGE / RESOURCES        <- scaffolding, ignore
 *
 * So: read the CAPS TOPIC run per term, stop at the first
 * CORE/CONCEPTS/ASSESSMENT/bullet marker.
 * ================================================================== */

const STOP_WORDS = /^(CORE\b|CONCEPTS\b|SKILLS?\b|VALUES?\b|REQUISITE\b|PRE-?\s*KNOWLEDGE\b|RESOURCES?\b|LEARNING\b|ASSESSMENT\b|TEACHER\b|SUPPORTING\b|REMARKS?\b|CAPS\s+REF\b|\u2022|\u25cf|\u00b7|-\s)/i;

/* "CAPS TOPIC" and "CAPS TOPICS" both occur in DBE ATP exports. */
const TOPIC_PREFIX = /^CAPS\s+TOPICS?\b\s*:?\s*/i;

/* Strip CAPS page cross-references: "(CAPS P. 39)", "p. 23", "(CAPS REF p. 23)" */
function stripRefs(s: string): string {
  return s
    .replace(/\(?\s*CAPS\s*(REF|REF\.?)?\s*(P|PP|PAGE)?\.?\s*\d+(\s*[-&]\s*\d+)?\s*\)?/gi, ' ')
    .replace(/\(?\s*P\.?\s*\d+(\s*[-&]\s*\d+)?\s*\)?/gi, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAllCaps(s: string): boolean {
  const t = s.replace(/[^A-Za-z]/g, '');
  if (t.length < 2) return false;
  const up = s.replace(/[^A-Z]/g, '').length;
  return up / t.length >= 0.85;
}

function cleanTopic(s: string): string {
  let t = stripRefs(
    s
      .replace(/\s+/g, ' ')
      .replace(/^[|\-•\s]+/, '')
      .replace(/[|\s]+$/, '')
      .replace(/[:;,\s]+$/, '')
      .trim()
  );
  t = t.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length < 3) return '';
  if (/^WEEK\s*\d/i.test(t)) return '';
  if (/^TERM\s*\d/i.test(t)) return '';
  if (/^ANNUAL TEACHING PLANS/i.test(t)) return '';
  if (/\b(private\s*bag|street|struben|plein|pretoria|centurion)\b/i.test(t)) return '';
  return t;
}

/* Split a flattened ATP topic run into individual topic names.
   pdf-parse flattens the ATP grid column-by-column, so each grid
   header arrives as its own short all-caps line. */
function splitTopicRun(run: string): string[] {
  const out: string[] = [];

  for (const rawLine of run.split('\n')) {
    const line = cleanTopic(rawLine.replace(TOPIC_PREFIX, ''));
    if (!line || line.length > 70) continue;

    // A short all-caps line is a column header => its own topic
    if (isAllCaps(line) && line.split(' ').length <= 8) {
      out.push(line.replace(/\s+/g, ' ').trim());
      continue;
    }

    // Longer mixed-case phrase: may contain several headers glued
    // together by the flattening ("FIXED ASSETS, INTERNAL CONTROL ...")
    if (isAllCaps(line)) {
      const parts = matchKnownHeaders(line);
      if (parts.length) { out.push(...parts); continue; }
    }

    // Title-case phrase: keep as a single topic, drop trailing section words
    let t = line.replace(/\s+(CORE|CONCEPTS|SKILLS|VALUES|ASSESSMENT|REQUISITE|RESOURCES)\b.*$/i, '').trim();
    if (t) out.push(t);
  }

  return out;
}

/* Greedy longest-match header extraction over a flattened caps run. */
const HEADER_VOCAB = [
  'OTHER REPRESENTATIONS', 'INTERNAL CONTROL', 'COST ACCOUNTING', 'FIXED ASSETS',
  'FINANCIAL STATEMENTS', 'UNIQUE TRANSACTIONS', 'FINAL ACCOUNTS', 'RECONCILIATIONS',
  'DATA HANDLING', 'PHYSICAL WORLD', 'OTHER REPRESENTATION', 'INVESTIGATIVE SKILLS',
  'PREPARATORY', 'EXAMINATIONS', 'RECONCILIATION', 'INTERPRETATION', 'INTRODUCTION',
  'CLASSIFICATION', 'MEASUREMENT', 'CALCULATIONS', 'PROBABILITY', 'STATISTICS',
  'TRIGONOMETRY', 'SEQUENCES', 'ALGEBRA', 'GEOMETRY', 'FINANCE', 'ANALYSIS',
  'VALUATION', 'INVENTORY', 'BUDGETING', 'COMPANIES', 'PATTERNS', 'FUNCTIONS',
  'TABLES', 'MAPS', 'PLANS', 'GRAPHS', 'REVISIONS', 'REVISION', 'CONTROLLED',
  'TEST', 'INTERNAL', 'EXAMINATION', 'ORIENTATION', 'SURVEY', 'FINANCIALS',
  'RECORDS', 'SPREADSHEET', 'CASHFLOW', 'CASH', 'LEDGER', 'VAT', 'TAX', 'PAYE',
  'PROJECTS', 'ENTREPRENEURSHIP', 'MARKETING', 'FINANCE MANAGEMENT', 'TOURISM',
];

function matchKnownHeaders(s: string): string[] {
  const padded = ' ' + s + ' ';
  const hits: { i: number; len: number; text: string }[] = [];
  for (const k of HEADER_VOCAB) {
    const re = new RegExp(`\\b${k.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(padded)) !== null) hits.push({ i: m.index, len: k.length, text: k.toUpperCase() });
  }
  hits.sort((a, b) => a.i - b.i);
  const out: string[] = [];
  const used: boolean[] = [];
  for (const h of hits) {
    let clash = false;
    for (let k = h.i; k < h.i + h.len; k++) if (used[k]) clash = true;
    if (clash) continue;
    for (let k = h.i; k < h.i + h.len; k++) used[k] = true;
    out.push(h.text);
  }
  return out;
}

export function parseAtp(text: string, opts: { file?: string; subject?: string; grade?: string } = {}): AtpPlan {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim());

  const terms: Record<string, AtpTopic[]> = {};
  for (const t of ['Term 1', 'Term 2', 'Term 3', 'Term 4']) terms[t] = [];

  let current = '';
  let currentTermNo = 0;
  let inTopicRun = false;
  let run: string[] = [];
  let sawCapsTopic = false;

  const flush = () => {
    if (!current || !run.length) { run = []; inTopicRun = false; return; }
    for (const t of splitTopicRun(run.join('\n'))) {
      terms[current].push({ term: current, topic: t });
    }
    run = [];
    inTopicRun = false;
  };

  for (const line of lines) {
    if (!line) continue;

    /* Some ATP exports put "CAPS TOPIC ..." on the same physical line as
       "TERM 3" / "WEEK 1 ...". Split the term marker off first. */
    let body = line;
    const headMatch = line.match(/^.*?\bTERM\s*([1-4])\b(.*)$/i);
    if (headMatch) {
      const termNo = headMatch[1];
      if (termNo !== String(currentTermNo)) {
        flush();
        current = 'Term ' + termNo;
        currentTermNo = Number(termNo);
        sawCapsTopic = false;
      }
      body = headMatch[2] || '';
    }

    body = body.trim();
    if (!body) continue;

    // ---- CAPS TOPIC run begins ----
    if (TOPIC_PREFIX.test(body)) {
      if (sawCapsTopic) flush();
      sawCapsTopic = true;
      inTopicRun = true;
      const after = body.replace(TOPIC_PREFIX, '').trim();
      if (after) run.push(after);
      continue;
    }

    if (!current) continue;

    // ---- inside the topic run ----
    if (inTopicRun) {
      if (STOP_WORDS.test(body)) { flush(); continue; }
      if (isAllCaps(body) || !/^[A-Z][a-z]/.test(body)) {
        if (body.length <= 90) run.push(body);
        continue;
      }
      flush();
      continue;
    }
  }
  flush();

  // Collapse the repeats pdf-parse creates when a grid cell spans many
  // columns ("Tourism sectors" x9 becomes one topic), then de-duplicate.
  const allTopics: string[] = [];
  for (const t of ['Term 1', 'Term 2', 'Term 3', 'Term 4']) {
    const norm = (x: string) => x.toLowerCase().replace(/\s+/g, ' ').trim();
    const counts = new Map<string, number>();
    for (const tp of terms[t]) counts.set(norm(tp.topic), (counts.get(norm(tp.topic)) || 0) + 1);

    const seen = new Set<string>();
    const keep: AtpTopic[] = [];
    for (const tp of terms[t]) {
      const k = norm(tp.topic);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      // A phrase repeated 3+ times is a merged grid cell, keep first only.
      keep.push(tp);
    }
    terms[t] = keep;
    for (const tp of keep) allTopics.push(`${t}: ${tp.topic}`);
  }

  const parsed = allTopics.length > 0;
  return {
    file: opts.file || '',
    subject: opts.subject || '',
    grade: opts.grade || '',
    terms,
    allTopics,
    rawTextChars: raw.length,
    parsed,
  };
}

/* ================================================================== *
 * LLM-assisted ATP extraction
 *
 * pdf-parse flattens the ATP grid column-by-column, so regex alone
 * cannot reliably recover "week N -> topic". Gemma reads the raw ATP
 * text and returns the prescribed topic list per term, which is the
 * pacing authority we actually need. Result is cached on disk so each
 * ATP is only interpreted once.
 * ================================================================== */

const ATP_CACHE_DIR = path.resolve(process.cwd(), 'caps_vault', '.atp_cache');

function cachePath(file: string): string {
  const safe = file.replace(/[^a-z0-9._-]/gi, '_').slice(0, 120);
  return path.resolve(ATP_CACHE_DIR, safe + '.json');
}

function readCache(file: string): AtpPlan | null {
  const p = cachePath(file);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) as AtpPlan; } catch { return null; }
}

function writeCache(plan: AtpPlan): void {
  try {
    fs.mkdirSync(ATP_CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(plan.file), JSON.stringify(plan, null, 2));
  } catch { /* non-fatal */ }
}

export async function parseAtpWithLLM(opts: {
  file: string;
  text: string;
  subject: string;
  grade: string;
  llm: (system: string, user: string) => Promise<any>;
}): Promise<AtpPlan> {
  const cached = readCache(opts.file);
  if (cached && cached.allTopics.length) return cached;

  // Regex pass first: if it already yields a healthy list, trust it.
  const regex = parseAtp(opts.text, { file: opts.file, subject: opts.subject, grade: opts.grade });
  if (regex.terms['Term 1'].length + regex.terms['Term 2'].length +
      regex.terms['Term 3'].length + regex.terms['Term 4'].length >= 4) {
    writeCache(regex);
    return regex;
  }

  const body = opts.text.slice(0, 30000);

  const sys = `You extract the prescribed teaching plan from a South African DBE Annual Teaching Plan (ATP) document.

The text below comes from a PDF whose table layout was flattened, so columns run together and repeat. Ignore that damage: read the real ATP structure.

For EACH of Term 1, Term 2, Term 3 and Term 4, list the prescribed CAPS topics in teaching order.

Rules:
- A "topic" is a curriculum content heading, e.g. "Number patterns", "Companies", "Measurement", "Voter education".
- Merge fragments caused by layout damage into the real heading (e.g. "MAPS, PLANS & OTHER REPRESENTATIONS OF THE PHYSICAL WORLD" is ONE topic, not four).
- Ignore pure assessment rows ("CONTROLLED TEST", "JUNE EXAMINATION", "REVISION") UNLESS they are the only content for that term.
- Ignore page furniture, "REQUISITE KNOWLEDGE", "RESOURCES", "CORE CONCEPTS SKILLS AND VALUES" and the bullet detail under them.
- Never invent topics that are not in the text.
- If a term genuinely has no topics, return an empty array.

Return ONLY valid JSON:
{"terms":{"Term 1":[{"topic":"string","periods":1}],"Term 2":[],"Term 3":[],"Term 4":[]}}`;

  let parsed: any = null;
  try {
    parsed = await opts.llm(sys, 'ATP document follows:\n\n' + body);
  } catch (err: any) {
    console.warn('atp llm failed:', err?.message);
  }

  const terms: Record<string, AtpTopic[]> = { 'Term 1': [], 'Term 2': [], 'Term 3': [], 'Term 4': [] };
  const src = parsed?.terms || parsed;
  for (const t of ['Term 1', 'Term 2', 'Term 3', 'Term 4']) {
    const rows = Array.isArray(src?.[t]) ? src[t] : [];
    for (const r of rows) {
      const topic = cleanTopic(String(r?.topic ?? r ?? ''));
      if (!topic || topic.length > 70) continue;
      const p = Number(r?.periods);
      terms[t].push({ term: t, topic, periods: Number.isFinite(p) && p > 0 ? p : undefined });
    }
  }

  const allTopics: string[] = [];
  for (const t of ['Term 1', 'Term 2', 'Term 3', 'Term 4']) {
    const seen = new Set<string>();
    terms[t] = terms[t].filter((x) => {
      const k = x.topic.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    for (const x of terms[t]) allTopics.push(`${t}: ${x.topic}`);
  }

  // If the model gave us nothing, keep whatever regex salvaged.
  const plan: AtpPlan = allTopics.length
    ? { file: opts.file, subject: opts.subject, grade: opts.grade, terms, allTopics, rawTextChars: opts.text.length, parsed: true }
    : { ...regex, parsed: false };

  writeCache(plan);
  return plan;
}

/* ================================================================== *
 * CAPS SP policy extraction
 * ================================================================== */

const POLICY_HEADINGS = [
  'content area', 'content areas', 'topics', 'weighting', 'time allocation',
  'assessment', 'forms of assessment', 'assessment methods', 'curriculum and assessment',
  'scope', 'purpose', 'definition', 'programme requirements', 'requirements',
  'cognitive', 'moderation', 'prerequisite', 'annual teaching', 'principles',
];

const NOISE = /^(page|\d{1,3}$|www\.|https?:|@|copyright|isbn|fax|tel:|email|contents$)/i;

/* ------------------------------------------------------------------ *
 * CAPS SP policy extraction
 *
 * What actually matters for generation, and where it lives:
 *   "Focus of Content areas"  -> bullet list of content areas
 *   "Weighting of Content areas" -> table: area + % per grade
 *   "Time allocation"           -> table: periods per topic/term
 *   "Assessment"                -> forms, marks, moderation
 * ------------------------------------------------------------------ */

const SECTION_PATTERNS: Array<[string, RegExp]> = [
  ['content_areas', /focus of content areas|content areas?\b/i],
  ['weighting', /weighting of content areas|^weighting$/i],
  ['time_allocation', /time allocation/i],
  ['assessment', /^assessment$|forms of assessment|assessment methods/i],
  ['specification', /specification of content/i],
  ['clarification', /clarification of content/i],
  ['programme_requirements', /programme requirements/i],
  ['cognitive_levels', /cognitive level/i],
  ['moderation', /moderation/i],
];

const STOP_SECTION = /^\d+(\.\d+)*\s+[A-Z]/; // next numbered CAPS section

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .replace(/^./, (c) => c.toUpperCase());
}

export function extractPolicy(text: string, opts: { file?: string; subject?: string; grades?: number[] } = {}): PolicyDoc {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim());
  const grades = opts.grades || [];

  const contentAreas: string[] = [];
  const caSeen = new Set<string>();
  const sections: PolicySection[] = [];
  const weighting: ContentAreaWeighting[] = [];
  const timeAllocation: string[] = [];

  let active: string | null = null;
  let buf: string[] = [];
  let inContentAreaList = false;

  const flush = () => {
    if (!active || !buf.length) { active = null; buf = []; return; }
    const text2 = buf.join('\n').trim();
    if (text2.length > 30) sections.push({ heading: active, text: text2 });
    active = null;
    buf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (/^(page|\d{1,3}$|www\.|https?:|@|copyright|isbn|fax|tel:)/i.test(line)) continue;
    // running header / footer on every page
    if (/^(CAPS|CURRICULUM AND ASSESSMENT POLICY STATEMENT|curriculum and assessment PoliCy statement)$/i.test(line)) continue;
    if (/^(MATHEMATICS|NATURAL SCIENCES|ENGLISH|ACCOUNTING|LIFE SCIENCES|GEOGRAPHY|ECONOMICS|HISTORY)\b.*GRADES?\s*\d/i.test(line)) continue;

    /* ---- numbered section heading, e.g. "2.5 FoCus oF Content areas" ---- */
    const numHead = line.match(/^(\d+\.\d+)\s+(.+)$/);
    if (numHead && numHead[2].length < 90) {
      flush();
      const head = numHead[2];
      const match = SECTION_PATTERNS.find(([, re]) => re.test(head));
      active = match ? match[0] : null;
      if (active === 'content_areas') inContentAreaList = true;
      else if (active) buf.push(line);
      continue;
    }

    /* ---- bullet list of content areas ---- */
    const bullet = line.match(/^[•·\u2022\u25cf]\s*(.+)$/);
    if (bullet && inContentAreaList) {
      let t = bullet[1].replace(/[.;,]\s*(and\s*)?$/i, '').trim();
      t = t.replace(/\s+/g, ' ');
      if (t.length >= 4 && t.length <= 80 && !/^\d/.test(t)) {
        const k = t.toLowerCase();
        if (!caSeen.has(k)) { caSeen.add(k); contentAreas.push(titleCase(t)); }
      }
      continue;
    }

    /* ---- weighting table rows, e.g. "Patterns, Functions and Algebra25%30%35%" ---- */
    const wRow = line.match(/^(.{4,60}?)((?:\d{1,2}(?:\.\d+)?%(?:\s*\d{1,2}(?:\.\d+)?%)*)+)$/);
    if (wRow) {
      flush();
      const area = titleCase(wRow[1].replace(/\s+/g, ' ').trim());
      const pct = (wRow[2].match(/\d{1,2}(?:\.\d+)?%/g) || []).map((p) => parseFloat(p));
      if (area && pct.length && isRealWeightingRow(area, pct)) {
        weighting.push({ contentArea: area, percentages: pct, byGrade: gradePercentMap(pct, grades) });
      }
      continue;
    }

    /* ---- numbered "2.4 time allocation Per topic: Grade 7" style ---- */
    const perTopic = line.match(/time allocation per (topic|term)\s*:?\s*grade\s*(\d+)/i);
    if (perTopic) {
      flush();
      active = 'time_allocation';
      timeAllocation.push(line);
      buf.push(line);
      continue;
    }

    if (STOP_SECTION.test(line)) { flush(); inContentAreaList = false; continue; }

    // stop collecting the content-area bullet list once prose resumes
    if (inContentAreaList && contentAreas.length > 0 && /[a-z]{3,}\s+[a-z]{3,}/.test(line) && !/^[•·]/.test(line) && line.split(' ').length > 12) {
      inContentAreaList = false;
    }

    if (active) buf.push(line);
  }
  flush();

  return {
    file: opts.file || '',
    subject: opts.subject || '',
    contentAreas,
    weighting,
    timeAllocation,
    sections,
    textChars: raw.length,
  };
}

/* Reject total rows, stray numbers and formula fragments. */
function isRealWeightingRow(area: string, pct: number[]): boolean {
  if (/^\d|^=|[=%]/.test(area)) return false;
  if (!/[A-Za-z]{3}/.test(area)) return false;
  if (pct.some((p) => p <= 0)) return false;              // total row "100%100%100%"
  if (pct.length > 4) return false;                       // per-grade columns only
  if (area.split(/\s+/).length > 8) return false;
  if (/^total$/i.test(area)) return false;
  return true;
}

/* When CAPS prints one column per grade, map by position. */
function gradePercentMap(pct: number[], grades: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  grades.forEach((g, i) => {
    if (pct[i] !== undefined) out[`Grade ${g}`] = pct[i];
  });
  return out;
}

/* ================================================================== *
 * GOVERNING PROMPT LAYER  ("the law")
 * ================================================================== */
export function buildPolicyLayer(policy: PolicyDoc | null, plan: AtpPlan | null, term: string): string {
  const out: string[] = [];
  out.push('=============== CURRICULUM LAW (DBE CAPS + ATP) — AUTHORITATIVE ===============');

  if (policy?.file) {
    out.push(`\nPOLICY SOURCE: ${policy.file}`);

    if (policy.contentAreas.length) {
      out.push('Official content areas:\n' + policy.contentAreas.slice(0, 30).map((c) => '  - ' + c).join('\n'));
    }

    if (policy.weighting.length) {
      out.push('\nPRESCRIBED WEIGHTING (follow exactly when distributing marks):');
      for (const w of policy.weighting) {
        const per = Object.entries(w.byGrade).map(([g, p]) => `${g}=${p}%`).join('  ');
        out.push(`  - ${w.contentArea}: ${per || w.percentages.join('% ') + '%'}`);
      }
    }

    if (policy.timeAllocation.length) {
      out.push('\nTIME ALLOCATION:\n' + policy.timeAllocation.slice(0, 8).map((t) => '  ' + t).join('\n'));
    }

    for (const key of ['assessment', 'forms of assessment', 'cognitive_levels', 'moderation']) {
      const s = policy.sections.find((x) => x.heading === key);
      if (s) out.push(`\n[${key}]\n` + s.text.slice(0, 1400));
    }
  }

  if (plan?.file) {
    out.push(`\nANNUAL TEACHING PLAN SOURCE: ${plan.file}`);
    const topics = plan.terms?.[term] || [];
    if (topics.length) {
      out.push(`Mandatory ${term} topics (prescribed pacing — use exactly these as chapters):\n` +
        topics.map((t) => '  - ' + t.topic).join('\n'));
    } else {
      out.push(`No ATP topic list parsed for ${term}. Fall back to the CAPS content areas above.`);
    }
  } else {
    out.push('\nNo ATP available. Fall back to the CAPS content areas above.');
  }

  out.push([
    '',
    'RULES:',
    '1. Stay strictly inside the ATP topic list and CAPS content areas for this grade and term.',
    '2. Never introduce out-of-scope content, even if enrichment text mentions it.',
    '3. When allocating marks, respect the prescribed weighting above.',
    '4. Respect the prescribed assessment types and time allocation.',
    '5. If ATP and CAPS conflict with enrichment text, ATP and CAPS win.',
    '=========================================================================',
  ].join('\n'));

  return out.join('\n');
}

/* ================================================================== *
 * convenience loaders
 * ================================================================== */
export async function loadAtpForPdf(fullPath: string, extract: (p: string) => Promise<string>, opts: { subject?: string; grade?: string } = {}) {
  return parseAtp(await extract(fullPath), { file: path.basename(fullPath), subject: opts.subject, grade: opts.grade });
}

export async function loadPolicyForPdf(fullPath: string, extract: (p: string) => Promise<string>, opts: { subject?: string; grades?: number[] } = {}) {
  return extractPolicy(await extract(fullPath), { file: path.basename(fullPath), subject: opts.subject, grades: opts.grades });
}

export function vaultHasFile(file: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), 'caps_vault', path.basename(file)));
}