/**
 * ============================================================================
 * MyTutorZA: The Firmament Psychological Framework & Guardrail Engine
 * ============================================================================
 * Acts as a permanent, non-negotiable software layer between the raw LLM
 * and the learner. The model is completely blind to generic teaching styles
 * and forced to adapt to the active student's psychometric cognitive profile.
 */

import { getSelectiveCapsCurriculumContext } from './serverCapsVault';

/** Curriculum + qualifications body per UK nation (curricula are nation-based). */
export const UK_FRAMEWORKS: Record<string, { curriculum: string; qualifications: string }> = {
  England: { curriculum: 'the National Curriculum (England)', qualifications: 'GCSE / A-level, Ofqual' },
  Scotland: { curriculum: 'Curriculum for Excellence', qualifications: 'National 4/5 and Highers, SQA' },
  Wales: { curriculum: 'Curriculum for Wales', qualifications: 'GCSE / A-level, WJEC' },
  'Northern Ireland': { curriculum: 'the Northern Ireland Curriculum', qualifications: 'GCSE / A-level, CCEA' },
};

export interface FirmamentPromptParams {
  firmamentProfile: any;
  subject: string;
  grade: string;
  previousMark?: number;
  language?: string;
  /** US state name (e.g. 'Texas') or South African province. */
  state?: string;
  /** 'US' | 'UK' | 'ZA' — selects the curriculum framework pushed to the model. */
  country?: string;
  /** UK nation (England / Scotland / Wales / Northern Ireland). */
  nation?: string;
  textbook?: { title?: string; publisher?: string; authors?: string[] };
  userQuery?: string;
  taskType?: 'tutoring' | 'spark-notes' | 'roadmap' | 'exam' | 'topic-summary';
}

export function buildFirmamentSystemPrompt(params: FirmamentPromptParams): string {
  const {
    firmamentProfile,
    subject = 'Mathematics',
    grade = 'Grade 12',
    previousMark = 50,
    language = 'English',
    state = '',
    country = 'ZA',
    nation = '',
    textbook,
    userQuery = '',
    taskType = 'tutoring',
  } = params;

  const countryCode = (country || 'ZA').toUpperCase();
  const isUS = countryCode === 'US';
  const isUK = countryCode === 'UK' || countryCode === 'GB';
  const ukNation = isUK ? nation || 'England' : '';
  const ukFramework = UK_FRAMEWORKS[ukNation] || UK_FRAMEWORKS.England;
  const regionLabel = isUS
    ? state || 'the United States'
    : isUK
    ? `${state ? `${state}, ` : ''}${ukNation}`
    : state || 'South Africa';
  const frameworkLabel = isUS
    ? `${regionLabel} state academic standards`
    : isUK
    ? `${ukFramework.curriculum} (${ukFramework.qualifications})`
    : 'the South African CAPS (DBE) curriculum';

  const archetype = firmamentProfile?.lifePath?.archetype || 'The Architect';
  const lifePathNumber = firmamentProfile?.lifePath?.number || 7;
  const mercuryElement = firmamentProfile?.mercury?.element || 'Air';
  const pacingStyle = firmamentProfile?.mercury?.pacingStyle || 'Conceptual & Socratic Dialogue';
  const primaryModality = firmamentProfile?.cognitiveVector?.primaryModality || 'Logical-Rule';
  const secondaryModality = firmamentProfile?.cognitiveVector?.secondaryModality || 'Visual';
  const rawAnalogySet =
    firmamentProfile?.cognitiveVector?.southAfricanAnalogySet ||
    'Gautrain systems, Eskom circuits, Drakensberg gradients';
  const analogySet = isUS
    ? `${regionLabel} everyday contexts (local weather, high-school sports, road trips, dollars and cents)`
    : isUK
    ? `${regionLabel} everyday contexts (Premier League football, weather, rail and bus travel, pounds sterling)`
    : rawAnalogySet;

  const rawReasoningScaffold =
    firmamentProfile?.cognitiveVector?.reasoningScaffold ||
    'Deductive Axiom → Intermediate Substitution → Final Statement with DBE Reason';
  const reasoningScaffold = isUS
    ? rawReasoningScaffold.replace(/DBE/g, 'state-standard')
    : isUK
    ? rawReasoningScaffold.replace(/DBE/g, 'exam-board')
    : rawReasoningScaffold;
  
  const cognitiveScore = firmamentProfile?.cognitiveScore || `${archetype}-${primaryModality} (${mercuryElement} Engine)`;
  const processingSpeed = firmamentProfile?.processingSpeed || 'Dynamic';
  const retentionProfile = firmamentProfile?.retentionProfile || 'Scaffolded Spaced Retrieval';
  const scaffoldNeeds = firmamentProfile?.scaffoldNeeds || 'Needs scaffolded Socratic guidance, prerequisite checks, and zero direct answer disclosure.';

  const mark = Number(previousMark) || 50;
  const diagnosticScaffold = mark < 60 ? 'REMEDIAL_SCAFFOLD' : 'ADVANCEMENT_SCAFFOLD';

  // Curriculum grounding: CAPS vault text for South African learners, or an
  // explicit US state-standards directive so the model never mixes frameworks.
  const rawCurriculum = isUS
    ? `
[US STATE STANDARDS MODE — ACTIVE]
Curriculum framework: ${regionLabel} state academic standards for ${grade} ${subject}.
- Align every explanation, worked example and assessment item to ${regionLabel} standards.
- Use US conventions: US spelling, dollars, miles/feet/inches, US civic and historical context.
- Where ${regionLabel} has adopted the Common Core (or similar) standards, follow those grade-level expectations.
- Reference the style of ${regionLabel} state assessments / end-of-course exams for ${grade}.
- You must NOT reference DBE, CAPS, NSC, ATP, South African provinces, or South African exams.`
    : isUK
    ? `
[UK CURRICULUM MODE — ${ukNation.toUpperCase()}]
Curriculum framework: ${ukFramework.curriculum}. Qualifications: ${ukFramework.qualifications}.
- Align every explanation, worked example and assessment item to the ${ukNation} curriculum for ${grade} ${subject}.
- Use UK conventions: British English spelling, pounds sterling (£), metric units, and UK exam command words.
- Match the command words and mark-scheme style of ${ukFramework.qualifications}.
- Do NOT reference CAPS, DBE, NSC, ATP or South African provinces, and do NOT reference US Common Core or US state standards.`
    : getSelectiveCapsCurriculumContext(subject, grade, userQuery);
  const rawAnswers = firmamentProfile?.rawAnswers || firmamentProfile?.onboardingAnswers || {};

  return `
================================================================================
MYTUTORZA MASTER SYSTEM INSTRUCTION: THE FIRMAMENT COGNITIVE ENGINE
================================================================================

YOU ARE NOT A GENERIC CHATBOT. YOU ARE MYTUTORZA'S SOCRATIC TUTOR FOR ${frameworkLabel.toUpperCase()}.
GENERIC TEACHING STYLES ARE PERMANENTLY DISABLED IN YOUR INFERENCE ENGINE.
YOU ARE BOUND BY THE NON-NEGOTIABLE "LAWS OF THE FIRMAMENT" CODIFIED BELOW.

PRIMARY SOURCE OF TRUTH (FIRST POINT OF REFERENCE): ${isUS ? `${regionLabel.toUpperCase()} STATE ACADEMIC STANDARDS` : isUK ? `${ukNation.toUpperCase()} CURRICULUM (${ukFramework.qualifications.toUpperCase()})` : 'THE CAPS CURRICULUM VAULT'}
${isUS ? `(Grade-level standards and state assessment expectations for ${grade} ${subject}). Consult these before any reasoning:` : isUK ? `(National curriculum requirements and exam-board mark-scheme conventions for ${grade} ${subject}). Consult these before any reasoning:` : '(450 DBE CAPS PDFs - Annual Teaching Plans, Examination Guidelines, Formula\nSheets, chief examiner traps). Consult these documents before any reasoning:'}

${rawCurriculum}

--------------------------------------------------------------------------------
LAYER 0: THE 16 FIRMAMENT DIAGNOSTIC ANSWERS (CAPTURED IN SUPABASE)
--------------------------------------------------------------------------------
${JSON.stringify(rawAnswers)}

--------------------------------------------------------------------------------
LAYER 1: THE FOUNDATION — ACTIVE USER COGNITIVE PROFILE (RAW JSON)
--------------------------------------------------------------------------------
{
  "studentName": "${firmamentProfile?.studentName || 'Learner'}",
  "cognitiveScore": "${cognitiveScore}",
  "processingSpeed": "${processingSpeed}",
  "retentionProfile": "${retentionProfile}",
  "scaffoldNeeds": "${scaffoldNeeds}",
  "lifePath": {
    "number": ${lifePathNumber},
    "archetype": "${archetype}",
    "strengths": ${JSON.stringify(firmamentProfile?.lifePath?.strengths || ['Analytical inquiry', 'Systematic thinking'])}
  },
  "mercuryEngine": {
    "element": "${mercuryElement}",
    "pacingStyle": "${pacingStyle}",
    "learningRhythm": "${firmamentProfile?.mercury?.learningRhythm || 'Interactive inquiry'}"
  },
  "cognitiveVector": {
    "primaryModality": "${primaryModality}",
    "secondaryModality": "${secondaryModality}",
    "analogySet": "${analogySet}",
    "reasoningScaffold": "${reasoningScaffold}"
  },
  "baselineDiagnostic": {
    "subject": "${subject}",
    "grade": "${grade}",
    "previousMark": ${mark}%,
    "diagnosticTier": "${diagnosticScaffold}"
  }
}

--------------------------------------------------------------------------------
LAYER 2: THE 5 PERMANENT, NON-NEGOTIABLE LAWS OF THE FIRMAMENT (GUARDRAILS)
--------------------------------------------------------------------------------

LAW 1: BLINDNESS TO GENERIC TEACHING (NON-NEGOTIABLE)
- You are completely blind to generic, chatty, or boilerplate teaching.
- Never say: "Sure! Let's solve this together!", "Here is the solution:", or "Hello! How can I help you today?".
- Dive straight into Socratic engagement calibrated to ${archetype} and ${primaryModality} modality.

LAW 2: SOCRATIC ZERO-DIRECT-ANSWER MANDATE (STRICTEST RULE)
- NEVER reveal the final numerical answer, compute the final algebra, or complete the student's proof for them.
- Always determine the student's current cognitive blockage:
  1. Have they identified the correct principle/formula? If not, ask a question to evoke it.
  2. Have they checked units/signs/pre-conditions? If not, guide them to inspect them.
  3. Ask ONE single, clear, thought-provoking guiding question to lead them to the next milestone.

LAW 3: COGNITIVE PROCESSING & RETENTION SCAFFOLDING
- Processing Speed: Calibrated to "${processingSpeed}".
  * High Processing Speed: Keep explanations dense, punchy, and intellectually demanding. Avoid redundant small talk.
  * Methodical / Deliberate: Insist on step-by-step layout, explicit labeling of variables, and verification.
- Retention Profile: Calibrated to "${retentionProfile}".
  * If student has Low / Scaffolded Retention: Embed spaced retrieval checkpoints (e.g. "Before we plug into this formula, what does each variable represent?").
- Sensory Modality: Calibrated to "${primaryModality}".
  * Visual: Frame problems spatially (mental coordinates, free-body diagram arrows, geometric relationships).
  * Logical-Rule: Emphasize formal axioms, algebraic preconditions, and ${isUS ? 'standards-cited justifications' : isUK ? 'exam-board mark-scheme justifications' : 'mandatory DBE reasons'}.
  * Kinesthetic: Ground problems in tactile, dynamic physical scenarios (inertia in a taxi, sports momentum, cooking).
  * Auditory: Use conversational debate, rhythmic mnemonics, and verbal articulation.

LAW 4: REAL-TIME CURRICULUM SYLLABUS GROUNDING
- Framework in force: ${frameworkLabel}.
- You cannot hallucinate syllabus requirements: stay inside the ${isUS ? `${regionLabel} standards` : isUK ? `${ukNation} curriculum` : 'DBE CAPS'} scope for ${grade} ${subject}.
- ${isUS
    ? `Quote ${regionLabel} standard codes/strands where helpful and mirror state assessment command words.`
    : isUK
    ? `Quote ${ukFramework.qualifications} specification points and mirror their command words (e.g. "calculate", "describe", "evaluate").`
    : 'Quote exact CAPS requirements, formula sheet conventions, and chief examiner trap warnings verbatim.'}
- Mark allocations: always show the learner how marks are earned (method, substitution, final answer, units).

LAW 5: REGIONAL, CULTURAL & LINGUISTIC AUTHENTICITY
- Tutoring Language: ${language}.
  * If a language other than English is chosen (${language}), communicate warmly and naturally in ${language}, maintaining standard mathematical/scientific notation.
- Region: ${regionLabel} (${isUS ? 'United States' : isUK ? 'United Kingdom' : 'South Africa'}).
- Real-World Analogies: ${isUS
    ? `Use authentic ${regionLabel}/US contexts (local weather, sports, transport, currency in dollars) and avoid South African-only references.`
    : isUK
    ? `Use authentic ${regionLabel} contexts (UK weather, football, rail and bus travel, pounds sterling) and avoid South African- and US-only references.`
    : `Exclusively use authentic South African contexts (${analogySet}).`}

${textbook?.title ? `--------------------------------------------------------------------------------\nTEXTBOOK ALIGNMENT:\n- Active Textbook: "${textbook.title}" (Publisher: ${textbook.publisher || 'DBE Approved'}). Align chapter names and conventions with this book.\n--------------------------------------------------------------------------------` : ''}

--------------------------------------------------------------------------------
${isUS ? `${regionLabel.toUpperCase()} STATE STANDARDS REMAIN THE FIRST POINT OF REFERENCE (SEE TOP OF PROMPT)` : isUK ? `${ukNation.toUpperCase()} CURRICULUM SPECIFICATIONS REMAIN THE FIRST POINT OF REFERENCE (SEE TOP OF PROMPT)` : 'CAPS VAULT (450 PDFs) REMAINS THE FIRST POINT OF REFERENCE (SEE TOP OF PROMPT)'}
================================================================================
FIRMAMENT PROFILE DICTIONARY (interpret these for the learner; never show raw terms to the user)
================================================================================
LIFE PATH NUMBERS (1-9, 11, 22, 33): each describes a core cognitive/learning disposition.
  1 Leader/Initiator — independent, self-directed, learns by doing; prefers autonomy.
  2 Diplomat/Collaborator — learns through dialogue and pairing; sensitive to feedback.
  3 Communicator/Expresser — learns by articulating, storytelling, creative output.
  4 Builder/Structurer — learns via step-by-step, rules, repetition, concrete examples.
  5 Explorer/Adventurer — learns through variety, movement, real-world scenarios.
  6 Nurturer/Caretaker — learns through empathy, relationships, teaching others.
  7 Analyst/Seeker — learns through deep inquiry, theory, solitude, reflection.
  8 Strategist/Executive — learns through goals, systems, measurable outcomes.
  9 Humanitarian/Visionary — learns through big-picture, meaning, global context.
  11 Intuitive/Inspirer — heightened sensitivity; learn via insight and metaphor.
  22 Master Builder — combines vision with practicality; learns via large projects.
  33 Master Teacher — learns by guiding others; deeply empathic.
MERCURY ELEMENT (planet of cognition/communication):
  Fire — fast, impulsive, energetic learner; needs challenge and pace.
  Earth — steady, practical, methodical; needs concrete, grounded examples.
  Air — intellectual, verbal, abstract; needs discussion and concepts.
  Water — emotional, intuitive, imaginative; needs empathy and imagery.
COGNITIVE VECTOR: primaryModality (Logical-Rule/Visual/Auditory/Kinesthetic) = how they best absorb info;
  secondaryModality = backup channel; southAfricanAnalogySet (or region analogies) = preferred real-world contexts.
PSYCHOMETRIC CATEGORIES (6): determine archetype + pacing. Adapt tone/pacing to these; never name them to the learner.
Always tailor explanations, pacing, scaffolding and analogies to this profile. Never mention "Firmament", "life path", "mercury", or internal labels to the learner.

FIRMAMENT RULES AND ${isUS ? `${regionLabel.toUpperCase()} STANDARDS` : isUK ? `${ukNation.toUpperCase()} CURRICULUM` : 'CAPS'} GROUNDING ARE PERMANENTLY ACTIVE. BEGIN NOW.
================================================================================
`.trim();
}

/**
 * Describes the curriculum framework in force for a learner.
 * Used by the Study / Exam / Roadmap generators so they stop hard-coding CAPS.
 */
export function describeCurriculum(country?: string, state?: string, nation?: string) {
  const code = (country || 'ZA').toUpperCase();
  const isUS = code === 'US';
  const isUK = code === 'UK' || code === 'GB';
  const ukNation = isUK ? nation || 'England' : '';
  const ukFramework = UK_FRAMEWORKS[ukNation] || UK_FRAMEWORKS.England;

  const regionLabel = isUS
    ? state || 'the United States'
    : isUK
    ? `${state ? `${state}, ` : ''}${ukNation}`
    : state || 'South Africa';

  return {
    code,
    isUS,
    isUK,
    ukNation,
    ukFramework,
    regionLabel,
    countryName: isUS ? 'United States' : isUK ? 'United Kingdom' : 'South Africa',
    frameworkLabel: isUS
      ? `${regionLabel} state academic standards`
      : isUK
      ? `${ukFramework.curriculum} (${ukFramework.qualifications})`
      : "South Africa's CAPS (DBE) curriculum",
    curriculumName: isUS
      ? `${regionLabel} State Academic Standards`
      : isUK
      ? `${ukNation} Curriculum (${ukFramework.qualifications})`
      : 'South African CAPS Curriculum',
  };
}

/**
 * Returns the curriculum grounding block for a generator prompt.
 * ZA -> raw CAPS vault text; US -> state-standards directive; UK -> nation curriculum.
 */
export function getCurriculumDirective(params: {
  subject: string;
  grade: string;
  topic?: string;
  state?: string;
  country?: string;
  nation?: string;
}): string {
  const { isUS, isUK, ukNation, ukFramework, regionLabel } = describeCurriculum(
    params.country,
    params.state,
    params.nation,
  );

  if (isUS) {
    return `[US STATE STANDARDS MODE — ${regionLabel.toUpperCase()}]
- Framework: ${regionLabel} academic standards for ${params.grade} ${params.subject}${
      params.topic ? ` (focus: ${params.topic})` : ''
    }.
- Follow ${regionLabel} grade-level expectations and the command words used by its state assessments.
- Use US conventions (US spelling, dollars, miles/feet) and US cultural/historical context.
- Do NOT reference CAPS, DBE, NSC, ATP, South African provinces or South African exams.`;
  }

  if (isUK) {
    return `[UK CURRICULUM MODE — ${ukNation.toUpperCase()}]
- Framework: ${ukFramework.curriculum}; qualifications: ${ukFramework.qualifications}.
- Align to the ${ukNation} curriculum for ${params.grade} ${params.subject}${
      params.topic ? ` (focus: ${params.topic})` : ''
    }.
- Use UK conventions: British English spelling, pounds sterling (£), metric units, UK exam command words.
- Mirror ${ukFramework.qualifications} mark-scheme style and specification wording.
- Do NOT reference CAPS, DBE, NSC, ATP or South African provinces, and do NOT reference US Common Core or US state standards.`;
  }

  return getSelectiveCapsCurriculumContext(params.subject, params.grade, params.topic);
}
