import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PSYCHOMETRIC_QUESTIONS, calculateFirmamentFromAnswers } from '../data/psychometrics';
import { syncOnboardingToSupabase } from '../services/supabase';
import { GRADES } from '../data/curriculumData';
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
  Zap,
} from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, student, updateStudentProfile, updateFirmament } = useApp();
  const [step, setStep] = useState<'auth' | 'quiz' | 'result'>('auth');
  const [isLoginMode, setIsLoginMode] = useState(false);

  // Auth fields
  const [fullName, setFullName] = useState(student?.fullName || 'Lunga Manana');
  const [email, setEmail] = useState(student?.email || 'mananalunga62@gmail.com');
  const [phone, setPhone] = useState(student?.phone || '+27 82 555 0192');
  const [dob, setDob] = useState(student?.dateOfBirth || '2007-06-15');
  const [grade, setGrade] = useState(student?.grade || 'Grade 12');
  const [password, setPassword] = useState('Matric2026!');

  // Quiz state: 16 questions
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [calculatedResult, setCalculatedResult] = useState<any>(null);

  if (!isOnboardingOpen) return null;

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudentProfile({
      fullName,
      email,
      phone,
      dateOfBirth: dob,
      grade,
    });
    setStep('quiz');
  };

  const handleSelectAnswer = (questionId: number, label: string) => {
    const updated = { ...answers, [questionId]: label };
    setAnswers(updated);

    if (currentQuestionIndex < PSYCHOMETRIC_QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Completed all 16 questions! Calculate Firmament!
      const profile = calculateFirmamentFromAnswers(fullName, dob, updated);
      const profileWithAnswers = { ...profile, rawAnswers: updated, onboardingAnswers: updated };
      setCalculatedResult(profileWithAnswers);
      updateFirmament(profileWithAnswers);
      // Persist user info + 16 answers to Supabase so Firmament rules can be served.
      updateStudentProfile({ fullName, email, phone, dateOfBirth: dob, grade, firmament: profileWithAnswers });
      void syncOnboardingToSupabase({
        profile: { fullName, email, phone, dateOfBirth: dob, grade },
        firmamentProfile: profileWithAnswers,
        answers: updated,
      });
      setStep('result');
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFinish = () => {
    setIsOnboardingOpen(false);
  };

  const currentQ = PSYCHOMETRIC_QUESTIONS[currentQuestionIndex];
  const progressPercent = Math.round(((currentQuestionIndex + 1) / PSYCHOMETRIC_QUESTIONS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="metallic-card w-full max-w-2xl rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 relative">
        {/* Close Button */}
        <button
          onClick={() => setIsOnboardingOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: AUTH (Sign up / Sign in) */}
        {step === 'auth' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl btn-accent flex items-center justify-center mx-auto mb-3 shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white">
                {isLoginMode ? 'Welcome Back to MyTutorZA' : 'Create Your MyTutorZA Account'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                South Africa’s premier CAPS AI Tutor for Grades 4 to 12
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLoginMode && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Learner Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Lunga Manana"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@gmail.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+27 82 000 0000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Date of Birth (For Cognitive Profile)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Grade Level
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:outline-none"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full btn-accent py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <span>{isLoginMode ? 'Sign In & Launch Tutor' : 'Continue to Diagnostic Assessment (16 Questions)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  {isLoginMode ? "Don't have an account? Sign up" : 'Already registered? Sign in'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: THE 16 PSYCHOMETRIC QUESTIONS */}
        {step === 'quiz' && currentQ && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-sky-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    The Firmament Diagnostic Assessment
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Question {currentQuestionIndex + 1} of {PSYCHOMETRIC_QUESTIONS.length}
                </span>
              </div>

              {/* Progress bar with active gradient */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full accent-gradient-bg transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 tracking-wider">
                Category: {currentQ.category}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-2 leading-relaxed">
                {currentQ.question}
              </h3>
            </div>

            <div className="space-y-3">
              {currentQ.options.map((opt) => {
                const isSelected = answers[currentQ.id] === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelectAnswer(currentQ.id, opt.label)}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-500 text-white shadow-lg'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected ? 'btn-accent text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-xs sm:text-sm leading-snug">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Back button */}
            {currentQuestionIndex > 0 && (
              <div className="flex justify-start pt-2">
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 py-1 px-3 rounded-lg bg-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous Question</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: RESULT CELEBRATION */}
        {step === 'result' && calculatedResult && (
          <div className="text-center space-y-6 py-2">
            <div>
              <div className="w-16 h-16 rounded-3xl btn-accent flex items-center justify-center mx-auto mb-3 shadow-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white">Cognitive DNA Calibrated!</h2>
              <p className="text-xs text-slate-400 mt-1">
                Your Firmament profile is now permanently linked to your AI tutoring agents.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Cognitive Score
                </span>
                <p className="text-sm font-extrabold text-white">
                  {calculatedResult.lifePath.profile} ({calculatedResult.cognitiveVector.primaryModality})
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{calculatedResult.processingSpeed}</p>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Processing Engine Pacing
                </span>
                <p className="text-sm font-extrabold text-amber-300">
                  {calculatedResult.mercury.element} Element
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{calculatedResult.mercury.pacingStyle}</p>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Retention & Scaffolding
                </span>
                <p className="text-sm font-extrabold text-emerald-300">
                  {calculatedResult.cognitiveVector.primaryModality} Modality
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{calculatedResult.retentionProfile}</p>
              </div>
            </div>

            {/* Firmament Guardrail Assurance */}
            <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-cyan-500/30 text-left flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-cyan-300">Firmament Guardrails Locked & Active</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                  Generic teaching is disabled. The AI is forced to adapt to your exact {calculatedResult.cognitiveVector.primaryModality} cognitive modality, CAPS syllabus standards, and guided discovery rules. Your account starts with a 3-day trial; upgrade via Billing to continue.
                </p>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full btn-accent py-3.5 rounded-xl font-bold text-sm cursor-pointer"
            >
              Enter MyTutorZA Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
