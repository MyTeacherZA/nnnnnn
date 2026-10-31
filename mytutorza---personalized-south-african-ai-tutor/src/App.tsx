/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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

const AppContent: React.FC = () => {
  const { activeTab, displayMode } = useApp();

  const isLight = displayMode === 'light';
  const isSilver = displayMode === 'normal';

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
      <SettingsModal />
      <TextbookModal />
      <ContactModal />
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
