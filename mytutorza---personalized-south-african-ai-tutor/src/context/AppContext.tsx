import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DisplayMode,
  FirmamentProfile,
  OfficialLanguage,
  StudentProfile,
  SubjectSlot,
  ThemeAccent,
  TextbookReference,
  AgentTab,
} from '../types';
import { THEME_ACCENTS } from '../data/curriculumData';

interface AppContextType {
  student: StudentProfile | null;
  activeSubject: SubjectSlot | null;
  setActiveSubjectId: (id: string) => void;
  activeTab: AgentTab;
  setActiveTab: (tab: AgentTab) => void;
  themeAccent: ThemeAccent;
  setThemeAccent: (accent: ThemeAccent) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isTextbookModalOpen: boolean;
  setIsTextbookModalOpen: (open: boolean) => void;
  isContactModalOpen: boolean;
  setIsContactModalOpen: (open: boolean) => void;
  updateStudentProfile: (profile: Partial<StudentProfile>) => void;
  updateSubjectSlot: (subjectId: string, updates: Partial<SubjectSlot>) => void;
  addSubjectSlot: (subject: Omit<SubjectSlot, 'id'>) => void;
  removeSubjectSlot: (id: string) => void;
  updateTextbookForActiveSubject: (ref: TextbookReference) => void;
  updateTutoringLanguageForActiveSubject: (lang: OfficialLanguage) => void;
  updateFirmament: (firmament: FirmamentProfile) => void;
  logout: () => void;
}

const DEFAULT_SUBJECTS: SubjectSlot[] = [
  {
    id: 'sub-1',
    name: 'English Home Language',
    category: 'Language',
    isMandatory: true,
    previousTermMark: 50,
    previousTermName: 'Term 2',
    tutoringLanguage: 'English',
    textbook: {
      title: 'Platinum English Home Language Grade 12 Learner Book',
      authors: ['M. Ridge', 'L. Barker'],
      publisher: 'Pearson Education South Africa',
    },
  },
  {
    id: 'sub-2',
    name: 'isiZulu First Additional Language',
    category: 'Language',
    isMandatory: true,
    previousTermMark: 62,
    previousTermName: 'Term 2',
    tutoringLanguage: 'isiZulu',
    textbook: {
      title: 'IsiZulu Sethu Grade 12',
      authors: ['N. S. Zulu', 'D. B. K. Mhlongo'],
      publisher: 'Macmillan South Africa',
    },
  },
  {
    id: 'sub-3',
    name: 'Mathematics (Pure)',
    category: 'Mathematics',
    isMandatory: true,
    previousTermMark: 55,
    previousTermName: 'Term 2',
    tutoringLanguage: 'English',
    textbook: {
      title: 'Mind Action Series Mathematics Grade 12',
      authors: ['M. D. Phillips', 'J. Basson'],
      editor: 'J. C. Phillips',
      publisher: 'Allcopy Publishers',
    },
  },
  {
    id: 'sub-4',
    name: 'Life Orientation',
    category: 'Humanities',
    isMandatory: true,
    previousTermMark: 72,
    previousTermName: 'Term 2',
    tutoringLanguage: 'English',
    textbook: {
      title: 'Focus Life Orientation Grade 12',
      authors: ['E. Rooth', 'S. Steenkamp'],
      publisher: 'Maskew Miller Longman',
    },
  },
  {
    id: 'sub-5',
    name: 'Physical Sciences (Physics & Chemistry)',
    category: 'Sciences',
    previousTermMark: 48,
    previousTermName: 'Term 2',
    tutoringLanguage: 'English',
    textbook: {
      title: 'Doc Scientia Physical Sciences Grade 12 Textbook & Workbook',
      authors: ['E. Engelbrecht', 'M. Jansen'],
      publisher: 'Doc Scientia',
    },
  },
  {
    id: 'sub-6',
    name: 'Life Sciences (Biology)',
    category: 'Sciences',
    previousTermMark: 60,
    previousTermName: 'Term 2',
    tutoringLanguage: 'English',
    textbook: {
      title: 'Understanding Life Sciences Grade 12',
      authors: ['T. Isaac', 'S. Chetty'],
      publisher: 'Pulse Education Services',
    },
  },
  {
    id: 'sub-7',
    name: 'Accounting',
    category: 'Commerce',
    previousTermMark: 54,
    previousTermName: 'Term 2',
    tutoringLanguage: 'English',
    textbook: {
      title: 'New Era Accounting Grade 12',
      authors: ['T. Hall', 'D. Woodroffe'],
      publisher: 'New Generations Publishing',
    },
  },
  {
    id: 'sub-8',
    name: 'Geography',
    category: 'Humanities',
    previousTermMark: 68,
    previousTermName: 'Term 2',
    tutoringLanguage: 'English',
    textbook: {
      title: 'Focus Geography Grade 12',
      authors: ['L. Dilley', 'J. Earle'],
      publisher: 'Pearson Education South Africa',
    },
  },
  {
    id: 'sub-9',
    name: 'Information Technology (IT)',
    category: 'Technology',
    previousTermMark: 65,
    previousTermName: 'Term 2',
    tutoringLanguage: 'English',
    textbook: {
      title: 'Delphi for CAPS IT Grade 12',
      authors: ['C. Venter', 'R. Brooks'],
      publisher: 'DITT Academic',
    },
  },
];

const DEFAULT_FIRMAMENT: FirmamentProfile = {
  studentName: 'Lunga Manana',
  calculatedAt: new Date().toISOString(),
  cognitiveScore: 'The Architect-Logical-Rule (High Processing Speed, Axiomatic Retention)',
  processingSpeed: 'High Processing Speed',
  retentionProfile: 'Axiomatic Retention (High conceptual retention with formal rule adherence)',
  supportNeeds: 'Needs supported Guided Discovery guidance: explicit prerequisite checks, step-by-step discovery, and zero direct answer disclosure.',
  firmamentRules: [
    'LAW 1: Blindness to Generic Tutoring — Never use generic chat openings, boilerplate textbook regurgitations, or bland pleasantries. You are locked to the student profile.',
    'LAW 2: Guided Discovery Zero-Direct-Answer Law — Never solve problems for the student or reveal the final answer. Ask the next targeted guiding question.',
    'LAW 3: Cognitive Modality Alignment — Frame all analogies and explanations strictly using the student\'s sensory modality (Logical-Rule).',
    'LAW 4: Real-Time CAPS DBE Syllabus Grounding — Quote exact DBE Annual Teaching Plan milestones, exam formula sheets, and chief examiner trap warnings.',
    'LAW 5: Cultural & Linguistic Resonance — Support South African context and 11 official languages with culturally resonant examples.',
  ],
  lifePath: {
    number: 7,
    profile: 'The Architect',
    description: 'Driven by analytical inquiry and structural mastery. You excel when concepts are systematically organized into clear rules and principles.',
    strengths: ['Analytical precision', 'System building', 'High focus under pressure', 'Independent research'],
  },
  mercury: {
    element: 'Air',
    pacingStyle: 'Conceptual & Guided Discovery Dialogue',
    temperament: 'Intellectually curious, connects ideas across CAPS subjects',
    learningRhythm: 'Interactive conversational inquiry and conceptual synthesis',
  },
  cognitiveVector: {
    primaryModality: 'Logical-Rule',
    secondaryModality: 'Visual',
    southAfricanAnalogySet: 'Strict deductive syllogisms, axiomatic proofs, algorithmic state transitions, Gautrain ticketing systems',
    reasoningScaffold: 'Deductive Axiom → Intermediate Substitution → Final Statement with DBE Reason',
  },
};

const DEFAULT_PROFILE: StudentProfile = {
  id: 'usr-matric-2026',
  fullName: 'Lunga Manana',
  email: 'mananalunga62@gmail.com',
  phone: '+27 82 555 0192',
  dateOfBirth: '2007-06-15',
  grade: 'Grade 12',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  firmament: DEFAULT_FIRMAMENT,
  subjects: DEFAULT_SUBJECTS,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<StudentProfile>(() => {
    try {
      const saved = localStorage.getItem('mytutorza_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PROFILE;
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string>(() => {
    return student?.subjects?.[2]?.id || student?.subjects?.[0]?.id || 'sub-3';
  });

  const [activeTab, setActiveTab] = useState<AgentTab>('tutoring');
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>(() => {
    return (localStorage.getItem('mytutorza_accent') as ThemeAccent) || 'electric-blue';
  });
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    return (localStorage.getItem('mytutorza_mode') as DisplayMode) || 'dark';
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTextbookModalOpen, setIsTextbookModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Sync profile to localStorage
  useEffect(() => {
    if (student) {
      localStorage.setItem('mytutorza_profile', JSON.stringify(student));
    }
  }, [student]);

  // Sync accent to root element
  useEffect(() => {
    localStorage.setItem('mytutorza_accent', themeAccent);
    const root = document.documentElement;
    // Remove old theme classes
    THEME_ACCENTS.forEach((t) => root.classList.remove(`theme-${t.id}`));
    root.classList.add(`theme-${themeAccent}`);
  }, [themeAccent]);

  // Sync display mode to root and body elements
  useEffect(() => {
    localStorage.setItem('mytutorza_mode', displayMode);
    const root = document.documentElement;
    root.classList.remove('mode-dark', 'mode-light', 'mode-normal');
    root.classList.add(`mode-${displayMode}`);
    root.setAttribute('data-theme', displayMode);
    if (document.body) {
      document.body.classList.remove('mode-dark', 'mode-light', 'mode-normal');
      document.body.classList.add(`mode-${displayMode}`);
      document.body.setAttribute('data-theme', displayMode);
    }
  }, [displayMode]);

  const activeSubject = student.subjects.find((s) => s.id === activeSubjectId) || student.subjects[0] || null;

  const updateStudentProfile = (updates: Partial<StudentProfile>) => {
    setStudent((prev) => ({ ...prev, ...updates }));
  };

  const updateSubjectSlot = (subjectId: string, updates: Partial<SubjectSlot>) => {
    setStudent((prev) => ({
      ...prev,
      subjects: prev.subjects.map((sub) => (sub.id === subjectId ? { ...sub, ...updates } : sub)),
    }));
  };

  const addSubjectSlot = (subjectData: Omit<SubjectSlot, 'id'>) => {
    const newId = `sub-${Date.now()}`;
    const newSubject: SubjectSlot = { ...subjectData, id: newId };
    setStudent((prev) => ({
      ...prev,
      subjects: [...prev.subjects, newSubject],
    }));
    setActiveSubjectId(newId);
  };

  const removeSubjectSlot = (id: string) => {
    setStudent((prev) => {
      const remaining = prev.subjects.filter((s) => s.id !== id);
      return { ...prev, subjects: remaining };
    });
    if (activeSubjectId === id) {
      const fallback = student.subjects.find((s) => s.id !== id);
      if (fallback) setActiveSubjectId(fallback.id);
    }
  };

  const updateTextbookForActiveSubject = (ref: TextbookReference) => {
    if (!activeSubject) return;
    updateSubjectSlot(activeSubject.id, { textbook: ref });
  };

  const updateTutoringLanguageForActiveSubject = (lang: OfficialLanguage) => {
    if (!activeSubject) return;
    updateSubjectSlot(activeSubject.id, { tutoringLanguage: lang });
  };

  const updateFirmament = (firmament: FirmamentProfile) => {
    setStudent((prev) => ({ ...prev, firmament }));
  };

  const logout = () => {
    localStorage.removeItem('mytutorza_profile');
    setStudent(DEFAULT_PROFILE);
    setIsOnboardingOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        student,
        activeSubject,
        setActiveSubjectId,
        activeTab,
        setActiveTab,
        themeAccent,
        setThemeAccent,
        displayMode,
        setDisplayMode,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        isTextbookModalOpen,
        setIsTextbookModalOpen,
        isContactModalOpen,
        setIsContactModalOpen,
        updateStudentProfile,
        updateSubjectSlot,
        addSubjectSlot,
        removeSubjectSlot,
        updateTextbookForActiveSubject,
        updateTutoringLanguageForActiveSubject,
        updateFirmament,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
