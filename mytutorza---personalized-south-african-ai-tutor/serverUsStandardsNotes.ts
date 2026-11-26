/**
 * ============================================================================
 * MyTutorZA: US "school reality" notes + hard research lock
 * ============================================================================
 * The US has no single national syllabus: the learner's STATE standards and
 * typical grade-level course sequence are the practical source of truth.
 *
 * This module deliberately does NOT pretend to quote standards codes. It gives
 * the model a compact, grade-correct picture of what a learner is experiencing
 * at school, plus a strict boundary for any web research. The LLM (DeepSeek /
 * Grok / Groq) supplies explanation quality inside those rails.
 * ============================================================================
 */

export interface UsNotesParams {
  subject?: string;
  grade?: string;
  state?: string;
  topic?: string;
}

export function gradeNumber(grade?: string): number {
  const match = String(grade || '').match(/\d+/);
  if (!match) return 0;
  const n = parseInt(match[0], 10);
  return n >= 1 && n <= 12 ? n : 0;
}

const US_COURSES: Record<string, Record<number, string>> = {
  math: {
    6: 'Grade 6 Mathematics (ratios, rates, fractions, expressions)',
    7: 'Grade 7 Mathematics (proportional relationships, equations, geometry)',
    8: 'Grade 8 Mathematics (linear equations, functions, Pythagorean theorem)',
    9: 'Algebra I',
    10: 'Geometry',
    11: 'Algebra II / Precalculus (or AP Statistics)',
    12: 'Precalculus / Calculus / AP Calculus AB-BC / AP Statistics',
  },
  english: {
    6: 'Grade 6 ELA (reading, writing, grammar)',
    7: 'Grade 7 ELA (reading, writing, grammar)',
    8: 'Grade 8 ELA (reading, writing, grammar)',
    9: 'English I — foundations of literature and composition',
    10: 'English II — world/American literature and composition',
    11: 'English III — American literature / AP English Language',
    12: 'English IV — world literature / AP English Literature',
  },
  science: {
    6: 'Grade 6 Earth and Space Science',
    7: 'Grade 7 Life Science',
    8: 'Grade 8 Physical Science',
    9: 'Biology / Earth Science',
    10: 'Chemistry',
    11: 'Physics',
    12: 'Physics / AP Biology / AP Chemistry / AP Environmental Science',
  },
  'social studies': {
    6: 'World Geography',
    7: 'US History to 1865',
    8: 'US History 1865-present / Civics',
    9: 'World History',
    10: 'US History',
    11: 'US Government / Economics',
    12: 'US Government / AP US Government / AP Economics',
  },
  history: {
    9: 'World History',
    10: 'US History',
    11: 'US Government / AP US History',
    12: 'US Government / AP US Government',
  },
};

const US_TOPIC_SEQUENCE: Record<string, Record<string, string>> = {
  math: {
    '6-8': 'ratios and proportional relationships; number system and rational numbers; expressions and equations; functions; geometry; statistics and probability',
    '9': 'linear equations and inequalities; functions and graphs; systems of equations; exponents and polynomials; quadratic functions; data analysis',
    '10': 'congruence and similarity; right triangles and trigonometry; circles; coordinate geometry; geometric measurement; proofs',
    '11': 'functions; polynomials; rational expressions; exponentials and logarithms; trigonometry; sequences and series; conic sections',
    '12': 'advanced functions; limits and derivatives (Calculus); statistics and probability (AP Stats); vectors and matrices',
  },
  english: {
    '6-8': 'close reading; textual evidence; main idea and theme; vocabulary in context; narrative and explanatory writing; arguments; grammar and conventions',
    '9-10': 'literary analysis; rhetorical analysis; argumentative and informative writing; research and source integration; grammar and style',
    '11-12': 'complex literary and informational texts; rhetorical situation; synthesis of multiple sources; college-level argument; AP-style FRQ and essay conventions',
  },
  science: {
    '6-8': 'scientific inquiry; matter and energy; cells and ecosystems; Earth systems; space science; forces and motion; engineering design',
    '9-10': 'cell structure and function; genetics; evolution; ecology; atomic structure; chemical reactions; stoichiometry; labeling and lab safety',
    '11-12': 'kinematics; forces; energy; momentum; waves; electricity and magnetism; ap laboratory investigations and data analysis',
  },
  'social studies': {
    '6-8': 'geography; early US history; civics and government; basic economics; primary-source analysis',
    '9-10': 'world civilizations; US history; historical reasoning; source evaluation; maps and timelines',
    '11-12': 'constitutional principles; US government; civil rights; macro/microeconomics; comparative politics; AP-style document analysis',
  },
};

/** Official US research sources allowed for clarification of a locked topic. */
export function usResearchDomainsFor(state?: string): string[] {
  const domains = ['corestandards.org', 'nextgenscience.org', 'collegeboard.org', 'ed.gov', 'nces.ed.gov'];
  const stateName = String(state || '').trim().toLowerCase().replace(/\s+/g, '');
  if (stateName && stateName.length >= 2) {
    domains.unshift(`${stateName}.gov`);
  }
  return Array.from(new Set(domains));
}

function subjectKey(subject?: string): string {
  const s = String(subject || '').trim().toLowerCase();
  if (s.includes('math') || s.includes('algebra') || s.includes('calculus') || s.includes('geometry') || s.includes('statistic')) return 'math';
  if (s.includes('english') || s.includes('language arts') || s.includes('literature') || s.includes('writing')) return 'english';
  if (s.includes('science') || s.includes('biology') || s.includes('chemistry') || s.includes('physics')) return 'science';
  if (s.includes('social') || s.includes('civics') || s.includes('government') || s.includes('economics') || s.includes('geography')) return 'social studies';
  if (s.includes('history')) return 'history';
  return s;
}

function bandFor(grade: number, key: string): string {
  if (grade <= 8) return '6-8';
  if (grade === 9 && key === 'math') return '9';
  if (grade === 10 && key === 'math') return '10';
  if (grade === 11 && key === 'math') return '11';
  if (grade >= 12 && key === 'math') return '12';
  if (grade >= 11 && (key === 'english' || key === 'science' || key === 'social studies')) return '11-12';
  if (grade >= 9 && (key === 'english' || key === 'science' || key === 'social studies')) return '9-10';
  if (key === 'history') return grade >= 11 ? '11-12' : '9-10';
  return String(grade);
}

/**
 * Compact block injected into the master prompt for US learners.
 * This is the hard boundary for what to teach and what to research.
 */
export function buildUsStandardsNotes(params: UsNotesParams): string {
  const grade = gradeNumber(params.grade);
  const key = subjectKey(params.subject);
  const course =
    US_COURSES[key]?.[grade] ||
    US_COURSES[key]?.[12] ||
    `Grade ${grade || 'K-12'} ${params.subject || 'coursework'}`;
  const band = bandFor(grade, key);
  const sequence =
    US_TOPIC_SEQUENCE[key]?.[band] ||
    US_TOPIC_SEQUENCE[key]?.['6-8'] ||
    'grade-level topics for the learner’s subject';
  const topic = String(params.topic || '').trim();
  const domains = usResearchDomainsFor(params.state).join(', ');

  return `
--------------------------------------------------------------------------------
US SCHOOL CURRICULUM NOTES — HARD TEACHING / RESEARCH LOCK
--------------------------------------------------------------------------------
Learner: US${params.state ? ` / ${params.state}` : ''}, grade ${grade || 'unknown'}, studying ${params.subject || 'the subject'}.
Typical course at this grade: ${course}.
What a learner at this level is usually experiencing at school: ${sequence}.
${topic ? `Current locked topic: "${topic}". Keep every answer tied to this topic.` : ''}

TEACHING BOUNDARY (NON-NEGOTIABLE):
- Teach at this grade level and inside this course/topic sequence. Do not drift into another country's curriculum, another grade's standards, or university-level material unless the learner explicitly asks for a prerequisite recap.
- If a question is outside this level, say plainly that it is usually covered later, then explain only the part that connects to the learner's current level.
- Use US spelling, US dollars and customary units. Never reference CAPS, UK key stages, SQA, GCSE/A-level, or South African exam structures for this learner.
- Do not invent standards codes, paper structures or exam-board rules. If an exact code is unknown, say so.

RESEARCH LOCK (ONLY WHEN A WEB SEARCH IS ACTUALLY USED):
- Research ONLY to clarify or emphasise the locked topic above — never to broaden it.
- Permitted sources: ${domains}, plus the learner's own uploaded textbook/source (which always wins).
- Ignore any source outside those domains. If the search results conflict with the learner's uploaded source, the uploaded source wins.
- Never use web material to pull in a different grade band, a different US state's sequence, or a non-US curriculum.
`;
}
