import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  getPsychometricQuestions,
  calculateFirmamentFromAnswers,
  normalizeGrade,
  type AnswerMap,
  type AnswerValue,
} from '../data/psychometrics';
import { GRADES, US_GRADES, UK_GRADES, REGIONS_BY_COUNTRY, UK_NATIONS, UK_REGIONS, getSubjectsForGrade } from '../data/curriculumData';
import { CountryCode, SubjectSlot } from '../types';
import confetti from 'canvas-confetti';
import {
  X,
  Brain,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  MapPin,
  BookOpen,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const inputClass =
  'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500';
const labelClass =
  'text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1';

type Step = 'account' | 'details' | 'subjects' | 'quiz' | 'result';

export const OnboardingModal: React.FC = () => {
  const {
    isOnboardingOpen,
    setIsOnboardingOpen,
    student,
    account,
    hasCompletedOnboarding,
    signUpAccount,
    signInAccount,
    completeOnboarding,
  } = useApp();

  const isGate = !hasCompletedOnboarding;
  const [step, setStep] = useState<Step>('account');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Account fields (never prefilled from the demo build)
  const [fullName, setFullName] = useState(student?.fullName || account?.fullName || '');
  const [email, setEmail] = useState(student?.email || account?.email || '');
  const [phone, setPhone] = useState(student?.phone || account?.phone || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Learner detail fields
  const [dob, setDob] = useState(student?.dateOfBirth || '');
  const [grade, setGrade] = useState(student?.grade || 'Grade 9');
  const [country, setCountry] = useState<CountryCode>(student?.country || 'US');
  const [nation, setNation] = useState(student?.nation || 'England');
  const [region, setRegion] = useState(student?.state || '');

  // Subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(student?.subjects?.map((s) => s.name) || []);

  // Diagnostic — only the 24 items for this learner's grade are ever used.
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>(
    (student?.firmament?.rawAnswers as AnswerMap) || {}
  );
  const [calculatedResult, setCalculatedResult] = useState<any>(student?.firmament || null);

  if (!isOnboardingOpen) return null;

  const regionOptions =
    country === 'UK'
      ? UK_REGIONS[nation] || []
      : (REGIONS_BY_COUNTRY as Record<string, string[]>)[country] || [];
  const regionNoun = country === 'US' ? 'state' : country === 'UK' ? 'region' : 'province';
  const regionHint =
    country === 'US'
      ? 'your state'
      : country === 'UK'
      ? 'your county, council area or district'
      : 'your province';
  const subjectOptions = getSubjectsForGrade(country, grade);
  const recommendedSubjects = subjectOptions.filter((s) => s.recommended);
  const subjectCatalog = subjectOptions;
  // Exactly 24 forced-choice items for this learner's grade (Grades 3–12).
  const questions = getPsychometricQuestions(grade);

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!isLoginMode && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      if (isLoginMode) {
        const result = await signInAccount({ email, password });
        if (!result.ok) {
          setError(result.error || 'Sign in failed.');
          return;
        }
        // Returning learner with a saved profile is handled by the context,
        // which closes onboarding. Otherwise continue into the wizard.
        setFullName(result.account?.fullName || fullName);
        setPhone(result.account?.phone || phone);
        setStep(hasCompletedOnboarding ? 'result' : 'details');
      } else {
        const result = await signUpAccount({ fullName, email, phone, password });
        if (!result.ok) {
          setError(result.error || 'Could not create your account.');
          return;
        }
        if (result.needsEmailConfirmation) {
          setNotice('Account created. Check your inbox to confirm your email — you can carry on now.');
        }
        setStep('details');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError('Enter your email address first, then tap "Forgot password?".');
      return;
    }
    setResetBusy(true);
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setNotice(
        data?.message ||
          (data?.delivered
            ? 'Reset link sent — check your inbox.'
            : 'We could not send a reset link right now.')
      );
    } catch (err: any) {
      setError(err?.message || 'Could not request a password reset.');
    } finally {
      setResetBusy(false);
    }
  };

  const dobDate = dob ? new Date(dob) : null;
  const dobValid = !!dobDate && !Number.isNaN(dobDate.getTime()) && dobDate < new Date() && dobDate.getFullYear() > 1900;
  const detailsValid = dobValid && !!grade && !!region;

  const toggleSubject = (name: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!detailsValid) {
      if (!dobValid) {
        setError('Please enter your date of birth (it must be a past date).');
        return;
      }
      setError(`Please choose your grade and your ${regionNoun}.`);
      return;
    }
    // Store DOB + grade + country/region immediately, before the quiz.
    setBusy(true);
    try {
      await saveProfileBasics();
    } finally {
      setBusy(false);
    }
    setStep('subjects');
  };

  const submitSubjects = async () => {
    setError(null);
    if (selectedSubjects.length === 0) {
      setError('Select at least one subject you take at school.');
      return;
    }
    // Persist grade + DOB + country + subjects BEFORE the diagnostic, so the
    // learner row exists in the database even if they pause the quiz.
    setBusy(true);
    try {
      await saveProfileBasics();
    } finally {
      setBusy(false);
    }
    setAnswers({});
    setCurrentQuestionIndex(0);
    setStep('quiz');
  };

  const buildSubjectSlots = (): SubjectSlot[] => {
    return selectedSubjects.map((name, index) => {
      const catalogEntry = subjectCatalog.find((s) => s.name === name);
      const existing = student?.subjects?.find((s) => s.name === name);
      return {
        id: existing?.id || `sub-${index + 1}`,
        name,
        category: (catalogEntry?.category || 'Humanities') as SubjectSlot['category'],
        previousTermMark: existing?.previousTermMark ?? 60,
        previousTermName: existing?.previousTermName || 'Previous Term',
        tutoringLanguage: existing?.tutoringLanguage || 'English',
        textbook: existing?.textbook,
      };
    });
  };

  /** Canonical learner profile payload shared by the pre-quiz and post-quiz saves. */
  const buildProfilePayload = () => ({
    fullName: fullName || account?.fullName || 'Learner',
    email: email || account?.email || '',
    phone,
    dateOfBirth: dob,
    grade,
    country,
    nation: country === 'UK' ? nation : undefined,
    state: region,
    subjects: buildSubjectSlots(),
  });

  /** POST the learner basics (no Firmament yet) as soon as subjects are chosen. */
  const saveProfileBasics = async (): Promise<boolean> => {
    const learnerEmail = email || account?.email || '';
    if (!learnerEmail) return false;
    try {
      const response = await fetch('/api/profile/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: learnerEmail,
          profile: buildProfilePayload(),
          firmament: null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      return Boolean(result?.success || result?.persisted);
    } catch (err) {
      console.warn('Learner basics save failed:', err);
      return false;
    }
  };

  /**
   * Persist the calculated Firmament profile to Supabase through the API.
   * This is the data foundation the LLM is bound to (DB -> LLM -> Firmament rules).
   */
  const saveFirmamentProfile = async (
    profile: any,
    rawAnswers: AnswerMap
  ): Promise<boolean> => {
    const learnerEmail = email || account?.email || '';
    if (!learnerEmail) return false;
    try {
      const response = await fetch('/api/profile/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: learnerEmail,
          profile: buildProfilePayload(),
          firmament: profile,
          answers: rawAnswers,
        }),
      });
      const result = await response.json().catch(() => ({}));
      return Boolean(result?.success || result?.persisted);
    } catch (err) {
      console.warn('Firmament profile save failed:', err);
      return false;
    }
  };

  const handleSelectAnswer = async (questionId: number, value: AnswerValue) => {
    setError(null);
    const updated: AnswerMap = { ...answers, [questionId]: value };
    setAnswers(updated);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return;
    }

    const profile = calculateFirmamentFromAnswers(
      fullName || account?.fullName || 'Learner',
      dob,
      grade,
      updated,
      country
    );
    const profileWithAnswers = { ...profile, rawAnswers: updated, onboardingAnswers: updated };

    // Save immediately after calculation so the Firmament profile exists in
    // the database before the learner reaches the LLM-powered workspace.
    setBusy(true);
    let saved = false;
    try {
      saved = await saveFirmamentProfile(profileWithAnswers, updated);
    } finally {
      setBusy(false);
    }
    setNotice(
      saved
        ? 'Firmament profile saved — your life path, Mercury engine and cognitive vector are now stored.'
        : 'Firmament calculated. We will retry saving your profile when you enter your workspace.'
    );

    setCalculatedResult(profileWithAnswers);
    setStep('result');
    try {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      console.error(err);
    }
  };

  const finishOnboarding = async () => {
    if (!calculatedResult) return;
    setBusy(true);
    setError(null);
    try {
      // Guarantee the Firmament snapshot (with the final subject slots) is
      // persisted before entering the workspace.
      await saveFirmamentProfile(calculatedResult, answers);
      await completeOnboarding({
        fullName: fullName || account?.fullName || 'Learner',
        email: email || account?.email || '',
        phone,
        dateOfBirth: dob,
        grade,
        country,
        nation: country === 'UK' ? nation : undefined,
        state: region,
        subjects: buildSubjectSlots(),
        firmament: calculatedResult,
        answers,
      });
    } finally {
      setBusy(false);
    }
  };

  const currentQ = questions[currentQuestionIndex];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);
  const stepIndex = ['account', 'details', 'subjects', 'quiz', 'result'].indexOf(step);

  // Returning learner viewing their profile/firmament summary.
  if (!isGate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <div className="metallic-card w-full max-w-2xl rounded-3xl border border-slate-800 p-6 sm:p-8 relative my-8">
          <button
            onClick={() => setIsOnboardingOpen(false)}
            className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl btn-accent flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white">Your Firmament Profile</h2>
            <p className="text-xs text-slate-400 mt-1">
              {student?.fullName} · {student?.grade} · {student?.state} ({student?.country === 'US' ? 'United States' : student?.country === 'UK' ? 'United Kingdom' : 'South Africa'})
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Archetype</span>
              <p className="text-sm font-extrabold text-white">{student?.firmament?.lifePath.profile}</p>
            </div>
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Modality</span>
              <p className="text-sm font-extrabold text-white">{student?.firmament?.cognitiveVector.primaryModality}</p>
            </div>
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Processing Speed</span>
              <p className="text-sm font-extrabold text-white">{student?.firmament?.processingSpeed}</p>
            </div>
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Subjects</span>
              <p className="text-sm font-extrabold text-white">{student?.subjects.length} active</p>
            </div>
          </div>
          <button
            onClick={() => setIsOnboardingOpen(false)}
            className="w-full btn-accent py-3 rounded-xl font-bold text-sm mt-6 cursor-pointer"
          >
            Back to my workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="metallic-card w-full max-w-2xl rounded-3xl border border-slate-800 p-6 sm:p-8 relative my-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sky-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              {step === 'account' && 'Step 1 of 4 · Create your account'}
              {step === 'details' && 'Step 2 of 4 · About you'}
              {step === 'subjects' && 'Step 3 of 4 · Your subjects'}
              {step === 'quiz' && 'Step 4 of 4 · Firmament diagnostic'}
              {step === 'result' && 'You are all set'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full ${stepIndex >= i ? 'btn-accent' : 'bg-slate-800'}`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 bg-rose-950/60 border border-rose-800 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-200 leading-snug">{error}</p>
          </div>
        )}
        {notice && (
          <div className="mb-4 flex items-start gap-2 bg-amber-950/50 border border-amber-800 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200 leading-snug">{notice}</p>
          </div>
        )}

        {/* STEP 1: ACCOUNT */}
        {step === 'account' && (
          <div>
            <div className="text-center mb-5">
              <h2 className="text-2xl font-black text-white">
                {isLoginMode ? 'Welcome back' : 'Create your learner account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Personalized tutoring grounded in your local curriculum, your grade and your Firmament profile.
              </p>
            </div>

            <form onSubmit={submitAccount} className="space-y-3.5">
              {!isLoginMode && (
                <div>
                  <label className={labelClass}>Full name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Johnson"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Mobile number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 000 0000"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
                {!isLoginMode && (
                  <div>
                    <label className={labelClass}>Confirm password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full btn-accent py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {isLoginMode ? 'Sign in' : 'Create account & continue'}
              </button>
            </form>

            <p className="text-[11px] text-slate-400 text-center mt-4">
              {isLoginMode ? 'New to MyTutorZA?' : 'Already have an account?'}{' '}
              <button
                onClick={() => {
                  setIsLoginMode((v) => !v);
                  setError(null);
                  setNotice(null);
                }}
                className="text-sky-400 font-bold hover:underline cursor-pointer"
              >
                {isLoginMode ? 'Create one' : 'Sign in'}
              </button>
            </p>

            {isLoginMode && (
              <p className="text-[11px] text-center mt-2">
                <button
                  type="button"
                  onClick={requestPasswordReset}
                  disabled={resetBusy}
                  className="text-slate-400 hover:text-sky-300 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {resetBusy ? 'Sending reset link…' : 'Forgot password?'}
                </button>
              </p>
            )}
          </div>
        )}

        {/* STEP 2: LEARNER DETAILS (DOB, GRADE, COUNTRY, STATE) */}
        {step === 'details' && (
          <form onSubmit={submitDetails} className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-white">Tell us about you</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your birthday, grade and {regionNoun} decide which curriculum is pushed to your agents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date of birth</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Grade</label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={grade}
                    onChange={(e) => {
                      setGrade(e.target.value);
                      setSelectedSubjects([]);
                      // A different grade means a different 24-item set.
                      setAnswers({});
                      setCurrentQuestionIndex(0);
                    }}
                    className={`${inputClass} pl-9 appearance-none cursor-pointer`}
                  >
                    {(country === 'US' ? US_GRADES : country === 'UK' ? UK_GRADES : GRADES).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Country</label>
                <select
                  value={country}
                  onChange={(e) => {
                    const next = e.target.value as CountryCode;
                    setCountry(next);
                    setRegion('');
                    setSelectedSubjects([]);
                    setAnswers({});
                    setCurrentQuestionIndex(0);
                    const nextGrades = next === 'UK' ? UK_GRADES : next === 'US' ? US_GRADES : GRADES;
                    setGrade((prev) =>
                      nextGrades.includes(prev) ? prev : next === 'UK' ? 'Year 9' : 'Grade 9'
                    );
                    if (next === 'UK') setNation('England');
                  }}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="ZA">South Africa</option>
                </select>
              </div>

              {country === 'UK' && (
                <div>
                  <label className={labelClass}>Nation</label>
                  <select
                    value={nation}
                    onChange={(e) => {
                      setNation(e.target.value);
                      setRegion('');
                    }}
                    className={`${inputClass} appearance-none cursor-pointer`}
                  >
                    {UK_NATIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelClass}>
                  {country === 'UK' ? `${nation} region` : country === 'US' ? 'State' : 'Province'}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <select
                    required
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className={`${inputClass} pl-9 appearance-none cursor-pointer`}
                  >
                    <option value="">Select {regionHint}…</option>
                    {regionOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('account')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 py-2 px-3 rounded-lg bg-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 btn-accent py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Continue
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUBJECTS */}
        {step === 'subjects' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-white">Which subjects do you take in {grade}?</h2>
              <p className="text-xs text-slate-400 mt-1">
                Showing {subjectCatalog.length} subjects offered in {grade}
                {country === 'ZA' ? ' (CAPS/DBE)' : country === 'UK' ? ' (UK curriculum)' : ' (state standards)'} ·{' '}
                {selectedSubjects.length} selected.
              </p>
              {recommendedSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSubjects(recommendedSubjects.map((s) => s.name))}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 border border-cyan-800 rounded-lg px-2.5 py-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Use recommended {grade} subjects ({recommendedSubjects.length})
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subjectCatalog.map((s) => {
                const active = selectedSubjects.includes(s.name);
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => toggleSubject(s.name)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                      active
                        ? 'bg-sky-500/20 border-sky-500 text-white'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <BookOpen className={`w-4 h-4 shrink-0 mt-0.5 ${active ? 'text-sky-300' : 'text-slate-500'}`} />
                    <span className="text-xs leading-snug flex-1">
                      {s.name}
                      {s.recommended && (
                        <span className="ml-1.5 inline-block align-middle text-[9px] font-bold uppercase tracking-wide text-cyan-300 bg-cyan-950/60 border border-cyan-800 rounded px-1 py-0.5">
                          Recommended
                        </span>
                      )}
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 py-2 px-3 rounded-lg bg-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={submitSubjects}
                disabled={busy}
                className="flex-1 btn-accent py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Continue to diagnostic
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: THE 24 FORCED-CHOICE FIRMAMENT ITEMS */}
        {step === 'quiz' && currentQ && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-sky-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    The Firmament Diagnostic
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full accent-gradient-bg transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-snug">
                {questions.length} questions for {normalizeGrade(grade)} → Life Path, Mercury element and
                cognitive vector. There are no right answers; pick the statement that fits you better.
              </p>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 tracking-wider">
                This vs. That
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-2 leading-relaxed">
                Which one sounds more like you?
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Choose the statement that fits you better — not the one that sounds “better”.
              </p>
            </div>

            <div className="space-y-2.5">
              {(currentQ.id % 2 === 0
                ? [
                    { value: 'that' as const, text: currentQ.that },
                    { value: 'this' as const, text: currentQ.this },
                  ]
                : [
                    { value: 'this' as const, text: currentQ.this },
                    { value: 'that' as const, text: currentQ.that },
                  ]
              ).map((opt, index) => {
                const isSelected = answers[currentQ.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectAnswer(currentQ.id, opt.value)}
                    disabled={busy}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer disabled:opacity-60 ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500 text-white shadow-lg'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${isSelected ? 'btn-accent text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {index === 0 ? 'A' : 'B'}
                    </span>
                    <span className="text-xs sm:text-sm leading-snug">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {currentQuestionIndex > 0 && (
              <button
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 py-1.5 px-3 rounded-lg bg-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous question
              </button>
            )}
          </div>
        )}

        {/* STEP 5: RESULT */}
        {step === 'result' && calculatedResult && (
          <div className="text-center space-y-5">
            <div>
              <div className="w-16 h-16 rounded-3xl btn-accent flex items-center justify-center mx-auto mb-3 shadow-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white">Firmament calibrated!</h2>
              <p className="text-xs text-slate-400 mt-1">
                {fullName || account?.fullName} · {grade} · {country === 'UK' ? `${nation} · ` : ''}{region} · {selectedSubjects.length || student?.subjects.length || 0} subjects
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Life Path</span>
                <p className="text-sm font-extrabold text-white">{calculatedResult.lifePath?.profile}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Path {calculatedResult.lifePath?.number}</p>
              </div>
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mercury Engine</span>
                <p className="text-sm font-extrabold text-amber-300">{calculatedResult.mercury?.element} element</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{calculatedResult.mercury?.pacingStyle}</p>
              </div>
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cognitive Vector</span>
                <p className="text-sm font-extrabold text-cyan-300">
                  {calculatedResult.cognitiveVector?.primaryModality}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{calculatedResult.processingSpeed}</p>
              </div>
            </div>

            {calculatedResult.dimensions && (
              <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  8-dimension cognitive profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {Object.values<any>(calculatedResult.dimensions).map((dim) => (
                    <div key={dim.key} className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-500 truncate">{dim.label}</span>
                      <span
                        className={`font-bold shrink-0 ${dim.score >= 0 ? 'text-cyan-300' : 'text-amber-300'}`}
                        title={dim.description}
                      >
                        {dim.poleLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-cyan-500/30 text-left flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Guardrails locked. Your Tutoring, Study and Exam agents are now bound to your
                {' '}{calculatedResult.cognitiveVector?.primaryModality} modality, {grade} standards for {region}.
              </p>
            </div>

            <button
              onClick={finishOnboarding}
              disabled={busy}
              className="w-full btn-accent py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Enter my workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
