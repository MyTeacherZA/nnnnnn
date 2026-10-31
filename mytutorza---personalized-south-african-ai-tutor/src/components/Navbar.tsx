import React from 'react';
import { useApp } from '../context/AppContext';
import { OFFICIAL_LANGUAGES } from '../data/curriculumData';
import {
  GraduationCap,
  Sparkles,
  BookMarked,
  Settings,
  Brain,
  Globe2,
  Sigma,
  MessageSquareHeart,
  ChevronDown,
  Compass,
  HelpCircle,
} from 'lucide-react';
import { OfficialLanguage } from '../types';

export const Navbar: React.FC = () => {
  const {
    student,
    activeSubject,
    setActiveSubjectId,
    activeTab,
    setActiveTab,
    setIsSettingsOpen,
    setIsTextbookModalOpen,
    setIsContactModalOpen,
    setIsOnboardingOpen,
    updateTutoringLanguageForActiveSubject,
    displayMode,
  } = useApp();

  const isLight = displayMode === 'light';
  const isSilver = displayMode === 'normal';

  const navContainerClass = isLight
    ? 'bg-white/95 border-slate-200 shadow-sm text-slate-900'
    : isSilver
    ? 'bg-slate-100/95 border-slate-300 shadow-md text-slate-900'
    : 'bg-slate-950/85 border-slate-800/80 shadow-lg text-white';

  const pillButtonClass = isLight
    ? 'bg-slate-100 border border-slate-200 hover:border-slate-400 text-slate-700'
    : isSilver
    ? 'bg-slate-200 border border-slate-300 hover:border-slate-400 text-slate-800'
    : 'bg-slate-900/90 border border-slate-700/70 hover:border-slate-500 text-slate-200';

  const selectContainerClass = isLight
    ? 'bg-slate-100 border border-slate-200 text-slate-900'
    : isSilver
    ? 'bg-slate-200 border border-slate-300 text-slate-900'
    : 'bg-slate-900/90 border border-slate-700/60 text-slate-100';

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-200 ${navContainerClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab('tutoring')}>
            <div className="relative">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl btn-accent flex items-center justify-center shadow-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xl sm:text-2xl font-black tracking-tight flex items-center ${isLight || isSilver ? 'text-slate-900' : 'text-white'}`}>
                  MyTutor<span className="accent-gradient-text">ZA</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border border-slate-400/30 bg-slate-500/10 text-slate-500 dark:text-slate-200 tracking-wider">
                  CAPS
                </span>
              </div>
              <p className={`text-[11px] font-medium hidden sm:block ${isLight || isSilver ? 'text-slate-500' : 'text-slate-400'}`}>
                Personalized South African AI Engine
              </p>
            </div>
          </div>

          {/* Subject Switcher Bar */}
          {student && student.subjects.length > 0 && (
            <div className={`hidden lg:flex items-center rounded-xl px-2 py-1 max-w-md ${selectContainerClass}`}>
              <span className="text-xs font-semibold text-slate-400 pl-2 pr-1 uppercase tracking-wider shrink-0">
                Subject:
              </span>
              <div className="relative inline-block w-full">
                <select
                  value={activeSubject?.id || ''}
                  onChange={(e) => setActiveSubjectId(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold py-1 pl-2 pr-8 focus:outline-none cursor-pointer appearance-none truncate"
                >
                  {student.subjects.map((sub) => (
                    <option key={sub.id} value={sub.id} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>
                      {sub.name} ({sub.previousTermMark}% {sub.previousTermName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Language Selector for Active Subject */}
          {activeSubject && (
            <div className={`hidden md:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 ${selectContainerClass}`}>
              <Globe2 className="w-4 h-4 text-sky-500" />
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Language:
              </span>
              <select
                value={activeSubject.tutoringLanguage}
                onChange={(e) => updateTutoringLanguageForActiveSubject(e.target.value as OfficialLanguage)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer appearance-none pr-3"
              >
                {OFFICIAL_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Right Navigation & Action Items */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Textbook button */}
            <button
              onClick={() => setIsTextbookModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm ${pillButtonClass}`}
              title="Lock student textbook into AI Engine"
            >
              <BookMarked className="w-4 h-4 text-amber-500" />
              <span className="hidden xl:inline">
                {activeSubject?.textbook ? 'Textbook Linked' : 'Link Textbook'}
              </span>
            </button>

            {/* Study Roadmap shortcut */}
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                activeTab === 'roadmap'
                  ? 'btn-accent text-white'
                  : pillButtonClass
              }`}
              title="Personalized 4-Week Study Roadmap"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Roadmap</span>
            </button>

            {/* Formula Sheets shortcut */}
            <button
              onClick={() => setActiveTab('formulas')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                activeTab === 'formulas'
                  ? 'btn-accent'
                  : pillButtonClass
              }`}
              title="Mathematics Pure & Maths Lit Formula Sheets"
            >
              <Sigma className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">Formula Sheets</span>
            </button>

            {/* Firmament Profile Badge */}
            {student?.firmament && (
              <button
                onClick={() => setIsOnboardingOpen(true)}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors ${pillButtonClass}`}
                title="The Firmament Cognitive Vector"
              >
                <div className="w-6 h-6 rounded-lg btn-accent flex items-center justify-center text-[11px] font-black">
                  {student.firmament.lifePath.number}
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                    {student.firmament.mercury.element} Engine
                  </p>
                  <p className="text-xs font-extrabold leading-tight">
                    {student.firmament.lifePath.profile}
                  </p>
                </div>
              </button>
            )}

            {/* Contact Us button */}
            <button
              onClick={() => setIsContactModalOpen(true)}
              className={`p-2 sm:px-2.5 sm:py-2 rounded-xl transition-colors ${pillButtonClass}`}
              title="Contact Us & Suggestions"
            >
              <MessageSquareHeart className="w-4 h-4 text-rose-500" />
            </button>

            {/* Help / Tutorial button */}
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl transition-colors ${pillButtonClass}`}
              title="Help & Tutorial"
            >
              <HelpCircle className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-bold hidden sm:inline">Help</span>
            </button>

            {/* Settings button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl btn-accent flex items-center gap-1.5 transition-all"
              title="Settings & Subject Slots & Theme Accent"
            >
              <Settings className="w-4 h-4 text-white" />
              <span className="text-xs font-bold hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>

        {/* Mobile Subject & Language Bar */}
        <div className="flex lg:hidden items-center justify-between pb-3 pt-1 border-t border-slate-800/60 gap-2">
          {student && student.subjects.length > 0 && (
            <div className="flex-1">
              <select
                value={activeSubject?.id || ''}
                onChange={(e) => setActiveSubjectId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 py-1.5 px-2 rounded-lg"
              >
                {student.subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.previousTermMark}%)
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeSubject && (
            <div className="w-36 shrink-0">
              <select
                value={activeSubject.tutoringLanguage}
                onChange={(e) => updateTutoringLanguageForActiveSubject(e.target.value as OfficialLanguage)}
                className="w-full bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 py-1.5 px-2 rounded-lg"
              >
                {OFFICIAL_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
