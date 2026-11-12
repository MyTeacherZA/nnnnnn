/**
 * Regional copy (masthead, simulator, memorandum, banners, footers) for the
 * three markets we serve:
 *
 *   ZA → South Africa · CAPS (DBE) · NSC papers · memorandum wording
 *   UK → United Kingdom (England/Scotland/Wales/Northern Ireland) · GCSE/A-level, SQA
 *   US → United States of America · state standards + AP · scoring rubrics
 *
 * Usage:
 *   const copy = regionalCopy(student?.country, student?.nation, student?.state);
 */

export interface RegionalCopy {
  /** "NSC DBE Exam Simulator (90% Real Paper Accuracy)" */
  examSimulatorTitle: string;
  /** Subtitle under the simulator title. */
  examSimulatorSubtitle: string;
  /** Primary CTA on the exam page. */
  generatePaperLabel: string;
  /** Paper header line 1 (e.g. "REPUBLIC OF SOUTH AFRICA"). */
  paperBannerLine1: string;
  /** Paper header line 2 (e.g. "NATIONAL SENIOR CERTIFICATE EXAMINATION"). */
  paperBannerLine2: string;
  /** "Hide Memorandum" / "Hide Mark Scheme" / "Hide Scoring Guide" */
  hideMemorandumLabel: string;
  /** "Show Official Memorandum" / "Show Mark Scheme" / "Show Scoring Guide" */
  showMemorandumLabel: string;
  /** Heading of the memorandum/mark scheme reveal panel. */
  memorandumHeading: string;
  /** Tab row helper text "Spark Notes & Flashcards". */
  studyTabDesc: string;
  /** Exam tab helper text. */
  examTabDesc: string;
  /** Tab row - Formula Sheets label. */
  formulaTabDesc: string;
  /** Roadmap banner heading suffix: "Personalized Plan". */
  roadmapJourney: string;
  /** CA / marking memorable label for examiner traps. */
  examinerTrapsHeading: string;
  examinerTrapsShort: string;
  /** Footer line 1. */
  footerLine1: string;
  /** Footer line 2. */
  footerLine2: string;
  /** SubjectHeader: "ATP Syllabus, Spark Notes & Flashcards" style label. */
  studyTabATP: string;
  /** Formula sheet hero line 1. */
  formulaSheetTitle: string;
  /** Formula description – subject + grade range. */
  formulaSheetDesc: string;
  /** Contact modal subject line. */
  contactHeading: string;
  /** Thank-you copy. */
  contactThanks: string;
  /** SettingsModal: rule heading. */
  settingsRuleHeading: string;
  /** SettingsModal: dropdown placeholder. */
  settingsSubjectPlaceholder: string;
  /** StudyRoadmapTab: target milestone option labels. */
  milestoneOptions: { term2: string; term3: string; final: string; controlTest: string; catchUp: string };
  /** StudyRoadmapTab catch-up label. */
  catchUpPlan: string;
  /** Practice-timing tooltip under roadmap button. */
  practiceExamTitle: string;
  /** Exam evaluation: checkbox label. */
  completedUnderConditions: string;
  /** SparkNotesModal tags. */
  sparkFormulas: string;
  sparkTraps: string;
  /** FormulaSheetsTab example-line label. */
  formulaSheetNote: string;
}

const ZA: RegionalCopy = {
  examSimulatorTitle: 'NSC DBE Exam Simulator (90% Real Paper Accuracy)',
  examSimulatorSubtitle: 'Strictly mirrors South African Department of Basic Education Section A, B & C paper geometry.',
  generatePaperLabel: 'Generate NSC Paper',
  paperBannerLine1: 'REPUBLIC OF SOUTH AFRICA',
  paperBannerLine2: 'NATIONAL SENIOR CERTIFICATE EXAMINATION',
  hideMemorandumLabel: 'Hide Memorandum',
  showMemorandumLabel: 'Show Official Memorandum',
  memorandumHeading: 'Official Memorandum & Mark Allocation',
  studyTabDesc: 'CAPS ATP syllabus, Spark Notes & Flashcards',
  examTabDesc: 'Authentic NSC June & Nov Papers (90% Accuracy)',
  formulaTabDesc: 'Grades 7–12 Pure Maths & Maths Lit',
  roadmapJourney: '4-Week Personalised Study Plan',
  examinerTrapsHeading: 'DBE Examiner Traps & Misconceptions To Avoid',
  examinerTrapsShort: 'DBE Examiner Traps',
  footerLine1: 'Calibrated for the South African Department of Basic Education (CAPS) Grades 4–12',
  footerLine2: 'Powered by The Firmament Psychological Engine • The languages of South Africa Supported',
  studyTabATP: 'ATP Syllabus, Spark Notes & Flashcards',
  formulaSheetTitle: 'NSC Mathematics & Mathematical Literacy Formula Vault',
  formulaSheetDesc:
    'Complete South African DBE formula sheets covering Pure Mathematics (P1 & P2) and Mathematical Literacy (Finance, VAT, Measurement & Maps).',
  contactHeading: 'Share feedback, curriculum suggestions, or request CAPS past papers',
  contactThanks: 'Thank you for helping us enrich MyTutorZA for all South African learners.',
  settingsRuleHeading: 'Department of Basic Education CAPS Rule:',
  settingsSubjectPlaceholder: 'Select Official DBE Subject…',
  milestoneOptions: {
    term2: 'Term 2 Mid-Year Exam',
    term3: 'Term 3 Trial / Preparatory',
    final: 'November Final Exam (NSC)',
    controlTest: 'Term 1 Control Test',
    catchUp: 'General CAPS Catch-Up Plan',
  },
  catchUpPlan: 'General CAPS Catch-Up Plan',
  practiceExamTitle: 'Practise exam under NSC timing',
  completedUnderConditions: 'I completed this exam under official NSC exam conditions',
  sparkFormulas: 'Core Formulas & CAPS Rules',
  sparkTraps: 'DBE Examiner Traps',
  formulaSheetNote: 'NSC Exam Application Example:',
};

const ENGLAND: RegionalCopy = {
  ...ZA,
  examSimulatorTitle: 'GCSE / A-Level Exam Simulator (Authentic Past-Paper Accuracy)',
  examSimulatorSubtitle:
    'Strictly mirrors GCSE 9–1 / A-Level paper structure, tiered content, mark schemes and command words.',
  generatePaperLabel: 'Generate Exam Paper',
  paperBannerLine1: 'UNITED KINGDOM · ENGLAND',
  paperBannerLine2: 'GCSE / A-LEVEL EXAMINATION',
  hideMemorandumLabel: 'Hide Mark Scheme',
  showMemorandumLabel: 'Show Mark Scheme',
  memorandumHeading: 'Mark Scheme & Mark Allocation',
  studyTabDesc: 'National Curriculum syllabus, Spark Notes & Flashcards',
  examTabDesc: 'Authentic GCSE June / November Papers (90% Accuracy)',
  formulaTabDesc: 'GCSE & A-Level Maths formula sheets',
  roadmapJourney: 'Personalised Study Plan',
  examinerTrapsHeading: 'Examiner Traps & Misconceptions To Avoid',
  examinerTrapsShort: 'Examiner Traps',
  footerLine1: 'Aligned to the English National Curriculum (EYFS → KS4 → GCSE → A-Level)',
  footerLine2: 'Powered by The Firmament Psychological Engine • Official UK exam boards (AQA · Edexcel · OCR · WJEC · CCEA)',
  studyTabATP: 'National Curriculum syllabus, Spark Notes & Flashcards',
  formulaSheetTitle: 'GCSE & A-Level Mathematics Formula Vault',
  formulaSheetDesc: 'Complete formula sheets covering GCSE Higher Maths, Further Maths and A-Level (pure, mechanics and statistics).',
  contactHeading: 'Share feedback, course suggestions, or request national-exam past papers',
  contactThanks: 'Thank you for helping us enrich MyTutorZA for learners across the United Kingdom.',
  settingsRuleHeading: 'UK National Curriculum Rule:',
  settingsSubjectPlaceholder: 'Select a course…',
  milestoneOptions: {
    term2: 'Mid-Year Mock Examination',
    term3: 'Mock Examination',
    final: 'Year 11 GCSE / Year 13 A-Level',
    controlTest: 'Termly Assessment',
    catchUp: 'General Revision Plan',
  },
  catchUpPlan: 'General Revision Plan',
  practiceExamTitle: 'Practise exam under GCSE timing',
  completedUnderConditions: 'I completed this exam under official GCSE / A-Level exam conditions',
  sparkFormulas: 'Key Formulas',
  sparkTraps: 'Examiner Traps',
  formulaSheetNote: 'Exam Application Example:',
};

const SCOTLAND: RegionalCopy = {
  ...ENGLAND,
  paperBannerLine1: 'UNITED KINGDOM · SCOTLAND',
  paperBannerLine2: 'SQA NATIONAL 5 / HIGHER EXAMINATION',
  footerLine1: 'Aligned to Scotland’s Curriculum for Excellence (S1–S6) — National 5 · Higher · Advanced Higher',
  footerLine2: 'Powered by The Firmament Psychological Engine • SQA · Curriculum for Excellence',
  examSimulatorSubtitle:
    'Strictly mirrors Curriculum for Excellence (CfE) and SQA National 5 / Higher unit structures with official marking instructions.',
  settingsRuleHeading: 'Curriculum for Excellence Rule:',
  settingsSubjectPlaceholder: 'Select an SQA course…',
  formulaSheetDesc: 'Complete formula sheets covering National 5, Higher and Advanced Higher (mathematics and sciences).',
  milestoneOptions: {
    term2: 'Prelim Examination',
    term3: 'Prelim Examination',
    final: 'National 5 / Higher Examination (May)',
    controlTest: 'Unit Assessment',
    catchUp: 'General CfE Revision Plan',
  },
  catchUpPlan: 'General CfE Revision Plan',
  practiceExamTitle: 'Practise exam under SQA timing',
  completedUnderConditions: 'I completed this exam under official SQA exam conditions',
};

const WALES: RegionalCopy = {
  ...ENGLAND,
  paperBannerLine1: 'UNITED KINGDOM · WALES',
  paperBannerLine2: 'GCSE / A-LEVEL EXAMINATION (WJEC)',
  examSimulatorSubtitle:
    'Strictly mirrors Curriculum for Wales and WJEC GCSE / A-Level papers, mark schemes and official assessment objectives.',
  settingsRuleHeading: 'Curriculum for Wales Rule:',
  settingsSubjectPlaceholder: 'Select a WJEC course…',
  milestoneOptions: {
    ...ENGLAND.milestoneOptions,
    controlTest: 'Half-termly Assessment',
    catchUp: 'General Revision Plan',
  },
  footerLine2: 'Powered by The Firmament Psychological Engine • WJEC boards',
};

const NORTHERN_IRELAND: RegionalCopy = {
  ...ENGLAND,
  paperBannerLine1: 'UNITED KINGDOM · NORTHERN IRELAND',
  paperBannerLine2: 'GCSE / A-LEVEL EXAMINATION (CCEA)',
  examSimulatorSubtitle:
    'Strictly mirrors Key Stage 1–KS4 and CCEA GCSE / A-Level papers with official marking guidance.',
  settingsRuleHeading: 'Key Stage 4 / CCEA Rule:',
  settingsSubjectPlaceholder: 'Select a CCEA course…',
  footerLine2: 'Powered by The Firmament Psychological Engine • CCEA exam boards',
};

function usStateLabel(state: string): string {
  const s = String(state || '').trim();
  return s ? s.toUpperCase() : 'STATE';
}

function usCopy(state: string): RegionalCopy {
  const s = usStateLabel(state);
  return {
    ...ZA,
    examSimulatorTitle: 'US State/AP Exam Simulator (Authentic Practice Accuracy)',
    examSimulatorSubtitle: `Strictly mirrors ${
      state ? state : 'your state'
    } standards — and Advanced Placement Section I / Section II if applicable — with official rubric geometry.`,
    generatePaperLabel: 'Generate AP / State Practice Exam',
    paperBannerLine1: 'UNITED STATES OF AMERICA',
    paperBannerLine2: `${state ? `${usStateLabel(state)} ACADEMIC STANDARDS EXAMINATION` : 'STATE EXAMINATION'}`,
    hideMemorandumLabel: 'Hide Scoring Guide',
    showMemorandumLabel: 'Show Scoring Rubrics',
    memorandumHeading: 'Scoring Rubric & Mark Allocation',
    studyTabDesc: 'State standards syllabus, Spark Notes & Flashcards',
    examTabDesc: 'Authentic AP & State End-of-Course Papers (90% Accuracy)',
    formulaTabDesc: 'Algebra and Geometry formula sheets',
    roadmapJourney: 'Personalised Study Plan',
    examinerTrapsHeading: 'Common Pitfalls & Misconceptions To Avoid',
    examinerTrapsShort: 'Common Pitfalls',
    footerLine1: 'Aligned to US state standards (Common Core · NGSS · College Board (AP)) — Grade K–12',
    footerLine2: 'Powered by The Firmament Psychological Engine • Supported across all 50 states + DC',
    studyTabATP: 'State standards syllabus, Spark Notes & Flashcards',
    formulaSheetTitle: 'US Mathematics Formula Vault',
    formulaSheetDesc: 'Algebra I & II, Geometry, Pre-Calculus and AP Calculus Formula Reference.',
    contactHeading: 'Share feedback, course suggestions, or request practice exams',
    contactThanks: 'Thank you for helping us enrich MyTutorZA for learners across the United States.',
    settingsRuleHeading: 'Academic Standards Rule:',
    settingsSubjectPlaceholder: 'Select a course…',
    milestoneOptions: {
      term2: 'Mid-Year Benchmark Exam',
      term3: 'Benchmark Exam',
      final: 'State End-of-Course Exam (or AP)',
      controlTest: 'Unit Test',
      catchUp: 'General Standards Plan',
    },
    catchUpPlan: 'General Standards Plan',
    practiceExamTitle: 'Practise exam under state / AP timing',
    completedUnderConditions: 'I completed this exam under official AP / state exam conditions',
    sparkFormulas: 'Key Formulas',
    sparkTraps: 'Common Pitfalls',
    formulaSheetNote: 'AP / State Exam Application Example:',
  };
}

function ukCopy(nation: string): RegionalCopy {
  switch (String(nation || 'England').trim()) {
    case 'Scotland':
      return SCOTLAND;
    case 'Wales':
      return WALES;
    case 'Northern Ireland':
      return NORTHERN_IRELAND;
    default:
      return ENGLAND;
  }
}

/**
 * Resolve regional copy for a learner.
 * @param country  'US' | 'UK' | 'ZA' (anything else falls back to US)
 * @param nation   UK nation when country === 'UK'
 * @param state    US state name when country === 'US'
 */
export function regionalCopy(country?: string, nation?: string, state?: string): RegionalCopy {
  const code = String(country || 'US').toUpperCase();
  if (code === 'ZA') return ZA;
  if (code === 'UK' || code === 'GB') return ukCopy(nation || 'England');
  return usCopy(state || '');
}
