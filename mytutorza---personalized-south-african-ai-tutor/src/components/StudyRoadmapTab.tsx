import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Compass,
  Sparkles,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ArrowRight,
  RotateCw,
  Printer,
  Flame,
  Brain,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  BookOpen,
  FileCheck2,
  CheckSquare,
} from 'lucide-react';
import { StudyRoadmap, RoadmapWeek } from '../types';
import confetti from 'canvas-confetti';

export const StudyRoadmapTab: React.FC = () => {
  const { student, activeSubject, setActiveTab, displayMode } = useApp();

  const isLight = displayMode === 'light';
  const isSilver = displayMode === 'normal';

  const [targetExam, setTargetExam] = useState<string>('Term 2 Mid-Year Exam');
  const [focusTopic, setFocusTopic] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [roadmap, setRoadmap] = useState<StudyRoadmap | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<{ [key: number]: boolean }>({
    1: true,
    2: true,
    3: true,
    4: true,
  });

  // Persisted task completions
  const storageKey = `mytutorza_roadmap_tasks_${activeSubject?.id || 'default'}`;
  const [completedTasks, setCompletedTasks] = useState<{ [taskId: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const fetchRoadmap = async () => {
    if (!activeSubject) return;
    setLoading(true);

    try {
      const response = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: activeSubject.name,
          grade: student?.grade || 'Grade 12',
          firmamentProfile: student?.firmament,
          previousMark: activeSubject.previousTermMark,
          targetExam,
          focusTopic: focusTopic.trim() || undefined,
          language: activeSubject.tutoringLanguage,
          state: student?.state,
          country: student?.country,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      setRoadmap(data);
    } catch (err) {
      console.error('Error fetching roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubject) {
      fetchRoadmap();
    }
  }, [activeSubject?.id, targetExam]);

  // Save task completion
  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const updated = { ...prev, [taskId]: !prev[taskId] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }

      // Check if all tasks in a week or total are completed
      if (!prev[taskId]) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      }

      return updated;
    });
  };

  const toggleWeekExpand = (weekNum: number) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekNum]: !prev[weekNum],
    }));
  };

  // Progress metrics
  const totalTasks = roadmap?.weeks.reduce((acc, w) => acc + w.tasks.length, 0) || 0;
  const finishedTasksCount = roadmap?.weeks.reduce((acc, w) => {
    return acc + w.tasks.filter((t) => completedTasks[t.id]).length;
  }, 0) || 0;
  const progressPercent = totalTasks > 0 ? Math.round((finishedTasksCount / totalTasks) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  const mark = activeSubject?.previousTermMark || 50;
  const isRemedial = mark < 60;

  return (
    <div className="space-y-6">
      {/* Roadmap Header & Strategy Controls */}
      <div className="metallic-card rounded-2xl p-4 sm:p-6 border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 accent-gradient-bg" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider btn-accent text-white flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                The Firmament Engine
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : isSilver ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {student?.grade || 'Grade 12'} • {activeSubject?.name}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isRemedial
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              }`}>
                {isRemedial ? 'Remedial Scaffolding (Baseline: ' + mark + '%)' : 'Advancement Track (Baseline: ' + mark + '%)'}
              </span>
            </div>

            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight || isSilver ? 'text-slate-900' : 'text-white'}`}>
              Personalized 4-Week Study Roadmap
            </h1>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isLight || isSilver ? 'text-slate-600' : 'text-slate-400'}`}>
              Psychometrically tailored to your{' '}
              <strong className={isLight || isSilver ? 'text-slate-900' : 'text-white'}>
                {student?.firmament?.lifePath?.profile || 'The Architect'}
              </strong>{' '}
              profile,{' '}
              <strong className={isLight || isSilver ? 'text-slate-900' : 'text-white'}>
                {student?.firmament?.mercury?.element || 'Air'} Engine
              </strong>{' '}
              pacing cadence, and DBE CAPS ATP milestone timelines.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : isSilver
                  ? 'bg-slate-200 border-slate-300 text-slate-800 hover:bg-slate-300'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title="Print or save PDF of Roadmap"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Print Plan</span>
            </button>

            <button
              onClick={fetchRoadmap}
              disabled={loading}
              className="btn-accent px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-lg disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Recalibrating...' : 'Regenerate Plan'}</span>
            </button>
          </div>
        </div>

        {/* Filter / Focus Customizer Bar */}
        <div className={`mt-5 pt-4 border-t flex flex-col md:flex-row items-stretch md:items-center gap-3 ${
          isLight ? 'border-slate-200' : isSilver ? 'border-slate-300' : 'border-slate-800'
        }`}>
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
            <div className="w-full sm:w-auto flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Target Milestone:
              </label>
              <select
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : isSilver
                    ? 'bg-slate-200 border-slate-300 text-slate-900'
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <option value="Term 2 Mid-Year Exam">Term 2 Mid-Year Exam</option>
                <option value="Term 3 Trial/Preparatory">Term 3 Trial / Preparatory</option>
                <option value="November Final Exam">November Final Exam (NSC)</option>
                <option value="Term 1 Control Test">Term 1 Control Test</option>
                <option value="General CAPS Catch-Up">General CAPS Catch-Up Plan</option>
              </select>
            </div>

            <div className="w-full flex-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Optional topic focus (e.g. Calculus & Functions, Organic Chemistry, Trigonometry)..."
                value={focusTopic}
                onChange={(e) => setFocusTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRoadmap()}
                className={`w-full text-xs rounded-lg px-3 py-1.5 border focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'
                    : isSilver
                    ? 'bg-slate-200 border-slate-300 text-slate-900 focus:border-slate-500'
                    : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-slate-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Firmament Synthesis & Progress Dashboard */}
      {roadmap && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Archetype & Cognitive Profile Card */}
          <div className={`p-4 rounded-xl border relative overflow-hidden ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : isSilver
              ? 'bg-slate-200/80 border-slate-300'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg btn-accent flex items-center justify-center text-xs font-black text-white">
                {roadmap.firmamentSummary.lifePathNumber}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cognitive Profile Archetype</p>
                <h2 className={`text-sm font-black ${isLight || isSilver ? 'text-slate-900' : 'text-white'}`}>
                  {roadmap.firmamentSummary.profile}
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-snug line-clamp-2">
              {student?.firmament?.lifePath?.description || 'Strategic problem solver with high structural acumen.'}
            </p>
          </div>

          {/* Processing Engine Engine Pacing */}
          <div className={`p-4 rounded-xl border relative overflow-hidden ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : isSilver
              ? 'bg-slate-200/80 border-slate-300'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processing Engine Rhythm</p>
                <h2 className={`text-sm font-black ${isLight || isSilver ? 'text-slate-900' : 'text-white'}`}>
                  {roadmap.firmamentSummary.mercuryElement} Engine
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-snug line-clamp-2">
              {roadmap.firmamentSummary.pacingStrategy}
            </p>
          </div>

          {/* Cognitive Modality */}
          <div className={`p-4 rounded-xl border relative overflow-hidden ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : isSilver
              ? 'bg-slate-200/80 border-slate-300'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-500 border border-sky-500/30 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cognitive Modality</p>
                <h2 className={`text-sm font-black ${isLight || isSilver ? 'text-slate-900' : 'text-white'}`}>
                  {roadmap.firmamentSummary.primaryModality} Vector
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-snug line-clamp-2">
              {student?.firmament?.cognitiveVector?.southAfricanAnalogySet || 'South African engineering & systemic models'}
            </p>
          </div>

          {/* 4-Week Progress Tracking */}
          <div className={`p-4 rounded-xl border relative overflow-hidden ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : isSilver
              ? 'bg-slate-200/80 border-slate-300'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4-Week Completion</span>
              </div>
              <span className={`text-xs font-black ${progressPercent === 100 ? 'text-emerald-500' : ''}`}>
                {finishedTasksCount} / {totalTasks} Tasks
              </span>
            </div>

            <div className="w-full bg-slate-700/30 rounded-full h-2.5 overflow-hidden mb-1.5">
              <div
                className="accent-gradient-bg h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-extrabold text-slate-400">{progressPercent}% Completed</span>
              {progressPercent === 100 && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Fully Prepared!
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Key Advice & Ground Rules */}
      {roadmap && roadmap.keyAdvice && roadmap.keyAdvice.length > 0 && (
        <div className={`p-4 rounded-xl border ${
          isLight
            ? 'bg-sky-50/70 border-sky-200 text-sky-950'
            : isSilver
            ? 'bg-sky-100/70 border-sky-300 text-sky-950'
            : 'bg-sky-950/20 border-sky-800/40 text-sky-200'
        }`}>
          <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <Sparkles className="w-4 h-4" />
            <span>Firmament Master Guidance For This 4-Week Block</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {roadmap.keyAdvice.map((advice, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="font-bold text-sky-500 shrink-0">•</span>
                <span>{advice}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && !roadmap && (
        <div className="metallic-card rounded-2xl p-12 text-center border border-slate-700/60 shadow-xl space-y-4">
          <RotateCw className="w-10 h-10 animate-spin mx-auto text-sky-500" />
          <h2 className="text-lg font-bold">Synthesizing Firmament Study Roadmap...</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Calibrating South African CAPS curriculum sequences, examiner traps, and your psychological learning rhythm for {activeSubject?.name}.
          </p>
        </div>
      )}

      {/* 4 Weeks Roadmap Cards */}
      {roadmap && (
        <div className="space-y-4">
          {roadmap.weeks.map((week) => {
            const isExpanded = !!expandedWeeks[week.weekNumber];
            const weekTasks = week.tasks || [];
            const completedInWeek = weekTasks.filter((t) => completedTasks[t.id]).length;
            const isWeekDone = weekTasks.length > 0 && completedInWeek === weekTasks.length;

            return (
              <div
                key={week.weekNumber}
                className={`metallic-card rounded-2xl border transition-all overflow-hidden ${
                  isWeekDone
                    ? 'border-emerald-500/50 shadow-emerald-500/5'
                    : isLight
                    ? 'border-slate-300 bg-white shadow-md'
                    : isSilver
                    ? 'border-slate-300 bg-slate-100 shadow-md'
                    : 'border-slate-800 bg-slate-900/60 shadow-xl'
                }`}
              >
                {/* Week Header Banner */}
                <div
                  onClick={() => toggleWeekExpand(week.weekNumber)}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
                    isLight ? 'hover:bg-slate-50' : isSilver ? 'hover:bg-slate-200/50' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Week Number Badge */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm shadow-md ${
                        isWeekDone
                          ? 'bg-emerald-500 text-white'
                          : 'btn-accent text-white'
                      }`}
                    >
                      {isWeekDone ? <CheckCircle2 className="w-5 h-5" /> : `W${week.weekNumber}`}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400 tracking-wider">
                          {week.atpFocus}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ~{week.estimatedHours} hrs study time
                        </span>
                      </div>
                      <h3 className={`text-base sm:text-lg font-black tracking-tight ${
                        isLight || isSilver ? 'text-slate-900' : 'text-white'
                      }`}>
                        {week.theme}
                      </h3>
                    </div>
                  </div>

                  {/* Right Header Status & Toggle */}
                  <div className="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-700/40">
                    <div className="text-right">
                      <span className={`text-xs font-bold ${isWeekDone ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {completedInWeek} / {weekTasks.length} Milestones
                      </span>
                    </div>

                    <div className={`p-1.5 rounded-lg ${isLight || isSilver ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className={`p-4 sm:p-6 border-t space-y-6 ${
                    isLight ? 'border-slate-200 bg-slate-50/50' : isSilver ? 'border-slate-300 bg-slate-200/30' : 'border-slate-800 bg-slate-950/40'
                  }`}>
                    {/* Topic Pills & Processing Engine note */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                          Key CAPS Topics:
                        </span>
                        {week.topics.map((t, idx) => (
                          <span
                            key={idx}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              isLight
                                ? 'bg-white text-slate-800 border-slate-300'
                                : isSilver
                                ? 'bg-white text-slate-800 border-slate-300'
                                : 'bg-slate-800 text-slate-200 border-slate-700'
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
                        isLight
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : isSilver
                          ? 'bg-amber-100 border-amber-300 text-amber-900'
                          : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                      }`}>
                        <Flame className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold">{week.mercuryRhythmNotes}</span>
                      </div>
                    </div>

                    {/* Interactive Tasks / Milestones Grid */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                        <span>Structured Weekly Milestones & Cognitive Execution:</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {weekTasks.map((task) => {
                          const isDone = !!completedTasks[task.id];

                          return (
                            <div
                              key={task.id}
                              onClick={() => toggleTask(task.id)}
                              className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 relative ${
                                isDone
                                  ? isLight
                                    ? 'bg-emerald-50/70 border-emerald-300 text-slate-800'
                                    : isSilver
                                    ? 'bg-emerald-100/70 border-emerald-300 text-slate-800'
                                    : 'bg-emerald-950/20 border-emerald-800/50 text-slate-200'
                                  : isLight
                                  ? 'bg-white border-slate-200 hover:border-slate-300'
                                  : isSilver
                                  ? 'bg-white border-slate-300 hover:border-slate-400'
                                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {/* Checkbox Icon */}
                              <div className="mt-0.5 shrink-0">
                                {isDone ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-500 hover:text-slate-400" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded tracking-wider ${
                                    isDone
                                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                                      : 'bg-slate-500/10 text-slate-500 dark:text-slate-400'
                                  }`}>
                                    {task.dayLabel}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {task.durationMinutes} min
                                  </span>
                                </div>

                                <h5 className={`text-sm font-bold leading-tight mb-1 ${
                                  isDone ? 'line-through text-slate-500' : isLight || isSilver ? 'text-slate-900' : 'text-white'
                                }`}>
                                  {task.title}
                                </h5>

                                <p className={`text-xs leading-relaxed mb-2 ${isLight || isSilver ? 'text-slate-600' : 'text-slate-400'}`}>
                                  {task.description}
                                </p>

                                {/* Cognitive Tip pill */}
                                <div className={`text-[11px] p-2 rounded-lg border leading-tight ${
                                  isLight
                                    ? 'bg-slate-100 border-slate-200 text-slate-700'
                                    : isSilver
                                    ? 'bg-slate-200 border-slate-300 text-slate-800'
                                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                                }`}>
                                  <strong className="text-sky-500">Firmament Strategy:</strong> {task.cognitiveTip}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* DBE Examiner Traps Warning Box */}
                    {week.examinerTraps && week.examinerTraps.length > 0 && (
                      <div className={`p-4 rounded-xl border ${
                        isLight
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : isSilver
                          ? 'bg-rose-100 border-rose-300 text-rose-950'
                          : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2 font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>DBE Examiner Traps & Misconceptions To Avoid In Week {week.weekNumber}</span>
                        </div>
                        <ul className="space-y-1 text-xs">
                          {week.examinerTraps.map((trap, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="font-bold text-rose-500 shrink-0">⚠</span>
                              <span>{trap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Milestone Checkpoint & Seamless Action Launchers */}
                    <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isLight
                        ? 'bg-white border-slate-200 shadow-sm'
                        : isSilver
                        ? 'bg-slate-100 border-slate-300 shadow-sm'
                        : 'bg-slate-900 border-slate-800 shadow-md'
                    }`}>
                      <div className="flex-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5 mb-1">
                          <Award className="w-3.5 h-3.5" />
                          Weekly Mastery Checkpoint:
                        </span>
                        <p className={`text-xs font-semibold ${isLight || isSilver ? 'text-slate-800' : 'text-slate-200'}`}>
                          {week.milestoneCheckpoint}
                        </p>
                      </div>

                      {/* Launch Actions to other tabs */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => setActiveTab('tutoring')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold btn-accent text-white flex items-center gap-1.5 shadow-md hover:brightness-110"
                          title="Guided Discovery Tutoring on this topic"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Ask Tutor</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('study')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                            isLight
                              ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                              : isSilver
                              ? 'bg-slate-200 border-slate-300 text-slate-900 hover:bg-slate-300'
                              : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                          }`}
                          title="View ATP notes and flashcards"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                          <span>Study Notes</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('exam')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                            isLight
                              ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                              : isSilver
                              ? 'bg-slate-200 border-slate-300 text-slate-900 hover:bg-slate-300'
                              : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                          }`}
                          title="Practice exam under NSC timing"
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Exam Paper</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
