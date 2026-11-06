/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GraduationCap } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { SubjectHeader } from './components/SubjectHeader';
import { TutoringAgentTab } from './components/TutoringAgentTab';
import { StudyAgentTab } from './components/StudyAgentTab';
import { StudyRoadmapTab } from './components/StudyRoadmapTab';
import { ExamAgentTab } from './components/ExamAgentTab';
import { FormulaSheetsTab } from './components/FormulaSheetsTab';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { TextbookModal } from './components/TextbookModal';
import { ContactModal } from './components/ContactModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { PasswordRecovery } from './components/PasswordRecovery';

const AppContent: React.FC = () => {
  const { activeTab, displayMode, hasCompletedOnboarding } = useApp();
  const [showSub, setShowSub] = React.useState(false);

  const isLight = displayMode === 'light';
  const isSilver = displayMode === 'normal';

  // A brand-new visitor never sees the workspace (or any demo learner).
  // They get a proper landing + the account/onboarding gate.
  if (!hasCompletedOnboarding) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
        <header className="border-b border-slate-800/80">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-sky-400" />
            <span className="text-lg font-black tracking-tight">MyTutorZA</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl text-center">
            <h1 className="text-3xl sm:text-4xl font-black leading-tight">
              A tutor that calibrates to <span className="text-sky-400">how you think</span>.
            </h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Create your account, tell us your grade, subjects and state, then complete the
              16-question Firmament diagnostic. Your Tutoring, Study and Exam agents are then
              locked to your cognitive profile and your local curriculum standards.
            </p>

            <ul className="mt-6 grid sm:grid-cols-3 gap-3 text-left">
              <li className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-extrabold text-sky-300">Socratic Tutoring</p>
                <p className="text-[11px] text-slate-400 mt-1">Guided discovery — never just the answer.</p>
              </li>
              <li className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-extrabold text-emerald-300">Study &amp; Exam Agents</p>
                <p className="text-[11px] text-slate-400 mt-1">Notes, flashcards and papers for your grade.</p>
              </li>
              <li className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-extrabold text-amber-300">The Firmament</p>
                <p className="text-[11px] text-slate-400 mt-1">A per-learner cognitive learning profile.</p>
              </li>
            </ul>

            <p className="text-[11px] text-slate-500 mt-6">
              Sign up below to begin — it takes about 3 minutes.
            </p>
          </div>
        </main>

        <OnboardingModal />
        <PasswordRecovery />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 font-sans flex flex-col ${
        isLight
          ? 'bg-white text-slate-900'
          : isSilver
          ? 'bg-slate-200 text-slate-900'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Navigation */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Subject Header & 4 Tabs (Tutoring, Study, Exam, Formulas) */}
        <SubjectHeader />

        {/* Tab Views */}
        <div className="mt-6">
          {activeTab === 'tutoring' && <TutoringAgentTab />}
          {activeTab === 'study' && <StudyAgentTab />}
          {activeTab === 'roadmap' && <StudyRoadmapTab />}
          {activeTab === 'exam' && <ExamAgentTab />}
          {activeTab === 'formulas' && <FormulaSheetsTab />}
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-6 text-center text-xs transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-500'
            : isSilver
            ? 'bg-slate-900/90 border-slate-800 text-slate-400'
            : 'bg-slate-950/90 border-slate-800/80 text-slate-500'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>MyTutorZA</strong> • Calibrated for South African Department of Basic Education (CAPS) Grades 4–12
          </p>
          <p className="text-[11px]">
            Powered by The Firmament Psychological Engine • 11 Official South African Languages Supported
          </p>
        </div>
      </footer>

      {/* Modals */}
      <OnboardingModal />
      <PasswordRecovery />
      <SettingsModal />
      <TextbookModal />
      <ContactModal />
      <SubscriptionModal open={showSub} onClose={() => setShowSub(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
