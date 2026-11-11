/**
 * Regression checks for the tutoring lock + RAG pipeline.
 *
 * Run: bun run test:tutoring
 *
 * Covers the failure modes that previously let the tutor drift off-topic:
 *  - cross-subject / cross-grade CAPS planner substitution
 *  - missing PDF snippet retrieval
 *  - scope contract missing from the prompt
 *  - RAG chunk selection blowing the prompt budget
 *  - the off-topic heuristic ignoring unrelated requests
 */
import { getSelectiveCapsCurriculumContext } from '../serverCapsVault';
import {
  buildTutoringSessionScope,
  buildFirmamentSystemPrompt,
  getCurriculumDirective,
} from '../serverFirmamentRules';
import { searchCapsVault } from '../serverPdfIngestion';
import { selectSourceChunks, isPossiblyOffTopic } from '../serverTutoringContext';

let failures = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}${detail ? `\n      ${detail}` : ''}`);
  }
}

// ---- Curriculum selection: no cross-subject / cross-grade steering ----------
const business = getSelectiveCapsCurriculumContext('Business Studies', 'Grade 12', 'Business environments');
check(
  'Business Studies: no Mathematics CAPS leakage',
  business.includes('NO INDEXED PLANNER') &&
    !business.includes('DBE-CAPS-MATH') &&
    !business.includes('Two 3-hour papers'),
  business.slice(0, 300),
);

const businessDirective = getCurriculumDirective({
  subject: 'Business Studies',
  grade: 'Grade 12',
  topic: 'Business environments',
  country: 'ZA',
});
check(
  'Business Studies directive: no Mathematics leakage',
  !businessDirective.includes('DBE-CAPS-MATH') && !businessDirective.includes('Calculus'),
  businessDirective.slice(0, 300),
);

const life = getSelectiveCapsCurriculumContext('Life Sciences', 'Grade 12', 'Photosynthesis');
check(
  'Life Sciences: no Physical Sciences leakage',
  life.includes('NO INDEXED PLANNER') && !life.includes('DBE-CAPS-PHSC'),
  life.slice(0, 300),
);

const maths = getSelectiveCapsCurriculumContext('Mathematics', 'Grade 12', 'Differential Calculus');
check('Mathematics: correct planner', maths.includes('DBE-CAPS-MATH-GR12'));
check(
  'Mathematics: topic-filtered to Calculus',
  maths.toLowerCase().includes('differential calculus') && !maths.includes('Number Patterns, Sequences'),
  maths.slice(0, 400),
);

const physical = getSelectiveCapsCurriculumContext('Physical Sciences', 'Grade 12', 'Momentum');
check('Physical Sciences: correct planner', physical.includes('DBE-CAPS-PHSC-GR12'));

const grade11Maths = getSelectiveCapsCurriculumContext('Mathematics', 'Grade 11', 'Functions');
check(
  'Grade 11 Mathematics: no Grade 12 substitution',
  grade11Maths.includes('NO INDEXED PLANNER') && !grade11Maths.includes('DBE-CAPS-MATH-GR12'),
  grade11Maths.slice(0, 300),
);

const prompt = buildFirmamentSystemPrompt({
  firmamentProfile: {} as any,
  subject: 'Business Studies',
  grade: 'Grade 12',
  country: 'ZA',
  state: '',
  nation: 'South Africa',
  userQuery: 'Business environments',
  taskType: 'tutoring',
});
check(
  'Firmament prompt (Business Studies): no Mathematics CAPS injection',
  !prompt.includes('DBE-CAPS-MATH') && !prompt.includes('Number Patterns, Sequences'),
);

// ---- Session scope contract -------------------------------------------------
const scope = buildTutoringSessionScope({
  lockedTopic: 'Business environments',
  subject: 'Business Studies',
  grade: 'Grade 12',
  hasSource: true,
  sourceName: 'Business Studies Grade 12 Textbook.pdf',
  sourceToc: ['Chapter 1: Business environments', 'Chapter 2: Business operations'],
  offTopicHint: true,
});
for (const needle of [
  'SESSION SCOPE CONTRACT',
  'Business environments',
  'PRIORITY ORDER',
  'OFF-TOPIC TEST',
  'Business Studies Grade 12 Textbook.pdf',
  'SCOPE FLAG FOR THIS TURN',
  'exactly ONE guiding question',
]) {
  check(`Scope contract contains: ${needle}`, scope.includes(needle));
}

// ---- RAG chunk selection ----------------------------------------------------
const filler = (label: string) =>
  `${label} ` + 'lorem ipsum dolor sit amet consectetur adipiscing elit '.repeat(40);
const bigSource = [
  filler('Section A unrelated content'),
  `Section B photosynthesis: chlorophyll absorbs light, carbon dioxide and water become glucose and oxygen. ${filler('detail')}`,
  filler('Section C unrelated content'),
  filler('Section D unrelated content'),
].join('\n');
const retrieved = selectSourceChunks(bigSource, 'photosynthesis chlorophyll', 6000);
check('RAG: retrieved context stays within budget', retrieved.length <= 6000, `${retrieved.length} chars`);
check('RAG: relevant chunk included', retrieved.toLowerCase().includes('photosynthesis'));
check('RAG: empty source safe', selectSourceChunks('', 'anything') === '');

// ---- Off-topic heuristic (zero-cost guard) ---------------------------------
check(
  'Scope: on-topic message not flagged',
  isPossiblyOffTopic(
    'How do I analyse a business environment using the PESTLE framework?',
    'Business environments',
    ['Chapter 1: Business environments'],
  ) === false,
);
check(
  'Scope: unrelated message flagged',
  isPossiblyOffTopic(
    'Can you help me solve quadratic equations by factorising?',
    'Business environments',
    ['Chapter 1: Business environments'],
  ) === true,
);
check(
  'Scope: unrelated "how do I" opener flagged',
  isPossiblyOffTopic('How do I balance a chemical equation step by step?', 'Business environments') === true,
);
check('Scope: greeting not flagged', isPossiblyOffTopic('hello there teacher', 'Business environments') === false);
check(
  'Scope: confusion follow-up not flagged',
  isPossiblyOffTopic('I do not understand what you mean', 'Business environments') === false,
);

// ---- CAPS vault retrieval ---------------------------------------------------
const vaultMatches = searchCapsVault('Mathematics Grade 12 Algebra', 3, {
  subject: 'Mathematics',
  grade: 'Grade 12',
});
check('CAPS vault search returns matches', vaultMatches.length > 0);
if (vaultMatches.length > 0) {
  check(
    'CAPS vault match shape',
    typeof vaultMatches[0].file === 'string' &&
      Array.isArray(vaultMatches[0].chapters) &&
      typeof vaultMatches[0].preview === 'string',
    JSON.stringify(vaultMatches[0]).slice(0, 300),
  );
  check(
    'CAPS vault respects subject + grade',
    vaultMatches.every((m: any) => m.subject === 'Mathematics' && m.grade === 'Grade 12'),
    JSON.stringify(vaultMatches.map((m: any) => `${m.subject} ${m.grade} ${m.file}`)),
  );
} else {
  console.log('SKIP  CAPS vault manifest has no Mathematics matches');
}

// Language documents must never cross languages.
const zuluMatches = searchCapsVault('isiZulu Grade 11', 3, {
  subject: 'isiZulu First Additional Language',
  grade: 'Grade 11',
});
check(
  'CAPS vault never crosses language subjects',
  zuluMatches.length > 0 &&
    zuluMatches.every((m: any) => String(m.subject).toLowerCase().includes('isizulu')),
  JSON.stringify(zuluMatches.map((m: any) => m.subject)),
);

// The vault now actually reaches the prompt (regression: it used to be empty).
const businessWithVault = getSelectiveCapsCurriculumContext(
  'Business Studies',
  'Grade 12',
  'Business environments',
);
check(
  'Business Studies context includes CAPS vault references',
  businessWithVault.includes('CAPS VAULT DOCUMENT REFERENCES'),
);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
