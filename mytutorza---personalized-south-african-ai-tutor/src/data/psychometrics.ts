import * as Astronomy from 'astronomy-engine';

export function mercuryElementFromDOB(dob: string): 'Fire' | 'Earth' | 'Air' | 'Water' {
  try {
    const date = new Date(dob);
    if (isNaN(date.getTime())) return 'Air';
    const t = new Astronomy.AstroTime(date);
    const lon = Astronomy.EclipticLongitude(Astronomy.Body.Mercury, t);
    const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const idx = Math.floor(((lon % 360) + 360) % 360 / 30);
    const sign = signs[idx];
    if (['Aries','Leo','Sagittarius'].includes(sign)) return 'Fire';
    if (['Taurus','Virgo','Capricorn'].includes(sign)) return 'Earth';
    if (['Gemini','Libra','Aquarius'].includes(sign)) return 'Air';
    return 'Water';
  } catch {
    return 'Air';
  }
}

  id: number;
  question: string;
  category: 'LifePath' | 'Processing Engine' | 'Modality' | 'Reasoning';
  options: {
    text: string;
    label: string;
    profileTrait?: string;
    mercuryElement?: 'Fire' | 'Earth' | 'Air' | 'Water';
    modality?: 'Visual' | 'Auditory' | 'Kinesthetic' | 'Logical-Rule';
  }[];
}

export const PSYCHOMETRIC_QUESTIONS: PsychometricQuestion[] = [
  {
    id: 1,
    question: 'When starting a brand-new, complex topic in school (like Calculus or Organic Chemistry), how do you prefer to begin?',
    category: 'Modality',
    options: [
      { text: 'Look at summary diagrams, color-coded mind maps, and flowchart overviews.', label: 'A', modality: 'Visual' },
      { text: 'Listen to the teacher explain it out loud or discuss it with a study buddy.', label: 'B', modality: 'Auditory' },
      { text: 'Immediately start working through practical practice questions and trial-and-error.', label: 'C', modality: 'Kinesthetic' },
      { text: 'Break down the formal rules, definitions, axioms, and logical steps first.', label: 'D', modality: 'Logical-Rule' },
    ],
  },
  {
    id: 2,
    question: 'Under exam pressure or tight time constraints during a test, what is your instinctive approach?',
    category: 'Processing Engine',
    options: [
      { text: 'Charge through quickly with high adrenaline, tackling the hardest questions first.', label: 'A', mercuryElement: 'Fire' },
      { text: 'Stay calm, work steadily in exact numerical order, and double-check every calculation.', label: 'B', mercuryElement: 'Earth' },
      { text: 'Scan the entire paper, think conceptually about the connections, and outline answers.', label: 'C', mercuryElement: 'Air' },
      { text: 'Rely on gut instinct, read questions carefully to feel the examiners intent, and reflect.', label: 'D', mercuryElement: 'Water' },
    ],
  },
  {
    id: 3,
    question: 'When an AI tutor explains a difficult concept to you, which type of South African analogy clicks best?',
    category: 'Reasoning',
    options: [
      { text: 'A visual schematic: visualizing Eskom grid flowcharts or Drakensberg elevation contours.', label: 'A', modality: 'Visual' },
      { text: 'A spoken narrative: a storytelling dialogue between coaches during the Soweto Derby.', label: 'B', modality: 'Auditory' },
      { text: 'A hands-on real-world experience: calculating minibus taxi change or baking roosterkoek.', label: 'C', modality: 'Kinesthetic' },
      { text: 'An algorithmic system: step-by-step Gautrain ticketing logic and strict mathematical laws.', label: 'D', modality: 'Logical-Rule' },
    ],
  },
  {
    id: 4,
    question: 'What drives your personal learning ambition most deeply?',
    category: 'LifePath',
    options: [
      { text: 'Being a pioneer who breaks records, achieves top distinctions, and leads by example.', label: 'A', profileTrait: 'The Trailblazer' },
      { text: 'Mastering exact truths, uncovering errors, and understanding how data connects.', label: 'B', profileTrait: 'The Analyst' },
      { text: 'Building enduring foundations, organizing complex systems, and designing solutions.', label: 'C', profileTrait: 'The Architect' },
      { text: 'Helping my family and community thrive while discovering new horizons.', label: 'D', profileTrait: 'The Catalyst' },
    ],
  },
  {
    id: 5,
    question: 'If loadshedding cuts the power during your evening study session, how do you adapt your workflow?',
    category: 'Processing Engine',
    options: [
      { text: 'I light a candle and use the intense quiet to power through my most intense problem set.', label: 'A', mercuryElement: 'Fire' },
      { text: 'I follow my pre-printed study checklist with my battery lamp in methodical order.', label: 'B', mercuryElement: 'Earth' },
      { text: 'I use the time to brainstorm, synthesize high-level notes, and mentally review formulas.', label: 'C', mercuryElement: 'Air' },
      { text: 'I take a reflective breather, listen to audio summaries, or review creative essay plans.', label: 'D', mercuryElement: 'Water' },
    ],
  },
  {
    id: 6,
    question: 'When you make an error on a homework problem or past paper, what is your immediate reaction?',
    category: 'Reasoning',
    options: [
      { text: 'I need to see the worked solution visually side-by-side with my own line of work.', label: 'A', modality: 'Visual' },
      { text: 'I want someone to explain in plain language where my line of thinking went off track.', label: 'B', modality: 'Auditory' },
      { text: 'I grab a fresh blank page and redo the entire question from scratch with my own pen.', label: 'C', modality: 'Kinesthetic' },
      { text: 'I inspect the rubric and identify the exact axiom, rule, or sign change violated.', label: 'D', modality: 'Logical-Rule' },
    ],
  },
  {
    id: 7,
    question: 'What is your natural pacing rhythm when learning heavy syllabus content?',
    category: 'Processing Engine',
    options: [
      { text: 'Fast sprints with intense focus followed by quick active breaks (Pomodoro sprinter).', label: 'A', mercuryElement: 'Fire' },
      { text: 'Steady, uninterrupted, deeply grounded marathon sessions of 2–3 hours.', label: 'B', mercuryElement: 'Earth' },
      { text: 'Dynamic, conversational bursts connecting multiple subjects in one sitting.', label: 'C', mercuryElement: 'Air' },
      { text: 'Intuitive pacing that flows according to mood, curiosity, and emotional energy.', label: 'D', mercuryElement: 'Water' },
    ],
  },
  {
    id: 8,
    question: 'In a group project or study group at school, what role do you naturally assume?',
    category: 'LifePath',
    options: [
      { text: 'The Driver: setting the pace, making decisions, and ensuring we finish first.', label: 'A', profileTrait: 'The Trailblazer' },
      { text: 'The Fact-Checker: checking citations, verifying calculations, and ensuring 100% accuracy.', label: 'B', profileTrait: 'The Analyst' },
      { text: 'The Organizer: structuring the timeline, slides, rubric compliance, and formatting.', label: 'C', profileTrait: 'The Architect' },
      { text: 'The Facilitator: keeping everyone motivated, resolving conflicts, and bringing ideas together.', label: 'D', profileTrait: 'The Catalyst' },
    ],
  },
  {
    id: 9,
    question: 'When memorizing key definitions (e.g., in Life Sciences or Business Studies), what technique works best for you?',
    category: 'Modality',
    options: [
      { text: 'Highlighted flashcards with sketches, icons, and color-coded keywords.', label: 'A', modality: 'Visual' },
      { text: 'Repeating them out loud, recording voice notes, or making up rhythmic acronyms.', label: 'B', modality: 'Auditory' },
      { text: 'Writing them repeatedly by hand on flashcards or acting out the process.', label: 'C', modality: 'Kinesthetic' },
      { text: 'Categorizing terms into strict logical taxonomies and cause-and-effect chains.', label: 'D', modality: 'Logical-Rule' },
    ],
  },
  {
    id: 10,
    question: 'How do you handle unexpected questions or tricky "examiner traps" in past papers?',
    category: 'Processing Engine',
    options: [
      { text: 'I relish the challenge and aggressively experiment with creative methods to crack it.', label: 'A', mercuryElement: 'Fire' },
      { text: 'I break it down to known principles and eliminate impossible options step-by-step.', label: 'B', mercuryElement: 'Earth' },
      { text: 'I look at the big picture: what CAPS concept is the examiner testing here?', label: 'C', mercuryElement: 'Air' },
      { text: 'I stay calm, reread the question carefully twice, and trust my trained intuition.', label: 'D', mercuryElement: 'Water' },
    ],
  },
  {
    id: 11,
    question: 'When reviewing your Term report card, which feedback motivates you most?',
    category: 'LifePath',
    options: [
      { text: 'A score that places you at the very top of your grade or beats your personal record.', label: 'A', profileTrait: 'The Trailblazer' },
      { text: 'Praise for rigorous analytical depth, flawless methodology, and zero careless errors.', label: 'B', profileTrait: 'The Analyst' },
      { text: 'Recognition of structured, consistent improvement and disciplined project execution.', label: 'C', profileTrait: 'The Architect' },
      { text: 'Positive remarks about your creative thinking, empathy, and inspiring contributions.', label: 'D', profileTrait: 'The Catalyst' },
    ],
  },
  {
    id: 12,
    question: 'How do you prefer your AI tutor to give you feedback when you make a mistake?',
    category: 'Reasoning',
    options: [
      { text: 'Show a side-by-side comparison diagram highlighting the divergence.', label: 'A', modality: 'Visual' },
      { text: 'Talk me through the thought process verbally with Guided Discovery questions.', label: 'B', modality: 'Auditory' },
      { text: 'Give me a similar mini-problem immediately so I can correct the muscle memory.', label: 'C', modality: 'Kinesthetic' },
      { text: 'State the exact rule violated and provide a rigorous formal deduction.', label: 'D', modality: 'Logical-Rule' },
    ],
  },
  {
    id: 13,
    question: 'What is your primary study environment preference?',
    category: 'Processing Engine',
    options: [
      { text: 'High-energy space with energetic instrumental music and clear visible countdown timers.', label: 'A', mercuryElement: 'Fire' },
      { text: 'A tidy, quiet desk with neatly stacked textbooks, pens, and zero clutter.', label: 'B', mercuryElement: 'Earth' },
      { text: 'A bright, open room with space to pace around and talk concepts through.', label: 'C', mercuryElement: 'Air' },
      { text: 'A cozy, comfortable sanctuary with warm lighting and relaxed vibes.', label: 'D', mercuryElement: 'Water' },
    ],
  },
  {
    id: 14,
    question: 'When faced with a long 15-mark essay question in History, English, or Business Studies, what is your first step?',
    category: 'Modality',
    options: [
      { text: 'Drafting a visual mind-map with main themes radiating from the central topic.', label: 'A', modality: 'Visual' },
      { text: 'Outlining key discussion points and persuasive arguments as bulleted debate points.', label: 'B', modality: 'Auditory' },
      { text: 'Jotting down raw keywords fast, then writing the introduction immediately to get flowing.', label: 'C', modality: 'Kinesthetic' },
      { text: 'Building a strict PEEL (Point, Explanation, Evidence, Link) structural framework.', label: 'D', modality: 'Logical-Rule' },
    ],
  },
  {
    id: 15,
    question: 'Which of the following describes your ultimate vision for your Matric (Grade 12) achievement?',
    category: 'LifePath',
    options: [
      { text: 'Achieving multiple distinctions and setting an inspirational benchmark.', label: 'A', profileTrait: 'The Trailblazer' },
      { text: 'Mastering every nuance of my chosen subjects so I am 100% prepared for university.', label: 'B', profileTrait: 'The Analyst' },
      { text: 'Building a reliable, disciplined portfolio that opens doors to high-demand careers.', label: 'C', profileTrait: 'The Architect' },
      { text: 'Transforming my future, making my community proud, and unlocking new opportunities.', label: 'D', profileTrait: 'The Catalyst' },
    ],
  },
  {
    id: 16,
    question: 'When practicing for final exams, what type of resource gives you the greatest confidence boost?',
    category: 'Reasoning',
    options: [
      { text: 'Comprehensive color-coded summary sheets and visual cheat-sheets.', label: 'A', modality: 'Visual' },
      { text: 'Listening to expert walkthroughs explaining tricky past paper questions step-by-step.', label: 'B', modality: 'Auditory' },
      { text: 'Timed mock exam conditions with real pen and paper under stopwatch pressure.', label: 'C', modality: 'Kinesthetic' },
      { text: 'Official DBE memoranda with strict mark allocation rubrics and examiner traps analyzed.', label: 'D', modality: 'Logical-Rule' },
    ],
  },
];

export function calculateFirmamentFromAnswers(
  studentName: string,
  dob: string,
  answers: Record<number, string>
) {
  // 1. Calculate Cognitive Profile from DOB
  // e.g. 2007-06-15 -> 2+0+0+7 + 0+6 + 1+5 = 9 + 6 + 6 = 21 -> 2+1 = 3
  const digits = dob.replace(/[^0-9]/g, '').split('').map(Number);
  let sum = digits.reduce((acc, d) => acc + d, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split('').map(Number).reduce((a, b) => a + b, 0);
  }
  const lifePathNumber = sum || 7;

  // Count choices
  let modalityCounts: Record<string, number> = {
    'Visual': 0,
    'Auditory': 0,
    'Kinesthetic': 0,
    'Logical-Rule': 0,
  };
  let mercuryCounts: Record<string, number> = {
    'Fire': 0,
    'Earth': 0,
    'Air': 0,
    'Water': 0,
  };
  let profileCounts: Record<string, number> = {
    'The Trailblazer': 0,
    'The Analyst': 0,
    'The Architect': 0,
    'The Catalyst': 0,
  };

  PSYCHOMETRIC_QUESTIONS.forEach((q) => {
    const choiceLabel = answers[q.id];
    const opt = q.options.find((o) => o.label === choiceLabel);
    if (opt) {
      if (opt.modality) modalityCounts[opt.modality] = (modalityCounts[opt.modality] || 0) + 1;
      if (opt.mercuryElement) mercuryCounts[opt.mercuryElement] = (mercuryCounts[opt.mercuryElement] || 0) + 1;
      if (opt.profileTrait) profileCounts[opt.profileTrait] = (profileCounts[opt.profileTrait] || 0) + 1;
    }
  });

  // Determine winners
  const sortedModalities = Object.entries(modalityCounts).sort((a, b) => b[1] - a[1]);
  const primaryModality = (sortedModalities[0]?.[0] || 'Logical-Rule') as 'Visual' | 'Auditory' | 'Kinesthetic' | 'Logical-Rule';
  const secondaryModality = sortedModalities[1]?.[0] || 'Visual';

  const mercuryElement = mercuryElementFromDOB(dob);

  const sortedArchetypes = Object.entries(profileCounts).sort((a, b) => b[1] - a[1]);
  const dominantArchetype = sortedArchetypes[0]?.[0] || 'The Architect';

  // Processing Engine mappings
  const mercuryMap: Record<'Fire' | 'Earth' | 'Air' | 'Water', { pacing: string; temperament: string; rhythm: string }> = {
    Fire: {
      pacing: 'High-Velocity & Challenge-Driven',
      temperament: 'Competitive, dynamic, energized by timed sprint drills',
      rhythm: '25-minute power focus blocks with instant feedback loops',
    },
    Earth: {
      pacing: 'Methodical & Grounded Mastery',
      temperament: 'Disciplined, thorough, step-by-step verification',
      rhythm: 'Deep, uninterrupted work sessions with detailed checklist tracking',
    },
    Air: {
      pacing: 'Conceptual & Guided Discovery Dialogue',
      temperament: 'Curious, analytical, connects ideas across CAPS subjects',
      rhythm: 'Interactive conversational inquiry and conceptual synthesis',
    },
    Water: {
      pacing: 'Empathetic & Narrative-Immersed',
      temperament: 'Intuitive, reflective, learns through context and human impact',
      rhythm: 'Story-supported progression with confidence-reinforcing milestones',
    },
  };

  // Modality Analogy Sets
  const analogySets: Record<string, string> = {
    'Visual': 'Schematic blueprints, spatial models, color-coded energy flows, Drakensberg topographic contours',
    'Auditory': 'Guided Discovery dialogue, mnemonic rhythms, broadcast summaries, oral debate structures',
    'Kinesthetic': 'Tactile real-world mechanisms, minibus taxi change optimization, sports momentum, physical experiments',
    'Logical-Rule': 'Strict deductive syllogisms, axiomatic proofs, algorithmic state transitions, Gautrain ticketing systems',
  };

  // Cognitive Score & Processing Speed derived from choices
  const processingSpeed =
    mercuryElement === 'Fire' || mercuryElement === 'Air'
      ? 'High Processing Speed'
      : mercuryElement === 'Earth'
      ? 'Methodical / Precision-Paced'
      : 'Reflective / Contextual-Paced';

  // Retention Profile derived from modalities & answers
  const retentionProfile =
    answers[1] === 'D' || answers[6] === 'D' || answers[9] === 'D'
      ? 'Axiomatic Retention (High conceptual retention with formal rule adherence)'
      : answers[1] === 'A' || answers[6] === 'A' || answers[9] === 'A'
      ? 'Visual Retention (High spatial retention; needs visual schematics and diagrams)'
      : 'Scaffolded Retention (Needs spaced micro-checkpoints and deliberate formula recall)';

  const supportNeeds =
    'Needs supported Guided Discovery guidance: explicit prerequisite checks, step-by-step discovery, and zero direct answer disclosure.';

  const cognitiveScore = `${dominantArchetype}-${primaryModality} (${processingSpeed}, ${retentionProfile.split(' ')[0]} Retention)`;

  const firmamentRules = [
    'LAW 1: Blindness to Generic Tutoring — Never use generic chat openings, boilerplate textbook regurgitations, or bland pleasantries. You are locked to the student profile.',
    'LAW 2: Guided Discovery Zero-Direct-Answer Law — Never solve problems for the student or reveal the final answer. Ask the next targeted guiding question.',
    'LAW 3: Cognitive Modality Alignment — Frame all analogies and explanations strictly using the student\'s sensory modality (' + primaryModality + ').',
    'LAW 4: Real-Time CAPS DBE Syllabus Grounding — Quote exact DBE Annual Teaching Plan milestones, exam formula sheets, and chief examiner trap warnings.',
    'LAW 5: Cultural & Linguistic Resonance — Support South African context and 11 official languages with culturally resonant examples.',
  ];

  return {
    studentName,
    calculatedAt: new Date().toISOString(),
    rawAnswers: answers,
    cognitiveScore,
    processingSpeed,
    retentionProfile,
    supportNeeds,
    firmamentRules,
    lifePath: {
      number: lifePathNumber,
      profile: dominantArchetype,
      description: `Driven by Cognitive Profile ${lifePathNumber}: naturally attuned to structured ambition, strategic focus, and persistent excellence.`,
      strengths: ['Conceptual clarity', 'Goal orientation', 'Adaptive problem-solving', 'Pattern recognition'],
    },
    mercury: {
      element: mercuryElement,
      pacingStyle: mercuryMap[mercuryElement].pacing,
      temperament: mercuryMap[mercuryElement].temperament,
      learningRhythm: mercuryMap[mercuryElement].rhythm,
    },
    cognitiveVector: {
      primaryModality,
      secondaryModality,
      southAfricanAnalogySet: analogySets[primaryModality],
      reasoningScaffold: primaryModality === 'Logical-Rule'
        ? 'Deductive Axiom → Intermediate Substitution → Final Statement with DBE Reason'
        : primaryModality === 'Visual'
        ? 'Mental Picture → Spatial Diagram → Mathematical Expression'
        : primaryModality === 'Kinesthetic'
        ? 'Physical Context → Hands-on Manipulation → Formal Symbolic Representation'
        : 'Verbal Questioning → Guided Intuition → Formal Articulation',
    },
  };
}
