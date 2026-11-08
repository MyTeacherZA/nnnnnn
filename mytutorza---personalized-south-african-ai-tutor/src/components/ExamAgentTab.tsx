import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileCheck2,
  Clock,
  Sparkles,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  Printer,
  RotateCw,
  Send,
  Timer,
  Play,
  Pause,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ExamPaper } from '../types';

export const ExamAgentTab: React.FC = () => {
  const { student, activeSubject } = useApp();
  const [examType, setExamType] = useState<'June Mid-Year Exam' | 'November Final Exam' | 'Term 1 Control Test'>('November Final Exam');
  const [duration, setDuration] = useState<number>(60);
  const [topicFocus, setTopicFocus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [examPaper, setExamPaper] = useState<ExamPaper | null>(null);
  const [showMemo, setShowMemo] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3600);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsRemaining]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateExam = async () => {
    if (!activeSubject) return;
    setLoading(true);
    setShowMemo(false);
    setUserAnswers({});
    setSecondsRemaining(duration * 60);
    setIsTimerRunning(false);

    try {
      const response = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: activeSubject.name,
          grade: student?.grade || 'Grade 12',
          examType,
          durationMinutes: duration,
          topic: topicFocus,
          state: student?.state,
          country: student?.country,
          nation: student?.nation,
          term: examType.includes('June') ? 'Term 2' : 'Term 4',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error status ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.sections) && data.sections.length > 0) {
        setExamPaper(data);
      }
    } catch (err) {
      console.warn('Exam fetch fallback triggered:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubject) {
      generateExam();
    }
  }, [activeSubject?.id, examType, duration]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto space-y-6' : 'space-y-6'}>
      <button onClick={() => setIsFullscreen((v) => !v)} className="fixed top-20 right-6 z-50 p-2 rounded-lg bg-slate-800 text-slate-200" title="Toggle full screen">
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
      {/* Top Configuration & Control Panel */}
      <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-sky-400" />
              NSC DBE Exam Simulator (90% Real Paper Accuracy)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly mirrors South African Department of Basic Education Section A, B & C paper geometry.
            </p>
          </div>

          {/* Timer display if paper is ready */}
          {examPaper && (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl">
              <Timer className="w-5 h-5 text-amber-400" />
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none">
                  Exam Timer
                </span>
                <span className="font-mono text-base font-extrabold text-white">
                  {formatTimer(secondsRemaining)}
                </span>
              </div>
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                title={isTimerRunning ? 'Pause Timer' : 'Start Timer'}
              >
                {isTimerRunning ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Exam Type Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Examination Standard
            </label>
            <select
              value={examType}
              onChange={(e: any) => setExamType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
            >
              <option value="November Final Exam">November Final Exam (100% Syllabus)</option>
              <option value="June Mid-Year Exam">June Mid-Year Exam (Terms 1 & 2)</option>
              <option value="Term 1 Control Test">Term 1 Control Test</option>
            </select>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Allocated Time
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
            >
              <option value={30}>30 Minutes (Topic Drill)</option>
              <option value={60}>60 Minutes (Period Test)</option>
              <option value={120}>120 Minutes (Full Standard Paper)</option>
            </select>
          </div>

          {/* Topic Focus Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Optional Topic Focus
            </label>
            <input
              type="text"
              value={topicFocus}
              onChange={(e) => setTopicFocus(e.target.value)}
              placeholder="e.g. Grammar, Calculus, Ratios..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={() => generateExam()}
              disabled={loading}
              className="w-full btn-accent py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <RotateCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
              <span>{loading ? 'Synthesizing...' : 'Generate DBE Paper'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exam Paper View */}
      {examPaper && (
        <div className="metallic-card rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden">
          {/* Official DBE Exam Header Banner */}
          <div className="p-6 sm:p-8 bg-slate-900/95 border-b border-slate-800 text-center relative">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 border border-slate-700 px-3 py-1 rounded-full bg-slate-950">
                REPUBLIC OF SOUTH AFRICA
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMemo(!showMemo)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    showMemo
                      ? 'bg-emerald-500 text-slate-950 shadow-lg'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {showMemo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showMemo ? 'Hide Memorandum' : 'Show Official Memorandum'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  title="Print Exam Paper"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
              NATIONAL SENIOR CERTIFICATE EXAMINATION
            </h1>
            <h2 className="text-lg font-bold accent-gradient-text mt-1">
              {examPaper.subject} - {examPaper.grade}
            </h2>
            <div className="flex justify-center gap-6 mt-3 text-xs font-bold text-slate-400">
              <span>EXAM: {examPaper.examType}</span>
              <span>•</span>
              <span>TIME: {examPaper.durationMinutes} MINUTES</span>
              <span>•</span>
              <span>MARKS: {examPaper.totalMarks}</span>
            </div>

            {/* Official Instructions */}
            {examPaper.instructions && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs text-slate-300 max-w-3xl mx-auto">
                <span className="font-bold text-slate-200 block mb-1">INSTRUCTIONS AND INFORMATION:</span>
                <ol className="list-decimal pl-5 space-y-1">
                  {examPaper.instructions.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Exam Questions by Section */}
          <div className="p-6 sm:p-8 space-y-8">
            {examPaper.sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b-2 border-slate-700">
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                    {section.title}
                  </h3>
                  <span className="text-xs font-extrabold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20">
                    [{section.totalMarks} MARKS]
                  </span>
                </div>

                <div className="space-y-6">
                  {section.questions.map((q) => (
                    <div
                      key={q.id || q.number}
                      className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors"
                    >
                      {/* Question prompt header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="font-mono font-black text-sm text-sky-400 bg-sky-400/10 px-2 py-1 rounded border border-sky-400/20">
                            {q.number}
                          </span>
                          <p className="text-sm font-semibold text-slate-100 leading-relaxed whitespace-pre-line">
                            {q.prompt}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-300 shrink-0 bg-slate-800 px-2 py-1 rounded">
                          ({q.marks})
                        </span>
                      </div>

                      {/* Multiple Choice Options if applicable */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 sm:pl-10">
                          {q.options.map((opt, oIdx) => (
                            <label
                              key={oIdx}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                                userAnswers[q.number] === opt
                                  ? 'bg-sky-500/20 border-sky-500 text-white'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.number}
                                value={opt}
                                checked={userAnswers[q.number] === opt}
                                onChange={() =>
                                  setUserAnswers((prev) => ({ ...prev, [q.number]: opt }))
                                }
                                className="accent-sky-500"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Freeform Answer input for non-MCQ */}
                      {(!q.options || q.options.length === 0) && (
                        <div className="pl-4 sm:pl-10">
                          <textarea
                            rows={3}
                            value={userAnswers[q.number] || ''}
                            onChange={(e) =>
                              setUserAnswers((prev) => ({ ...prev, [q.number]: e.target.value }))
                            }
                            placeholder="Type your working, calculations or answer here..."
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                          />
                        </div>
                      )}

                      {/* Official Memorandum Reveal */}
                      {showMemo && (
                        <div className="mt-4 pt-4 border-t border-slate-800/80 pl-4 sm:pl-10 space-y-3">
                          {/* Solution & Rubric */}
                          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Official Memorandum & Mark Allocation
                            </div>
                            <p className="text-emerald-100 font-mono leading-relaxed whitespace-pre-wrap">
                              {q.solution}
                            </p>
                            <div className="mt-2 text-[11px] text-emerald-300/80 font-mono bg-emerald-900/30 p-2 rounded">
                              <strong>Mark Breakdown:</strong> {q.rubric}
                            </div>
                          </div>

                          {/* Examiner Trap */}
                          {q.examinerTrap && (
                            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                              <div>
                                <strong className="text-amber-300 text-[10px] uppercase tracking-wider block">
                                  Examiner Pitfall Trap:
                                </strong>
                                <span className="text-[11px] leading-tight">{q.examinerTrap}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
