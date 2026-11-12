import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DisplayMode,
  FirmamentProfile,
  OfficialLanguage,
  StudentAccount,
  StudentProfile,
  SubjectSlot,
  SubscriptionAccess,
  ThemeAccent,
  TextbookReference,
  AgentTab,
} from '../types';
import { THEME_ACCENTS } from '../data/curriculumData';
import {
  deriveSubscriptionAccess,
  fetchSubscriptionAccess,
} from '../services/subscription';
import {
  AuthResult,
  SignInInput,
  SignUpInput,
  getCurrentAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
} from '../services/auth';

const PROFILE_KEY = 'mytutorza_profile';
const APP_TABS: ReadonlyArray<AgentTab> = ['tutoring', 'study', 'roadmap', 'exam', 'formulas'];

function tabFromHash(): AgentTab {
  const slug = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0].split('/')[0];
  return (APP_TABS as ReadonlyArray<string>).includes(slug) ? (slug as AgentTab) : 'tutoring';
}

function currentHashForTab(tab: AgentTab): string {
  return `#/${tab}`;
}

export interface OnboardingPayload {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  grade: string;
  country: 'US' | 'UK' | 'ZA';
  /** UK nation when country === 'UK'. */
  nation?: string;
  state: string;
  subjects: SubjectSlot[];
  firmament: FirmamentProfile;
  answers: Record<number, string>;
}

interface AppContextType {
  account: StudentAccount | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  signUpAccount: (input: SignUpInput) => Promise<AuthResult>;
  signInAccount: (input: SignInInput) => Promise<AuthResult>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<void>;
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
  isSubscriptionOpen: boolean;
  setIsSubscriptionOpen: (open: boolean) => void;
  subscription: SubscriptionAccess | null;
  hasAgentAccess: boolean;
  refreshSubscription: () => Promise<void>;
  updateStudentProfile: (profile: Partial<StudentProfile>) => void;
  updateSubjectSlot: (subjectId: string, updates: Partial<SubjectSlot>) => void;
  addSubjectSlot: (subject: Omit<SubjectSlot, 'id'>) => void;
  removeSubjectSlot: (id: string) => void;
  updateTextbookForActiveSubject: (ref: TextbookReference) => void;
  updateTutoringLanguageForActiveSubject: (lang: OfficialLanguage) => void;
  updateFirmament: (firmament: FirmamentProfile) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

function readStoredProfile(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentProfile;
    // Profiles written by the legacy demo build have no onboardingComplete flag
    // and are treated as "new user" so nobody inherits the demo learner.
    if (!parsed || !parsed.onboardingComplete) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Fire-and-forget persistence of the full profile to the server/Supabase. */
function syncProfileToServer(profile: StudentProfile, answers?: Record<number, string>) {
  try {
    void fetch('/api/profile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          fullName: profile.fullName,
          email: profile.email,
          phone: profile.phone,
          dateOfBirth: profile.dateOfBirth,
          grade: profile.grade,
          country: profile.country,
          nation: profile.nation,
          state: profile.state,
          subjects: profile.subjects,
        },
        firmamentProfile: profile.firmament,
        answers: answers || profile.firmament?.rawAnswers || {},
      }),
    }).catch((err) => console.warn('Profile sync failed:', err));
  } catch (err) {
    console.warn('Profile sync failed:', err);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<StudentAccount | null>(() => getCurrentAccount());
  const [student, setStudent] = useState<StudentProfile | null>(() => readStoredProfile());
  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AgentTab>('tutoring');
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>(() => {
    return (localStorage.getItem('mytutorza_accent') as ThemeAccent) || 'electric-blue';
  });
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    return (localStorage.getItem('mytutorza_mode') as DisplayMode) || 'dark';
  });

  const hasCompletedOnboarding = !!student?.onboardingComplete;
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => !readStoredProfile());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTextbookModalOpen, setIsTextbookModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(() => {
    const stored = readStoredProfile();
    return stored?.subscription || null;
  });

  // Hash routing: browser back/forward navigates BETWEEN APP VIEWS instead of
  // leaving the app, and every tab view is restorable from the URL.
  useEffect(() => {
    const mountTab = tabFromHash();
    if (!window.history.state?.tab) {
      window.history.replaceState({ tab: mountTab }, '', currentHashForTab(mountTab));
    }
    setActiveTab(mountTab);

    const onPop = () => setActiveTab(tabFromHash());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hash = currentHashForTab(activeTab);
    if (window.location.hash !== hash) {
      window.history.pushState({ tab: activeTab }, '', hash);
    }
  }, [activeTab]);

  // The server is the source of truth for trial/payment status. Refresh when a
  // learner signs in or their email changes, and keep the local profile in sync.
  const refreshSubscription = async () => {
    const email = student?.email || account?.email;
    if (!email) return;
    const access = await fetchSubscriptionAccess(email);
    if (!access) return;
    setSubscription(access);
    setStudent((prev) => (prev ? { ...prev, subscription: access } : prev));
  };

  useEffect(() => {
    if (!student?.email) return;
    if (student.subscription) setSubscription(student.subscription);
    void refreshSubscription();
    // Refresh only when the signed-in learner changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.email]);

  // A learner may use the agents while the entitlement is active. If we have
  // not read the entitlement yet, do not block the UI.
  const hasAgentAccess = !subscription || !subscription.enforced || subscription.active;

  // Keep the first subject selected whenever the subject list changes.
  useEffect(() => {
    if (!student) {
      if (activeSubjectId) setActiveSubjectId('');
      return;
    }
    const stillExists = student.subjects?.some((s) => s.id === activeSubjectId);
    if (!stillExists) {
      setActiveSubjectId(student.subjects?.[0]?.id || '');
    }
  }, [student, activeSubjectId]);

  // Persist ONLY completed profiles, so abandoned sign-ups are never cached
  // as "returning users".
  useEffect(() => {
    if (student && student.onboardingComplete) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(student));
    }
  }, [student]);

  useEffect(() => {
    localStorage.setItem('mytutorza_accent', themeAccent);
    const root = document.documentElement;
    THEME_ACCENTS.forEach((t) => root.classList.remove(`theme-${t.id}`));
    root.classList.add(`theme-${themeAccent}`);
  }, [themeAccent]);

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

  // A stored profile whose email does not match the active session belongs to
  // someone else — never show it.
  useEffect(() => {
    if (account && student && student.email && student.email.toLowerCase() !== account.email.toLowerCase()) {
      setStudent(null);
      setIsOnboardingOpen(true);
    }
  }, [account, student]);

  const signUpAccount = async (input: SignUpInput): Promise<AuthResult> => {
    const result = await registerAccount(input);
    if (result.ok && result.account) setAccount(result.account);
    return result;
  };

  const signInAccount = async (input: SignInInput): Promise<AuthResult> => {
    const result = await loginAccount(input);
    if (result.ok && result.account) {
      setAccount(result.account);
      let stored = readStoredProfile();
      if (!stored || stored.email.toLowerCase() !== result.account.email.toLowerCase()) {
        // Try server
        try {
          const r = await fetch(`/api/profile/get?email=${encodeURIComponent(result.account.email)}`);
          const j = await r.json();
          if (j.profile) {
            const p = j.profile;
            const subjects = Array.isArray(p.subjects) ? p.subjects.map((s: any, i: number) => ({
              id: s.id || `sub-${i}`,
              name: s.name,
              category: s.category || 'Mathematics',
              previousTermMark: s.previousTermMark ?? 50,
              previousTermName: s.previousTermName || 'Term 1',
              tutoringLanguage: s.tutoringLanguage || 'English',
              textbook: s.textbook,
            })) : [];
            const profile: StudentProfile = {
              id: p.user_id || result.account.id,
              fullName: p.full_name || result.account.fullName,
              email: p.email,
              phone: p.phone || result.account.phone,
              dateOfBirth: p.date_of_birth || '',
              grade: p.grade || 'Grade 9',
              country: (p.country as any) || 'US',
              nation: p.nation,
              state: p.state || '',
              avatar: DEFAULT_AVATAR,
              firmament: (j.firmament && (j.firmament as any).life_path) ? {
                studentName: p.full_name || result.account.fullName,
                calculatedAt: j.firmament.calculated_at,
                grade: p.grade || 'Grade 9',
                country: (p.country as any) || 'US',
                cognitiveScore: j.firmament.cognitive_score,
                processingSpeed: j.firmament.processing_speed,
                retentionProfile: j.firmament.retention_profile,
                supportNeeds: j.firmament.scaffold_needs,
                scaffoldNeeds: j.firmament.scaffold_needs,
                firmamentRules: j.firmament.firmament_rules || [],
                dimensions: j.firmament.cognitive_vector?.dimensions,
                cognitiveProfileGuide: j.firmament.cognitive_vector?.cognitiveProfileGuide,
                lifePath: j.firmament.life_path || {},
                mercury: j.firmament.mercury || {},
                cognitiveVector: j.firmament.cognitive_vector || {},
                rawAnswers: j.firmament.raw_answers || {},
              } as any : (stored?.firmament || {} as any),
              subjects,
              subscription: deriveSubscriptionAccess({
                status: p.subscription_status,
                trialExpiresAt: p.trial_expires_at,
                plan: p.subscription_plan,
                provider: p.subscription_provider,
              }),
              // Only treat the server profile as complete when a Firmament
              // snapshot exists — otherwise the LLM would have no rules to bind.
              onboardingComplete: Boolean(j.firmament && (j.firmament as any).life_path),
              createdAt: p.created_at || new Date().toISOString(),
            };
            stored = profile;
            localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
          }
        } catch {}
      }
      if (stored && stored.email.toLowerCase() === result.account.email.toLowerCase()) {
        setStudent(stored);
        setIsOnboardingOpen(false);
      }
    }
    return result;
  };

  const completeOnboarding = async (payload: OnboardingPayload): Promise<void> => {
    const profile: StudentProfile = {
      id: account?.id || student?.id || `usr-${Date.now()}`,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      dateOfBirth: payload.dateOfBirth,
      grade: payload.grade,
      country: payload.country,
      nation: payload.nation,
      state: payload.state,
      avatar: student?.avatar || DEFAULT_AVATAR,
      firmament: payload.firmament,
      subjects: payload.subjects,
      subscription:
        subscription ||
        deriveSubscriptionAccess({
          status: 'trial',
          trialExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          enforced: false,
        }),
      onboardingComplete: true,
      createdAt: student?.createdAt || new Date().toISOString(),
    };
    setStudent(profile);
    setActiveSubjectId(profile.subjects[0]?.id || '');
    setIsOnboardingOpen(false);
    syncProfileToServer(profile, payload.answers);
  };

  const activeSubject = student
    ? student.subjects.find((s) => s.id === activeSubjectId) || student.subjects[0] || null
    : null;

  const updateStudentProfile = (updates: Partial<StudentProfile>) => {
    setStudent((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      return next;
    });
  };

  const updateSubjectSlot = (subjectId: string, updates: Partial<SubjectSlot>) => {
    setStudent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        subjects: prev.subjects.map((sub) => (sub.id === subjectId ? { ...sub, ...updates } : sub)),
      };
    });
  };

  const addSubjectSlot = (subjectData: Omit<SubjectSlot, 'id'>) => {
    const newId = `sub-${Date.now()}`;
    const newSubject: SubjectSlot = { ...subjectData, id: newId };
    setStudent((prev) => (prev ? { ...prev, subjects: [...prev.subjects, newSubject] } : prev));
    setActiveSubjectId(newId);
  };

  const removeSubjectSlot = (id: string) => {
    setStudent((prev) => {
      if (!prev) return prev;
      return { ...prev, subjects: prev.subjects.filter((s) => s.id !== id) };
    });
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
    setStudent((prev) => (prev ? { ...prev, firmament } : prev));
  };

  const logout = () => {
    void logoutAccount();
    // Keep the learner profile so returning sign-in restores their data;
    // only clear the active session/account pointers.
    setAccount(null);
    setStudent(null);
    setActiveSubjectId('');
    setActiveTab('tutoring');
    setIsSettingsOpen(false);
    setIsSubscriptionOpen(false);
    setSubscription(null);
    setIsOnboardingOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        account,
        isAuthenticated: !!account,
        hasCompletedOnboarding,
        signUpAccount,
        signInAccount,
        completeOnboarding,
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
        isSubscriptionOpen,
        setIsSubscriptionOpen,
        subscription,
        hasAgentAccess,
        refreshSubscription,
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
