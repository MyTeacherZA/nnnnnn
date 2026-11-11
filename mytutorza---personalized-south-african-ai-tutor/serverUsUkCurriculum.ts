/**
 * ============================================================================
 * MyTutorZA: US & UK Curriculum Grounding Layer
 * ============================================================================
 * The app is US/UK-first. This module gives every agent (Tutoring, Study, Exam,
 * Roadmap, Spark Notes) a correct, non-invented curriculum frame for the
 * learner's country:
 *
 *   US  -> the learner's STATE standards (Common Core-based or state-specific)
 *          + high-school AP courses (College Board) where applicable.
 *   UK  -> the learner's NATION (England / Scotland / Wales / Northern Ireland)
 *          + the correct key stage, qualification and exam board.
 *   ZA  -> the CAPS vault (kept as the South African fallback).
 *
 * The block returned by buildCurriculumDirective is deliberately compact
 * (≈500 tokens) — it forbids cross-country leakage and tells the model exactly
 * which official documents exist for this subject + grade, without pretending
 * to quote standards codes that cannot be verified.
 */

export type CurriculumCode = 'US' | 'UK' | 'ZA';

/** Default state → standards family. Big exceptions are listed explicitly. */
const US_STATE_OVERRIDES: Record<string, { math: string; science: string }> = {
  TX: { math: 'Texas Essential Knowledge and Skills (TEKS) for Mathematics', science: 'Texas Essential Knowledge and Skills (TEKS) for Science' },
  FL: { math: 'Florida B.E.S.T. Standards for Mathematics', science: 'Florida Next Generation Sunshine State Standards (NGSSS) for Science' },
  VA: { math: 'Virginia Standards of Learning (SOL) for Mathematics', science: 'Virginia Standards of Learning (SOL) for Science' },
  NY: { math: 'New York State P-12 Learning Standards for Mathematics', science: 'New York State Science Learning Standards (NYSSLS)' },
  IN: { math: 'Indiana Academic Standards for Mathematics', science: 'Indiana Academic Standards for Science' },
  AZ: { math: 'Arizona Academic Standards for Mathematics', science: 'Arizona Science Standards' },
  SC: { math: 'South Carolina College- and Career-Ready Standards for Mathematics', science: 'South Carolina Academic Standards for Science' },
  OK: { math: 'Oklahoma Academic Standards for Mathematics', science: 'Oklahoma Academic Standards for Science' },
  AL: { math: 'Alabama Course of Study: Mathematics', science: 'Alabama Course of Study: Science' },
  PA: { math: 'Pennsylvania Academic Standards for Mathematics', science: 'Pennsylvania Academic Standards for Science & Technology & Engineering Education' },
  GA: { math: 'Georgia Standards of Excellence for Mathematics', science: 'Georgia Standards of Excellence for Science' },
  OH: { math: 'Ohio Learning Standards for Mathematics', science: 'Ohio Learning Standards for Science' },
  MI: { math: 'Michigan Academic Grade Level Content Expectations for Mathematics', science: 'Michigan Academic Science Standards' },
  NC: { math: 'North Carolina Standard Course of Study for Mathematics', science: 'North Carolina Standard Course of Study for Science' },
  WA: { math: 'Washington Learning Standards for Mathematics', science: 'Next Generation Science Standards (NGSS)' },
  CO: { math: 'Colorado Academic Standards for Mathematics', science: 'Next Generation Science Standards (NGSS)' },
};

const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/** College Board Advanced Placement courses, keyed by common subject names. */
const US_AP_BY_SUBJECT: Record<string, string> = {
  math: 'AP Calculus AB / AP Calculus BC / AP Statistics',
  'pre-calculus': 'AP Calculus AB',
  calculus: 'AP Calculus AB / AP Calculus BC',
  statistics: 'AP Statistics',
  english: 'AP English Language and Composition / AP English Literature and Composition',
  'english language': 'AP English Language and Composition',
  'english literature': 'AP English Literature and Composition',
  biology: 'AP Biology',
  chemistry: 'AP Chemistry',
  physics: 'AP Physics 1 / AP Physics 2 / AP Physics C: Mechanics / AP Physics C: EMT',
  'computer science': 'AP Computer Science A / AP Computer Science Principles',
  'computer science principles': 'AP Computer Science Principles',
  programming: 'AP Computer Science A',
  'us history': 'AP U.S. History',
  'american history': 'AP U.S. History',
  history: 'AP U.S. History / AP World History: Modern',
  geography: 'AP Human Geography',
  psychology: 'AP Psychology',
  economics: 'AP Microeconomics / AP Macroeconomics',
  'united states government': 'AP U.S. Government and Politics',
  government: 'AP U.S. Government and Politics',
  spanish: 'AP Spanish Language and Culture / AP Spanish Literature and Culture',
  french: 'AP French Language and Culture',
  chinese: 'AP Chinese Language and Culture',
  japanese: 'AP Japanese Language and Culture',
  german: 'AP German Language and Culture',
  italian: 'AP Italian Language and Culture',
  art: 'AP Art and Design (2-D / 3-D / Drawing) / AP Art History',
  music: 'AP Music Theory',
  environmental: 'AP Environmental Science',
};

/** GCSE / A-level qualifications by subject for England, Wales and NI. */
const UK_QUAL_BY_SUBJECT: Record<string, string> = {
  math: 'GCSE 9–1 Mathematics (AQA / Edexcel / OCR / WJEC / CCEA); A-level Mathematics / Further Mathematics',
  'further mathematics': 'A-level Further Mathematics',
  english: 'GCSE 9–1 English Language and English Literature; A-level English Language / English Literature',
  biology: 'GCSE 9–1 Combined Science (Trilogy/Biology) or Triple Science; A-level Biology',
  chemistry: 'GCSE 9–1 Combined or Triple Science; A-level Chemistry',
  physics: 'GCSE 9–1 Combined or Triple Science; A-level Physics',
  'computer science': 'GCSE 9–1 Computer Science; A-level Computer Science',
  'information technology': 'GCSE 9–1 Computer Science; BTEC IT; A-level Computer Science',
  history: 'GCSE 9–1 History; A-level History',
  geography: 'GCSE 9–1 Geography; A-level Geography',
  'physical education': 'GCSE 9–1 PE; A-level PE',
  art: 'GCSE 9–1 Art & Design; A-level Art & Design',
  music: 'GCSE 9–1 Music; A-level Music',
  spanish: 'GCSE 9–1 Spanish; A-level Spanish',
  french: 'GCSE 9–1 French; A-level French',
  german: 'GCSE 9–1 German; A-level German',
  mandarin: 'GCSE 9–1 Mandarin; A-level Mandarin',
  latin: 'GCSE 9–1 Latin; A-level Latin',
  economics: 'GCSE 9–1 Economics; A-level Economics',
  business: 'GCSE 9–1 Business Studies; A-level Business',
  'physical sciences': 'GCSE 9–1 Combined Science; A-level Physics/Chemistry/Biology',
  psychology: 'A-level Psychology (no GCSE)',
};

/** Scotland: SQA National 5 / Higher / Advanced Higher by subject. */
const SCOTLAND_QUAL_BY_SUBJECT: Record<string, string> = {
  math: 'SQA National 4/5, Higher and Advanced Higher Mathematics',
  english: 'SQA National 4/5, Higher and Advanced Higher Literacy & English',
  biology: 'SQA National 4/5, Higher and Advanced Higher Biology',
  chemistry: 'SQA National 4/5, Higher and Advanced Higher Chemistry',
  physics: 'SQA National 4/5, Higher and Advanced Higher Physics',
  'computer science': 'SQA National 4/5 and Higher Computing Science / Information Technology',
  history: 'SQA National 4/5 and Higher History',
  geography: 'SQA National 4/5 and Higher Geography',
  art: 'SQA National 4/5 and Higher Art & Design',
  music: 'SQA National 4/5 and Higher Music',
  economics: 'SQA National 4/5 and Higher Economics',
  business: 'SQA National 4/5 and Higher Business',
};

function normalizeSubject(subject: string): string {
  return String(subject || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lookupSubject(map: Record<string, string>, subject: string): string | null {
  const norm = normalizeSubject(subject);
  for (const key of Object.keys(map)) {
    if (norm === key) return map[key];
  }
  for (const key of Object.keys(map)) {
    // Allow "Advanced Chemistry" → "chemistry", "AP Physics 1" → "physics"
    if (norm.includes(key) || key.split(' ').every((w) => norm.includes(w))) return map[key];
  }
  return null;
}

function usGradeToBand(grade: string): 'elementary' | 'middle' | 'high' {
  const g = String(grade || '').toLowerCase();
  if (/kindergarten|^grade\s*[0-5]\b|^k\b/.test(g)) return 'elementary';
  if (/^grade\s*[6-8]\b/.test(g)) return 'middle';
  if (/^grade\s*(9|1[0-2])\b/.test(g)) return 'high';
  if (/grade\s*[0-5]|grade\s*1[0-2]/.test(g)) {
    const n = Number((g.match(/\d+/) || ['0'])[0]);
    return n <= 5 ? 'elementary' : n <= 8 ? 'middle' : 'high';
  }
  return 'high';
}

function ukPhase(nation: string, grade: string): string {
  const y = Number((String(grade || '').match(/\d+/) || ['0'])[0]);
  if (nation === 'Scotland') {
    if (y <= 3) return 'Broad General Education (S1–S3)';
    if (y === 4) return 'National 5 preparation (S4)';
    if (y === 5) return 'Higher preparation (S5)';
    return 'Advanced Higher preparation (S6)';
  }
  if (y <= 2) return `Key Stage 1 (Year ${y}) — KS1 SATs`;
  if (y <= 6) return `Key Stage 2 (Year ${y}) — KS2 SATs`;
  if (y <= 9) return `Key Stage 3 (Year ${y})`;
  if (y <= 11) return `Key Stage 4 (Year ${y}) — GCSE (9–1 grading)`;
  return `Sixth Form (Year ${y}) — A-level / BTEC`;
}

export interface CurriculumParams {
  subject: string;
  grade: string;
  topic?: string;
  state?: string;
  country?: string;
  nation?: string;
}

export interface CurriculumSnapshot {
  code: CurriculumCode;
  /** Human-readable framework title, e.g. "Texas Essential Knowledge and Skills (TEKS)". */
  frameworkTitle: string;
  regionLabel: string;
  bandLabel: string;
  qualifications: string;
  examinerLabel: string;
  topicLine: string;
  directives: string[];
  avoid: string[];
  conventions: string[];
}

/** Picks state code from a state name or 2-letter code. Defaults to US client state or 'CA'. */
export function usStateCode(input?: string): string {
  const raw = String(input || '').trim();
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const name = raw.toLowerCase().replace(/\./g, '');
  for (const [code, label] of Object.entries(US_STATE_NAMES)) {
    if (label.toLowerCase() === name) return code;
  }
  return 'US';
}

function usSnapshot(subject: string, grade: string, stateInput?: string): CurriculumSnapshot {
  const state = usStateCode(stateInput || 'US');
  const stateName = US_STATE_NAMES[state] || 'the United States';
  const override = US_STATE_OVERRIDES[state];
  const math = override?.math || (state === 'US'
    ? `the Common Core State Standards for Mathematics (or ${stateName}'s adapted equivalents)`
    : `${stateName} Academic Standards for Mathematics (Common Core–based)`);
  const science = override?.science || (state === 'US'
    ? 'Next Generation Science Standards (NGSS)'
    : `${stateName} Science Standards (NGSS as adopted)`);
  const band = usGradeToBand(grade);
  const bandLabel = band === 'elementary' ? 'Elementary (K–5)' : band === 'middle' ? 'Middle School (6–8)' : 'High School (9–12)';
  const ap = band === 'high' ? lookupSubject(US_AP_BY_SUBJECT, subject) : null;
  const qualifications = ap
    ? `${ap}; state end-of-course exams; SAT / ACT`
    : band === 'elementary'
      ? 'State summative assessments; NAEP basics'
      : 'State end-of-course exams; SAT / ACT';

  return {
    code: 'US',
    frameworkTitle: math,
    regionLabel: stateName,
    bandLabel,
    qualifications,
    examinerLabel: ap ? 'Advanced Placement chief examiner' : 'state end-of-course examiner',
    topicLine: math,
    directives: [
      `Framework: ${math} (${stateName}) for ${grade} ${subject}${ap ? `; for advanced work align to ${ap}` : ''}.`,
      `Science components align to: ${science}.`,
      `Assessment style: ${ap ? `${ap} multi-part FRQs with points-based rubrics and AP command words` : 'state end-of-course exams with points-based rubrics and SAT-style wording'}.`,
      'Command words: explain, analyze, evaluate, justify, determine, construct, complete.',
    ],
    avoid: [
      'CAPS', 'DBE', 'NSC', 'ATP', 'SBA', 'UK exam boards', 'GCSE', 'A-level', 'Key Stage',
      'British spelling', 'pounds sterling', 'A*–G grading',
    ],
    conventions: [
      'US English spelling (color, analyze, program)',
      'US dollars ($)',
      'US customary units (miles, feet, inches, Fahrenheit)',
      'US civics, geography and cultural context',
    ],
  };
}

function ukSnapshot(subject: string, grade: string, nationInput?: string): CurriculumSnapshot {
  const nation = String(nationInput || 'England').trim() || 'England';
  const isScotland = nation.toLowerCase() === 'scotland';
  const qualifications = isScotland
    ? lookupSubject(SCOTLAND_QUAL_BY_SUBJECT, subject) ||
      'SQA National 4/5, Higher and Advanced Higher (Curriculum for Excellence)'
    : lookupSubject(UK_QUAL_BY_SUBJECT, subject) ||
      'GCSE 9–1 (AQA / Edexcel / OCR / WJEC / CCEA) and A-level qualifications';
  const bandLabel = ukPhase(nation, grade);

  if (isScotland) {
    return {
      code: 'UK',
      frameworkTitle: 'Curriculum for Excellence (CfE)',
      regionLabel: 'Scotland',
      bandLabel,
      qualifications,
      examinerLabel: 'SQA senior examiner / mark scheme conventions',
      topicLine: 'Curriculum for Excellence',
      directives: [
        `Framework: Curriculum for Excellence (Scotland) for ${grade} ${subject}. Phase: ${bandLabel}.`,
        `Subject qualification: ${qualifications}.`,
        'Use Scottish Qualifications Authority (SQA) unit specifications and marking instructions; pass marks use percentage bands A–D.',
        'Command words: describe, explain, calculate, identify, compare, evaluate, discuss.',
      ],
      avoid: ['CAPS', 'DBE', 'Common Core', 'GCSE', 'A-level', 'Key Stage', 'Ofqual', 'WJEC'],
      conventions: [
        'British English spelling (colour, analyse, programme)',
        'pounds sterling (£)',
        'metric units (kilometres, Celsius)',
        'Scottish cultural, legal and political context',
      ],
    };
  }

  const examBoard = nation === 'Wales' ? 'WJEC' : nation === 'Northern Ireland' ? 'CCEA' : 'AQA / Edexcel / OCR';
  return {
    code: 'UK',
    frameworkTitle:
      nation === 'Wales'
        ? 'Curriculum for Wales (2016, refined)'
        : nation === 'Northern Ireland'
          ? 'Northern Ireland Curriculum (KS1–KS4)'
          : 'National Curriculum (England)',
    regionLabel: nation,
    bandLabel,
    qualifications,
    examinerLabel: `${examBoard} chief examiner / mark-scheme conventions (9–1 GCSE)`,
    topicLine: 'National Curriculum',
    directives: [
      `Framework: ${nation} curriculum for ${grade} ${subject}. Stage: ${bandLabel}.`,
      `Subject qualification: ${qualifications}.`,
      `Mark style: point-based GCSE/A-level mark schemes; higher-tier content requires case-heavy evaluative answers and UK exam command words.`,
      'Command words: identify, outline, state, describe, explain, analyse, evaluate, justify, assess.',
    ],
    avoid: ['CAPS', 'DBE', 'Common Core', 'TEKS', 'SOL', 'APs (except as international context)', 'Key Stage 5', 'Ofqual for Scotland'],
    conventions: [
      'British English spelling (colour, analyse, programme)',
      'pounds sterling (£)',
      'metric units (kilometres, Celsius)',
      `${nation} cultural, legal and political context`,
    ],
  };
}

/**
 * Curriculum grounding for a learner. US → state standards + AP, UK → nation
 * curriculum + board. No other country's references are leaked into the block.
 */
export function describeCurriculumUsUk(params: CurriculumParams): CurriculumSnapshot {
  const country = String(params.country || 'US').toUpperCase();
  if (country === 'UK' || country === 'GB') {
    return ukSnapshot(params.subject, params.grade, params.nation || 'England');
  }
  return usSnapshot(params.subject, params.grade, params.state || 'US');
}

/**
 * Renders the grounding block injected into every agent prompt.
 * Deliberately explicit about what must NOT be referenced.
 */
export function buildCurriculumDirective(params: CurriculumParams): string {
  const snap = describeCurriculumUsUk(params);
  if (snap.code === 'ZA') {
    // ZA callers handled by the CAPS vault path.
    return '';
  }

  const topicLine = params.topic
    ? `Current locked topic focus: ${params.topic}.`
    : 'No topic filter — cover the syllabus systematically.';

  return [
    `[${snap.code === 'US' ? 'US STATE STANDARDS MODE' : 'UK CURRICULUM MODE'} — ${snap.regionLabel.toUpperCase()}]`,
    `Framework: ${snap.frameworkTitle}. Stage: ${snap.bandLabel}.`,
    `Qualifications: ${snap.qualifications}.`,
    ...snap.directives.map((d) => `- ${d}`),
    `- ${topicLine}`,
    `Conventions:`,
    ...snap.conventions.map((c) => `  * ${c}`),
    `NEVER reference: ${snap.avoid.join('; ')}.`,
    `If the exact statute/spec code is unknown, say so — do not invent codes, paper structures or exam-board timelines.`,
  ].join('\n');
}
