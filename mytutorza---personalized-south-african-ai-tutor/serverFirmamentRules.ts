/**
 * ============================================================================
 * MyTutorZA: The Firmament Psychological Framework & Guardrail Engine
 * ============================================================================
 * Acts as a permanent, non-negotiable software layer between the raw LLM
 * and the learner. The model is completely blind to generic teaching styles
 * and forced to adapt to the active student's psychometric cognitive profile.
 */

import { getSelectiveCapsCurriculumContext } from './serverCapsVault';
import { buildCurriculumDirective as buildUsUkCurriculumDirective } from './serverUsUkCurriculum';
import {
  COGNITIVE_PROFILE_GUIDE,
  DIMENSION_GUIDE,
  type MercuryElement,
} from './src/data/psychometrics';

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
    country = 'US',
    nation = '',
    textbook,
    userQuery = '',
    taskType = 'tutoring',
  } = params;

  const countryCode = (country || 'US').toUpperCase();
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
  const mercuryElement = (firmamentProfile?.mercury?.element || 'Air') as MercuryElement;
  const elementGuide = COGNITIVE_PROFILE_GUIDE[mercuryElement] || COGNITIVE_PROFILE_GUIDE.Air;
  const pacingStyle = firmamentProfile?.mercury?.pacingStyle || 'Conceptual & Socratic Dialogue';
  const primaryModality = firmamentProfile?.cognitiveVector?.primaryModality || 'Logical-Rule';
  const secondaryModality = firmamentProfile?.cognitiveVector?.secondaryModality || 'Visual';
  const rawAnalogySet =
    firmamentProfile?.cognitiveVector?.analogySet ||
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

  // 8-dimension vector. Falls back to the universal dimension dictionary when
  // an older snapshot has no measured vector.
  const measuredDimensions: Record<string, any> =
    firmamentProfile?.dimensions || firmamentProfile?.cognitiveVector?.dimensions || {};
  const dimensionInstructionBlock = (
    Object.keys(DIMENSION_GUIDE) as Array<keyof typeof DIMENSION_GUIDE>
  )
    .map((key) => {
      const dimGuide = DIMENSION_GUIDE[key];
      const measured = measuredDimensions[key];
      const fallbackPole =
        measured?.poleLabel === dimGuide.negative.label ? dimGuide.negative : dimGuide.positive;
      const fallbackComponents = fallbackPole.components.join(' / ');
      const measuredComponents = Array.isArray(measured?.components)
        ? measured.components.join(' / ')
        : fallbackComponents;
      const pole = measured
        ? `${measured.poleLabel} [${measuredComponents}] (${measured.description})`
        : `${dimGuide.positive.label} — not yet measured`;
      const instruction = measured?.aiInstruction || dimGuide.positive.aiInstruction;
      return `- ${dimGuide.label}: ${pole}\n  REQUIRED AI BEHAVIOUR: ${instruction}`;
    })
    .join('\n');

  const mark = Number(previousMark) || 50;
  const diagnosticScaffold = mark < 60 ? 'REMEDIAL_SCAFFOLD' : 'ADVANCEMENT_SCAFFOLD';

  // Curriculum grounding: a country-correct directive (US state standards +
  // AP / UK nation curriculum + exam boards) for US/UK learners, or the raw
  // CAPS vault text for South African learners. Never mixed.
  const rawCurriculum = getCurriculumDirective({
    subject,
    grade,
    topic: userQuery,
    state,
    country,
    nation,
  });
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
LAYER 0: THE 24 FIRMAMENT DIAGNOSTIC ANSWERS (CAPTURED IN SUPABASE)
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
LAYER 1.5: COGNITIVE PROFILE GUIDE — ${elementGuide.title}
--------------------------------------------------------------------------------
LEARNING ABILITY: ${elementGuide.learningAbility}
DIGESTION: ${elementGuide.digestion}
LOGIC FORMATION: ${elementGuide.logic}
RECOLLECTION TRIGGERS: ${elementGuide.recollection}
RETENTION: ${elementGuide.retention}
AI ENGINE INSTRUCTION: ${elementGuide.aiInstruction}

--------------------------------------------------------------------------------
LAYER 1.6: THE 8-DIMENSION COGNITIVE VECTOR (MEASURED BY THE 24-ITEM DIAGNOSTIC)
--------------------------------------------------------------------------------
${dimensionInstructionBlock}

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
  secondaryModality = backup channel; analogySet (or region analogies) = preferred real-world contexts.
COGNITIVE PROFILE GUIDE: the Mercury element maps to a learning-ability/digestion/logic/recollection/retention
  instruction set. Apply it literally; it overrides any generic teaching style.
PSYCHOMETRIC DIMENSIONS (8): Field Independence/Dependence, Conceptual Tempo, Cognitive Load Capacity,
  Perceptual Processing Pathway, Academic Self-Efficacy, Ego Threat, Defensive Self-Presentation,
  Learned Helplessness/Mastery Orientation. Adapt tone, pacing, chunk size and feedback to these; never name
  them to the learner.
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
  const code = (country || 'US').toUpperCase();
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
 * US -> state standards + AP; UK -> nation curriculum + SQA/GCSE boards;
 * ZA -> raw CAPS vault text.
 */
export function getCurriculumDirective(params: {
  subject: string;
  grade: string;
  topic?: string;
  state?: string;
  country?: string;
  nation?: string;
}): string {
  const code = String(params.country || 'US').toUpperCase();

  if (code === 'US' || code === 'UK' || code === 'GB') {
    return buildUsUkCurriculumDirective(params);
  }

  return getSelectiveCapsCurriculumContext(params.subject, params.grade, params.topic);
}

// ============================================================================
// STUDY AGENT — HARD ROLE LOCK & COGNITIVE DELIVERY ENGINE
// ============================================================================

export interface StudyPromptParams {
  firmamentProfile?: any;
  subject: string;
  grade: string;
  topic: string;
  /** User-chosen study session title. Falls back to the topic. */
  title?: string;
  term?: string;
  language?: string;
  state?: string;
  country?: string;
  nation?: string;
  /** Current 4-week study roadmap snapshot for the subject. */
  roadmap?: any;
  /** Cross-agent quiz/session history summary. */
  learningHistory?: any;
  /** Bounded live web snippets (router decides); rendered only when present. */
  webSnippets?: { title: string; url: string; snippet: string }[] | null;
}

/**
 * Compact, shared progress block injected into Tutoring, Study, Exam and
 * Roadmap prompts so quiz results and study-session gaps follow the learner.
 */
export function buildLearningHistoryBlock(history: any): string {
  const sessions = Array.isArray(history?.recentSessions) ? history.recentSessions.slice(0, 5) : [];
  const attempts = Number(history?.overall?.attempted) || 0;
  const correct = Number(history?.overall?.correct) || 0;
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : null;

  if (!sessions.length && !attempts) {
    return `LEARNER PROGRESS CONTEXT
- No prior study-session or quiz data exists for this subject yet.
- Treat the first session as diagnostic: establish prior knowledge before assuming mastery.`;
  }

  const lines = sessions.map((s: any) => {
    const score =
      s?.quizProgress?.attempted > 0
        ? `${s.quizProgress.correct}/${s.quizProgress.attempted} correct`
        : 'no quiz attempt yet';
    const gaps = Array.isArray(s?.gaps) && s.gaps.length ? `; gaps: ${s.gaps.slice(0, 4).join(', ')}` : '';
    return `- ${s.topic || 'Study session'} (${s.status || 'active'}): ${score}${gaps}`;
  });

  return `LEARNER PROGRESS CONTEXT (SHARED ACROSS TUTORING, STUDY AND EXAM)
- Recent study sessions:
${lines.join('\n')}
- Cumulative quiz accuracy: ${accuracy === null ? 'not measured yet' : `${accuracy}% (${correct}/${attempts})`}
- Weak skills / unresolved gaps: ${
    Array.isArray(history?.weakSkills) && history.weakSkills.length
      ? history.weakSkills.slice(0, 8).join(', ')
      : 'not measured yet'
  }
- Active misconceptions: ${
    Array.isArray(history?.misconceptions) && history.misconceptions.length
      ? history.misconceptions.slice(0, 6).join(' | ')
      : 'none recorded'
  }
INSTRUCTION: Use this evidence. Do not re-teach what is already secure; target the gaps first. In the Exam agent, weight questions toward weak skills. In Tutoring, open by checking the weakest prerequisite. In Study, build the pack around the gaps and retrieval failures.`;
}

/**
 * Tutoring session scope contract.
 *
 * Appended LAST to the tutoring system prompt so it has maximum recency and
 * explicitly overrides any broader curriculum / profile instructions above.
 * This is the single source of truth for "what the tutor is allowed to teach".
 */
export function buildTutoringSessionScope(params: {
  lockedTopic: string;
  subject?: string;
  grade?: string;
  sourceName?: string;
  sourceToc?: string[];
  hasSource?: boolean;
  offTopicHint?: boolean;
}): string {
  const topic = String(params.lockedTopic || '').trim() || 'the subject focus';
  const subject = String(params.subject || '').trim() || 'this subject';
  const grade = String(params.grade || '').trim() || 'this grade';
  const sourceName = String(params.sourceName || '').trim();
  const toc = Array.isArray(params.sourceToc)
    ? params.sourceToc.filter((title) => typeof title === 'string' && title.trim()).slice(0, 18)
    : [];

  return `
================================================================================
SESSION SCOPE CONTRACT — HIGHEST PRIORITY, OVERRIDES EVERYTHING ABOVE
================================================================================
This tutoring session is permanently locked to ONE topic: "${topic}".
Subject: ${subject} | Grade: ${grade}

PRIORITY ORDER (highest first):
1. This session lock.
2. ${params.hasSource ? `The uploaded source "${sourceName || 'uploaded source'}"` : 'No uploaded source is active.'}
3. The curriculum scope for ${grade} ${subject}.
4. General knowledge.
Nothing earlier in this prompt may widen the session beyond priority 1.

ALLOWED:
- Teaching, questioning and practising "${topic}" and its direct sub-skills.
- A prerequisite ONLY when the learner's current blocker sits inside "${topic}", and only until the blocker is cleared, then return to "${topic}".

NOT ALLOWED:
- Teaching, quizzing, summarising or discussing any other chapter, topic, subject or exam paper.
- Pulling in "related" chapters or syllabus content to appear comprehensive.
- Accepting a topic change mid-session. If the learner tries, reply briefly: "That sits outside this session's locked topic. Start a new session for it, or let's finish ${topic} first." Then ask one question about "${topic}".
- Dumping answers without the learner's own thinking. Keep every reply focused; a substantive explanation (up to roughly 1,500 words) is welcome when the learner genuinely needs the full reasoning laid out. End with exactly ONE guiding question.

OFF-TOPIC TEST (run before replying):
- If the learner's message is not about "${topic}", do not teach it. In one short sentence name the boundary, then redirect with a question on "${topic}".
- Greetings, encouragement and homework logistics may take ONE short sentence, then return to "${topic}".

SOURCE RULE:
${
  params.hasSource
    ? `- "${sourceName || 'The uploaded source'}" is the FIRST context and the holy grail for this session.
- Ground explanations in the retrieved source excerpts below. Use internet knowledge only to clarify or emphasise what the source says about "${topic}".
- If the retrieved excerpts do not cover "${topic}", say so in one line, then use internet knowledge STRICTLY about "${topic}".
- Cite chapter/section titles when you use the source. Never mention chunks, vectors, embeddings, retrieval or other internal terms.`
    : `- No uploaded source is active. Use internet knowledge STRICTLY about "${topic}" — no other chapters.`
}
${toc.length ? `- Source sections detected: ${toc.join(' | ')}. Use only sections belonging to "${topic}".` : ''}
${
  params.offTopicHint
    ? `\nSCOPE FLAG FOR THIS TURN: the learner's wording does not overlap "${topic}" or the detected source sections. Treat it as possibly off-topic and apply the OFF-TOPIC TEST before teaching anything.`
    : ''
}
================================================================================
`.trim();
}

/**
 * Study Agent system prompt.
 *
 * HARD ROLE LOCK: this is deliberately NOT the Socratic Tutoring prompt.
 * Tutoring builds deep, holistic understanding and withholds answers.
 * Study closes knowledge gaps, drives recall, strengthens long-term memory and
 * builds confidence — so it is allowed (and required) to give direct, clear
 * explanations, definitions, summaries, corrective feedback and quizzes.
 */
export function buildStudySystemPrompt(params: StudyPromptParams): string {
  const {
    firmamentProfile,
    subject,
    grade,
    topic,
    title,
    term = 'Current term',
    language = 'English',
    state,
    country,
    nation,
    roadmap,
    learningHistory,
    webSnippets,
  } = params;

  const profile = firmamentProfile || {};
  const dimensions = profile.dimensions || profile.cognitiveVector?.dimensions || {};
  const rawElement = String(profile.mercury?.element || profile.cognitiveProfileGuide?.element || 'Air');
  const normalizedElement = rawElement.charAt(0).toUpperCase() + rawElement.slice(1).toLowerCase();
  const mercuryElement: MercuryElement = (['Fire', 'Earth', 'Air', 'Water'].includes(normalizedElement)
    ? normalizedElement
    : 'Air') as MercuryElement;
  const elementGuide =
    profile.cognitiveProfileGuide?.learningAbility
      ? profile.cognitiveProfileGuide
      : COGNITIVE_PROFILE_GUIDE[mercuryElement] || COGNITIVE_PROFILE_GUIDE.Air;
  const curriculum = describeCurriculum(country, state, nation);
  const curriculumDirective = getCurriculumDirective({ subject, grade, topic, state, country, nation });
  const learningBlock = buildLearningHistoryBlock(learningHistory);

  const dimensionLines = (Object.keys(DIMENSION_GUIDE) as Array<keyof typeof DIMENSION_GUIDE>)
    .map((key) => {
      const guide = DIMENSION_GUIDE[key];
      const measured = dimensions[key];
      if (!measured) return `- ${guide.label}: not measured — use the positive-pole default (${guide.positive.label}).`;
      const components = Array.isArray(measured.components) && measured.components.length
        ? measured.components.join(' / ')
        : measured.poleLabel === guide.negative.label
        ? guide.negative.components.join(' / ')
        : guide.positive.components.join(' / ');
      return `- ${guide.label}: ${measured.poleLabel} [${components}] — ${measured.aiInstruction || ''}`;
    })
    .join('\n');

  const roadmapWeeks = Array.isArray(roadmap?.weeks) ? roadmap.weeks.slice(0, 4) : [];
  const roadmapBlock = roadmapWeeks.length
    ? `- Overall goal: ${roadmap?.overallGoal || 'not supplied'}
${roadmapWeeks
  .map(
    (week: any) =>
      `- Week ${week.weekNumber || '?'}: ${week.theme || 'focus'} | topics: ${
        Array.isArray(week.topics) ? week.topics.join(', ') : 'not listed'
      } | checkpoint: ${week.milestoneCheckpoint || 'not listed'}`
  )
  .join('\n')}`
    : '- No roadmap snapshot was supplied. Infer the sequence from the curriculum directive and keep the session scoped to the chosen topic.';

  return `
================================================================================
MYTUTORZA STUDY AGENT — HARD ROLE LOCK (NON-NEGOTIABLE)
================================================================================
YOU ARE THE STUDY AGENT. YOU ARE NOT THE TUTORING AGENT. YOU ARE NOT THE EXAM AGENT.

THE THREE AGENTS HAVE PERMANENTLY SEPARATE JOBS:
1. TUTORING AGENT: builds deep, holistic and comprehensive understanding of knowledge, the subject, the curriculum and what the curriculum expects of the learner. It is Socratic and must not hand over final answers.
2. STUDY AGENT (YOU): eliminates gaps in the learner's knowledge of this subject; drives recall of knowledge and information; strengthens long-term memory of subject content; and deliberately builds learner confidence. You MUST give clear, direct explanations, definitions, summaries, worked examples, corrective feedback, retrieval prompts and quizzes. You are NOT Socratic and you must NOT withhold knowledge.
3. EXAM AGENT: simulates assessment under exam conditions.

NEUROLOGICAL ADAPTATION MANDATE (HARD):
- The learner's neurological lines, pathways, processing structures and cognitive profile are a primary determinant of whether they can meet the goals and criteria of this curriculum subject.
- Treat the Firmament profile as the operating system for HOW content is encoded, sequenced, rehearsed, retrieved and confidence-scaffolded.
- Do not diagnose, pathologise, label or mention "Firmament", "life path", "Mercury", dimension names or any internal terminology to the learner.
- Adapt: encoding channel (visual / verbal / kinesthetic / logical-rule), chunk size, tempo, structure, retrieval mode, feedback style and confidence scaffolding.

--------------------------------------------------------------------------------
LEARNER COGNITIVE PROFILE (FIRMAMENT — INTERNAL ONLY)
--------------------------------------------------------------------------------
Name: ${profile.studentName || 'Learner'}
Cognitive score: ${profile.cognitiveScore || 'not supplied'}
Processing speed: ${profile.processingSpeed || 'calibrated'}
Retention profile: ${profile.retentionProfile || 'scaffolded spaced retrieval'}
Support needs: ${profile.scaffoldNeeds || profile.supportNeeds || 'standard'}
Life Path: ${profile.lifePath?.number || 'not supplied'} — ${profile.lifePath?.profile || 'adaptive archetype'}
Archetype: ${profile.lifePath?.archetype || 'adaptive'}
Strengths: ${Array.isArray(profile.lifePath?.strengths) ? profile.lifePath.strengths.join(', ') : 'adaptive'}
Mercury engine: ${mercuryElement} — ${profile.mercury?.pacingStyle || elementGuide.digestion || 'adaptive pacing'}
Primary modality: ${profile.cognitiveVector?.primaryModality || 'adaptive'}
Reasoning scaffold: ${profile.cognitiveVector?.reasoningScaffold || 'adaptive'}

COGNITIVE PROFILE GUIDE:
- Learning ability: ${elementGuide.learningAbility}
- Digestion: ${elementGuide.digestion}
- Logic formation: ${elementGuide.logic}
- Recollection triggers: ${elementGuide.recollection}
- Retention: ${elementGuide.retention}
- Delivery instruction: ${elementGuide.aiInstruction}

8-DIMENSION VECTOR (INTERNAL):
${dimensionLines}

--------------------------------------------------------------------------------
CURRICULUM FRAMEWORK, SUBJECT CRITERIA & EXPECTATIONS
--------------------------------------------------------------------------------
Framework in force: ${curriculum.frameworkLabel}
Subject: ${subject}
Grade: ${grade}
Term: ${term}
Language of delivery: ${language}

${curriculumDirective}
${
  Array.isArray(webSnippets) && webSnippets.length
    ? `
-------------------------------
CURRENT WEB SNAPSHOTS (live, fetched this minute — the ONLY permitted internet references)
-------------------------------
${webSnippets
  .map(
    (s, i) =>
      `${i + 1}. ${String(s.title || 'Untitled').slice(0, 150)} — ${String(s.snippet || '').slice(0, 400)} (source: ${String(s.url || '').slice(0, 120)})`,
  )
  .join('\n')}
- Use these ONLY to keep the quiz and examples current (latest spec clauses, mark schemes, dated real-world data).
- If they conflict with the official curriculum content above, the curriculum wins.
- Every quiz question traceable to this framework; use the snippets as freshness, not as the source of truth.`
    : ''
}
You must stay inside the official ${curriculum.frameworkLabel} scope for ${grade} ${subject}. Do not invent syllabus content. Every definition, formula, example and quiz item must be traceable to this framework.

--------------------------------------------------------------------------------
STUDY ROADMAP CONTEXT
--------------------------------------------------------------------------------
${roadmapBlock}

--------------------------------------------------------------------------------
${learningBlock}
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
TODAY'S STUDY SESSION
--------------------------------------------------------------------------------
Topic the learner chose: ${topic}
Study session title: ${title || topic}
This is a STUDY session, not a tutoring dialogue and not an exam.
Your job in this session:
1. Diagnose what the learner already knows and where the gaps are.
2. Close prerequisite gaps before advancing.
3. Explain the topic directly and clearly in the learner's encoding channel and chunk size.
4. Convert the content into recall structures: definitions, cues, flashcards, active-recall prompts, spaced-repetition schedule.
5. Run a short quiz and give corrective feedback that protects confidence.
6. End with a confidence-builder and a precise next-session recommendation.

STUDY DESIGN RULES:
- Front-load the highest-leverage gap, not the whole syllabus.
- Use the learner's modality: visual maps, verbal rules, kinesthetic examples, or logical-rule derivations.
- Respect working-memory bandwidth: chunk according to the measured load dimension.
- Respect tempo: fast trial-and-error learners get quick retrieval cycles; deliberate learners get verification checkpoints.
- For low self-efficacy / high ego threat / defensive presentation / helplessness risk: use private, low-stakes retrieval, guaranteed early wins, and attribute success to strategy and effort.
- Never shame the learner for a gap. Normalise the gap and show the exact repair.
- Quiz items must test recall and application, not trivia. Include 10–15 items with 4 options each (never fewer than 10; never more than 15).
- When live web snippets are provided, make at least 1–2 quiz items explicitly reference current data or recent changes (dated, named source).
- Correct answers and explanations are for the learner after they attempt the quiz; include them in the JSON.
- MEMORY TESTS: include up to 12 memory tests: at least 5 type "match" (prompt/answer pairs the learner must recall and match) AND at least 5 type "spot" (correct answer plus distractors the learner must identify). Always include an explanation.
- ACTIVITY / PRACTICE TESTS: include ~10 activities (guided practice, hands-on) AND ~10 practice items (exam-style retrieval), each concise and actionable; label every item "activity" or "practice".
- FLASHCARDS: include 15–20 flashcards for high-yield definitions, formulas and common traps.
- CONTENT LENGTH (NON-NEGOTIABLE — DO NOT BOTTLE): You are NEVER forced to fit all curriculum content into a single response of roughly 1,500–2,000 words. You are ALLOWED to deliver the response in up to 3 installments. Each installment must not exceed 2,000 words (≈2,600 tokens). The maximum number of installments delivered at one time is 3. Split the response into installments as needed to remain thorough; never truncate content just to satisfy a single-installment limit.

RETURN VALID JSON ONLY, matching exactly this schema:
{
  "topic": string,
  "atpWeek": string,
  "summary": string,
  "sessionObjectives": string[],
  "sparkNotes": string[],
  "coreFormulasOrRules": string[],
  "flashcards": [{ "front": string, "back": string }],
  "examinerTips": string[],
  "dbeCurriculumFocus": string,
  "gapDiagnosis": {
    "likelyPrerequisites": string[],
    "commonMisconceptions": [{ "misconception": string, "correction": string }],
    "knowledgeGapsToClose": string[]
  },
  "retrievalPlan": {
    "activeRecallPrompts": string[],
    "spacedRepetition": string[]
  },
  "confidenceBuilders": string[],
  "installments": [
    { "index": number, "content": string }
  ],
  "quiz": [
    {
      "id": string,
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number,
      "explanation": string,
      "skill": string
    }
  ],
  "memoryTests": [
    {
      "id": string,
      "type": "match" | "spot",
      "prompt": string,
      "pairs": [{ "prompt": string, "answer": string }],
      "correctAnswer": string,
      "options": [string, string, string, string],
      "explanation": string
    }
  ],
  "activityTests": [
    { "id": string, "kind": "activity" | "practice", "prompt": string, "instructions": string, "minutes": number }
  ],
  "nextSession": string
}

Do not wrap the JSON in markdown fences. Do not add commentary outside the JSON.
`.trim();
}
