export type OfficialLanguage =
  | 'English'
  | 'isiZulu'
  | 'isiXhosa'
  | 'Afrikaans'
  | 'Sepedi'
  | 'Setswana'
  | 'Sesotho'
  | 'Xitsonga'
  | 'siSwati'
  | 'Tshivenda'
  | 'isiNdebele';

export type DisplayMode = 'dark' | 'light' | 'normal';

/** Country the learner is schooling in. Drives which curriculum framework applies. */
export type CountryCode = 'US' | 'UK' | 'ZA';

/** UK nation — each has its own curriculum and qualifications body. */
export type UKNation = 'England' | 'Scotland' | 'Wales' | 'Northern Ireland';

/** Curricula frameworks an agent can be grounded in. */
export type CurriculumFramework = 'US_STATE_STANDARDS' | 'CAPS_DBE';

/** A registered learner account (Supabase Auth, or a local fallback account). */
export interface StudentAccount {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  provider: 'supabase' | 'local';
  emailConfirmed: boolean;
  createdAt: string;
}

export type ThemeAccent =
  | 'forest-green'
  | 'sky-blue'
  | 'electric-blue'
  | 'sand-brown'
  | 'crimson-red'
  | 'amber-yellow'
  | 'indigo'
  | 'violet';

export interface ThemeAccentConfig {
  id: ThemeAccent;
  name: string;
  gradient: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface DimensionResult {
  key: string;
  /** Raw dimension score: -3 … +3 (3 forced-choice items per dimension). */
  score: number;
  /** 0–100 strength of the positive pole. */
  percentage: number;
  label: string;
  poleLabel: string;
  description: string;
  aiInstruction: string;
}

export interface CognitiveProfileGuide {
  element: 'Fire' | 'Earth' | 'Air' | 'Water';
  title: string;
  archetype: string;
  description: string;
  strengths: string[];
  learningAbility: string;
  digestion: string;
  logic: string;
  recollection: string;
  retention: string;
  aiInstruction: string;
}

export interface FirmamentProfile {
  studentName: string;
  calculatedAt: string;
  /** Grade whose 24-item question set produced this profile. */
  grade?: string;
  country?: CountryCode;
  rawAnswers?: Record<number, string>;
  onboardingAnswers?: Record<number, string>;
  cognitiveScore: string;
  processingSpeed: string;
  retentionProfile: string;
  supportNeeds: string;
  scaffoldNeeds?: string;
  firmamentRules: string[];
  dimensions?: Record<string, DimensionResult>;
  cognitiveProfileGuide?: CognitiveProfileGuide;
  lifePath: {
    number: number;
    profile: string;
    archetype?: string;
    description: string;
    strengths: string[];
  };
  mercury: {
    element: 'Fire' | 'Earth' | 'Air' | 'Water';
    pacingStyle: string;
    temperament: string;
    learningRhythm: string;
    dobElement?: 'Fire' | 'Earth' | 'Air' | 'Water';
  };
  cognitiveVector: {
    primaryModality: 'Visual' | 'Auditory' | 'Kinesthetic' | 'Logical-Rule';
    secondaryModality: string;
    analogySet?: string;
    southAfricanAnalogySet: string;
    reasoningScaffold: string;
    fieldStructure?: string;
    conceptualTempo?: string;
    loadCapacity?: string;
    pathway?: string;
    selfEfficacy?: string;
    egoThreat?: string;
    presentation?: string;
    masteryOrientation?: string;
  };
}

export interface TextbookReference {
  title: string;
  authors: string[];
  editor?: string;
  publisher?: string;
  year?: string;
}

export interface SubjectSlot {
  id: string;
  name: string;
  category: 'Language' | 'Mathematics' | 'Sciences' | 'Commerce' | 'Humanities' | 'Services' | 'Technology';
  isMandatory?: boolean;
  previousTermMark: number;
  previousTermName: string;
  tutoringLanguage: OfficialLanguage;
  textbook?: TextbookReference;
}

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  grade: string;
  /** Country of schooling — determines the curriculum framework pushed to agents. */
  country: CountryCode;
  /** UK nation (England / Scotland / Wales / Northern Ireland). Undefined elsewhere. */
  nation?: string;
  /** US state name (e.g. 'California'), UK region, or South African province. */
  state: string;
  avatar: string;
  firmament: FirmamentProfile;
  subjects: SubjectSlot[];
  /** True only after the learner finishes the full onboarding wizard. */
  onboardingComplete?: boolean;
  createdAt?: string;
}

export type AgentTab = 'tutoring' | 'study' | 'roadmap' | 'exam' | 'formulas';

export interface RoadmapTask {
  id: string;
  dayLabel: string;
  title: string;
  description: string;
  durationMinutes: number;
  cognitiveTip: string;
  completed?: boolean;
}

export interface RoadmapWeek {
  weekNumber: number;
  theme: string;
  atpFocus: string;
  mercuryRhythmNotes: string;
  estimatedHours: number;
  topics: string[];
  tasks: RoadmapTask[];
  examinerTraps: string[];
  milestoneCheckpoint: string;
}

export interface StudyRoadmap {
  id: string;
  subject: string;
  grade: string;
  createdAt: string;
  firmamentSummary: {
    profile: string;
    lifePathNumber: number;
    mercuryElement: string;
    primaryModality: string;
    pacingStrategy: string;
    diagnosticTreatment: 'REMEDIAL_SCAFFOLD' | 'ADVANCEMENT_SCAFFOLD';
  };
  overallGoal: string;
  targetExam?: string;
  weeks: RoadmapWeek[];
  keyAdvice: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  agent: 'tutoring' | 'study' | 'exam';
  text: string;
  timestamp: string;
  language?: OfficialLanguage;
  firmamentRef?: string;
}

export interface FormulaItem {
  id: string;
  name: string;
  topic: string;
  formula: string;
  description: string;
  variables: { symbol: string; meaning: string }[];
  whenToUse: string;
  example: string;
  grades: string[];
  stream: 'Pure Mathematics' | 'Mathematical Literacy' | 'Both';
  paper: 'Paper 1' | 'Paper 2' | 'Both';
}

export interface ExamQuestion {
  id: string;
  number: string;
  section: string;
  prompt: string;
  type: 'mcq' | 'calculation' | 'short' | 'essay';
  options?: string[];
  marks: number;
  rubric: string;
  examinerTrap: string;
  solution: string;
  subQuestions?: {
    number: string;
    prompt: string;
    marks: number;
    solution: string;
    rubric: string;
  }[];
}

export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  grade: string;
  examType: 'June Mid-Year Exam' | 'November Final Exam' | 'Term 1 Control Test' | 'Term 3 Trial/Preparatory';
  durationMinutes: number;
  totalMarks: number;
  instructions: string[];
  sections: {
    title: string;
    description: string;
    totalMarks: number;
    questions: ExamQuestion[];
  }[];
}

export interface StudyNote {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  term: string;
  atpWeek: string;
  summary: string;
  sparkNotes: string[];
  coreFormulasOrRules: string[];
  flashcards: { front: string; back: string }[];
  examinerTips: string[];
  dbeCurriculumFocus: string;
}

export interface PersonalizedSparkNotes {
  id: string;
  userId?: string;
  sessionId?: string;
  subject: string;
  grade: string;
  topic: string;
  title: string;
  summary: string;
  keyBreakdowns: {
    heading: string;
    details: string;
  }[];
  weakSpotsIdentified: {
    misconception: string;
    correction: string;
  }[];
  sparkBullets: string[];
  coreFormulasOrRules: string[];
  examinerTraps: string[];
  flashcards: {
    front: string;
    back: string;
  }[];
  cognitiveAdvice: string;
  conversationMessageCount: number;
  createdAt: string;
  syncedToSupabase?: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  jwtToken?: string;
  autoSync: boolean;
}

export interface SupabaseStatus {
  connected: boolean;
  rlsActive: boolean;
  userAuthenticated: boolean;
  userEmail?: string;
  message?: string;
}

