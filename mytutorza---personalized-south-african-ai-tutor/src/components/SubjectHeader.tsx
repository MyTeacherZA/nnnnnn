import React from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageSquare,
  BookOpen,
  FileCheck2,
  Sigma,
  AlertCircle,
  TrendingUp,
  BookMarked,
  Sparkles,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import { AgentTab } from '../types';

export const SubjectHeader: React.FC = () => {
  const {
    activeSubject,
    student,
    activeTab,
    setActiveTab,
    setIsTextbookModalOpen,
    displayMode,
  } = useApp();

  if (!activeSubject) return null;

  const mark = activeSubject.previousTermMark;
  const isRemedial = mark < 60;
  const isLight = displayMode === 'light';
  const isSilver = displayMode === 'normal';

  const tabs: { id: AgentTab; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'tutoring',
      label: 'Tutoring Agent',
      icon: <MessageSquare className="w-4 h-4" />,
      desc: 'Guided Discovery Scaffolding & Conceptual Guidance',
    },
    {
      id: 'study',
      label: 'Study Agent',
      icon: <BookOpen className="w-4 h-4" />,
      desc: 'ATP Syllabus, Spark Notes & Flashcards',
    },
    {
      id: 'roadmap',
      label: 'Study Roadmap',
      icon: <Compass className="w-4 h-4" />,
      desc: '4-Week Firmament Personalized Plan',
    },
    {
      id: 'exam',
      label: 'Exam AI Agent',
      icon: <FileCheck2 className="w-4 h-4" />,
      desc: 'Authentic NSC June & Nov Papers (90% Accuracy)',
    },
    {
      id: 'formulas',
      label: 'Formula Sheets',
      icon: <Sigma className="w-4 h-4" />,
      desc: 'Grades 7–12 Pure Maths & Maths Lit',
    },
  ];

  return (
    <div className="mb-6 space-y-4">
      {/* Top Banner: Subject Info + Case Diagnostic */}
      <div className="metallic-card rounded-2xl p-4 sm:p-6 border border-slate-700/60 shadow-xl relative overflow-hidden">
        {/* Subtle accent border glow indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 accent-gradient-bg" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : isSilver ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {student?.grade || 'Grade 12'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-800 text-sky-400 border-slate-700'
              }`}>
                {activeSubject.category}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-800 text-emerald-400 border-slate-700'
              }`}>
                Language: {activeSubject.tutoringLanguage}
              </span>
            </div>

            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3 ${
              isLight || isSilver ? 'text-slate-900' : 'text-white'
            }`}>
              {activeSubject.name}
            </h1>

            {/* Textbook link line */}
            <div className={`mt-2 flex items-center gap-2 text-xs ${isLight || isSilver ? 'text-slate-500' : 'text-slate-400'}`}>
              <BookMarked className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {activeSubject.textbook ? (
                <span>
                  Aligned Textbook: <strong className={isLight || isSilver ? 'text-slate-900' : 'text-slate-200'}>{activeSubject.textbook.title}</strong>{' '}
                  {activeSubject.textbook.publisher && `(${activeSubject.textbook.publisher})`}
                </span>
              ) : (
                <span>
                  No textbook linked yet.{' '}
                  <button
                    onClick={() => setIsTextbookModalOpen(true)}
                    className="accent-gradient-text font-bold underline ml-1 hover:brightness-125"
                  >
                    Click to link textbook
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Diagnostic Badge / Case Treatment Banner */}
          <div className={`flex items-center gap-3 rounded-2xl p-3 sm:p-4 shrink-0 border ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : isSilver
              ? 'bg-slate-200/80 border-slate-300'
              : 'bg-slate-900/90 border-slate-700/80'
          }`}>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isRemedial
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              {isRemedial ? <AlertCircle className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black ${isLight || isSilver ? 'text-slate-900' : 'text-white'}`}>{mark}%</span>
                <span className="text-xs text-slate-500 font-semibold">{activeSubject.previousTermName}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                    isRemedial
                      ? 'bg-amber-400/20 text-amber-600 dark:text-amber-300'
                      : 'bg-emerald-400/20 text-emerald-600 dark:text-emerald-300'
                  }`}
                >
                  {isRemedial ? 'Remedial Scaffold (Gaps Identified)' : 'Advancement Scaffold'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-tight">
                {isRemedial
                  ? 'AI will support fundamentals, test prerequisites, and reinforce axioms.'
                  : 'AI will present higher-order challenge problems and exam traps.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const activeTabBg = isLight
            ? 'bg-white border-2 border-slate-400 shadow-md text-slate-900'
            : isSilver
            ? 'bg-white border-2 border-slate-400 shadow-md text-slate-900'
            : 'bg-slate-900 border-2 border-slate-600 shadow-xl text-white';

          const inactiveTabBg = isLight
            ? 'bg-slate-50 hover:bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            : isSilver
            ? 'bg-slate-200/70 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-900'
            : 'bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-slate-200';

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col text-left p-3 sm:p-4 rounded-xl transition-all relative overflow-hidden ${
                isActive ? activeTabBg : inactiveTabBg
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 accent-gradient-bg" />
              )}
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`p-1.5 rounded-lg ${
                    isActive ? 'btn-accent text-white' : isLight || isSilver ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.icon}
                </div>
                <span className={`text-sm font-bold ${isActive || isLight || isSilver ? (isLight || isSilver ? 'text-slate-900' : 'text-white') : 'text-slate-300'}`}>
                  {tab.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{tab.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
