import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowRight,
  AlertTriangle,
  BookOpen,
  BookmarkCheck,
  Brain,
  Check,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Compass,
  FileText,
  Flame,
  Layers,
  Lightbulb,
  Maximize2,
  Minimize2,
  PlusCircle,
  RotateCw,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  PersonalizedSparkNotes,
  StudyNote,
  StudyQuizProgress,
  StudySessionRecord,
} from '../types';
import { SparkNotesModal } from './SparkNotesModal';
import { deleteSparkNoteLocally, fetchUserSparkNotes } from '../services/supabase';
import { notifySubscriptionRequired } from '../services/subscription';
import {
  fetchStudySessions,
  normalizeSessionStudyPack,
  persistLocalStudySession,
  persistSubjectRoadmap,
  postQuizProgress,
  readSubjectRoadmap,
} from '../services/studySessions';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4 (Finals)'];

export const StudyAgentTab: React.FC = () => {
  const { student, activeSubject, setActiveTab, displayMode } = useApp();
  const [viewMode, setViewMode] = useState<'atp-syllabus' | 'conversation-spark-notes'>('atp-syllabus');

  // Study session state. The session intentionally starts with the question
  // "What topic do you want to study?" instead of auto-generating notes.
  const [sessionPromptTopic, setSessionPromptTopic] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 2');
  const [studyNote, setStudyNote] = useState<StudyNote | null>(null);
  const [sessions, setSessions] = useState<StudySessionRecord[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz / recall state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ attempted: number; correct: number; percent: number } | null>(
    null,
  );

  // Flashcards
  const [activeFlashcard, setActiveFlashcard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Conversation Spark Notes state
  const [userSparkNotes, setUserSparkNotes] = useState<PersonalizedSparkNotes[]>([]);
  const [selectedSparkNote, setSelectedSparkNote] = useState<PersonalizedSparkNotes | null>(null);
  const [isSparkNotesModalOpen, setIsSparkNotesModalOpen] = useState(false);
  const [loadingUserNotes, setLoadingUserNotes] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadUserNotes = async () => {
    setLoadingUserNotes(true);
    try {
      const notes = await fetchUserSparkNotes(activeSubject?.name);
      setUserSparkNotes(notes);
    } catch (e) {
      console.error('Failed to load user notes:', e);
    } finally {
      setLoadingUserNotes(false);
    }
  };

  const loadSessions = async () => {
    if (!activeSubject) return;
    setLoadingSessions(true);
    try {
      const rows = await fetchStudySessions(student?.email, activeSubject.name);
      setSessions(rows);
    } catch (e) {
      console.error('Failed to load study sessions:', e);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadUserNotes();
  }, [activeSubject?.id, viewMode]);

  // A new subject means a new study session: show the topic question again.
  useEffect(() => {
    setStudyNote(null);
    setSessionPromptTopic('');
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setError(null);
    loadSessions();
  }, [activeSubject?.id]);

  const roadmap = readSubjectRoadmap(activeSubject?.id) as any;
  const roadmapTopics: string[] = [];
  (Array.isArray(roadmap?.weeks) ? roadmap.weeks : []).forEach((week: any) => {
    (Array.isArray(week?.topics) ? week.topics : []).forEach((topic: string) => {
      if (topic && !roadmapTopics.includes(topic)) roadmapTopics.push(topic);
    });
  });

  const startStudySession = async () => {
    if (!activeSubject) return;
    const targetTopic = sessionPromptTopic.trim();
    if (!targetTopic) {
      setError('Type the topic you want to study, or choose one from your roadmap.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsFlipped(false);
    setActiveFlashcard(0);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);

    const reusableSession = sessions.find(
      (session) =>
        String(session.topic || '').trim().toLowerCase() === targetTopic.toLowerCase() &&
        String(session.term || '') === selectedTerm,
    );
    const reusableSessionId =
      reusableSession?.id && !String(reusableSession.id).startsWith('local_') ? reusableSession.id : undefined;
    const cleanTitle = sessionTitle.trim() || targetTopic;

    try {
      // The Study Agent must receive the learner's live roadmap as standard
      // context. Generate it once if the learner came straight to Study.
      let activeRoadmap = roadmap;
      if (!activeRoadmap) {
        try {
          const roadmapResponse = await fetch('/api/roadmap/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: student?.email,
              subject: activeSubject.name,
              grade: student?.grade || 'Grade 12',
              firmamentProfile: student?.firmament,
              previousMark: activeSubject.previousTermMark,
              targetExam: 'Upcoming assessment',
              focusTopic: targetTopic,
              language: activeSubject.tutoringLanguage,
              state: student?.state,
              country: student?.country,
              nation: student?.nation,
            }),
          });
          if (notifySubscriptionRequired(roadmapResponse)) {
            setLoading(false);
            return;
          }
          if (roadmapResponse.ok) {
            activeRoadmap = await roadmapResponse.json();
            persistSubjectRoadmap(activeSubject.id, activeRoadmap);
          }
        } catch (roadmapError) {
          console.warn('Roadmap context could not be prepared; using curriculum directive.', roadmapError);
        }
      }

      const response = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: student?.email,
          subject: activeSubject.name,
          grade: student?.grade || 'Grade 12',
          topic: targetTopic,
          term: selectedTerm,
          language: activeSubject.tutoringLanguage,
          state: student?.state,
          country: student?.country,
          nation: student?.nation,
          firmamentProfile: student?.firmament,
          roadmap: activeRoadmap,
          sessionId: reusableSessionId,
          title: cleanTitle,
        }),
      });

      if (notifySubscriptionRequired(response)) {
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || `Study pack could not be generated (HTTP ${response.status}).`);
      }

      const data = await response.json();
      const note: StudyNote = {
        id: data.sessionId || `note-${Date.now()}`,
        sessionId: data.sessionId || null,
        subject: activeSubject.name,
        grade: student?.grade || 'Grade 12',
        topic: data.topic || targetTopic,
        title: data.title || cleanTitle,
        term: selectedTerm,
        atpWeek: data.atpWeek || 'Current curriculum sequence',
        summary: data.summary || 'A focused study pack built around your current gaps and recall needs.',
        sessionObjectives: data.sessionObjectives || [],
        sparkNotes: data.sparkNotes || [],
        coreFormulasOrRules: data.coreFormulasOrRules || [],
        flashcards: data.flashcards || [],
        examinerTips: data.examinerTips || [],
        dbeCurriculumFocus: data.dbeCurriculumFocus || '',
        gapDiagnosis: data.gapDiagnosis,
        retrievalPlan: data.retrievalPlan,
        confidenceBuilders: data.confidenceBuilders || [],
        quiz: (Array.isArray(data.quiz) ? data.quiz : []).map((question: any, index: number) => ({
          ...question,
          id: question.id || `q${index + 1}`,
          options: Array.isArray(question.options) ? question.options : [],
          correctIndex: Number(question.correctIndex) || 0,
          explanation: question.explanation || '',
        })),
        nextSession: data.nextSession,
        source: data.source,
      };

      setStudyNote(note);
      persistLocalStudySession(student?.email, {
        id: note.id,
        subject: note.subject,
        grade: note.grade,
        term: note.term,
        topic: note.topic,
        title: note.title || cleanTitle,
        status: 'active',
        study_pack: note,
        quiz: note.quiz || [],
        quiz_progress: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await loadSessions();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'The study session could not be generated. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetStudySession = () => {
    setStudyNote(null);
    setSessionPromptTopic('');
    setSessionTitle('');
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setError(null);
    setIsFlipped(false);
    setActiveFlashcard(0);
  };

  const resumeSession = (session: StudySessionRecord) => {
    const pack = normalizeSessionStudyPack(session);
    if (!pack) {
      setSessionPromptTopic(session.topic);
      setError('This saved session has no study pack yet. Generate it again to continue.');
      return;
    }

    setStudyNote(pack);
    setSelectedTerm(session.term || 'Term 2');
    setSessionPromptTopic(session.topic);
    setSessionTitle(session.title || session.topic || '');
    setError(null);
    setIsFlipped(false);
    setActiveFlashcard(0);

    const progress = session.quiz_progress || {};
    const answers = (progress.answers as Record<string, number>) || {};
    const attempted = Number(progress.attempted) || 0;
    const correct = Number(progress.correct) || 0;
    const quizLength = pack.quiz?.length || 0;
    setQuizAnswers(answers);
    setQuizSubmitted(Boolean(progress.completed) || (quizLength > 0 && attempted >= quizLength));
    setQuizScore(
      attempted > 0
        ? { attempted, correct, percent: Math.round((correct / attempted) * 100) }
        : null,
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitQuiz = async () => {
    const quiz = studyNote?.quiz || [];
    if (!quiz.length) return;

    let correct = 0;
    const wrongSkills: string[] = [];
    quiz.forEach((question) => {
      const answer = quizAnswers[question.id];
      if (answer === undefined) return;
      if (answer === question.correctIndex) correct += 1;
      else if (question.skill) wrongSkills.push(question.skill);
    });

    const attempted = Object.keys(quizAnswers).length;
    const progress: StudyQuizProgress = {
      attempted,
      correct,
      answers: quizAnswers,
      wrongSkills,
      completed: attempted >= quiz.length,
      completedAt: new Date().toISOString(),
    };

    setQuizSubmitted(true);
    setQuizScore({
      attempted,
      correct,
      percent: attempted ? Math.round((correct / attempted) * 100) : 0,
    });

    if (studyNote) {
      persistLocalStudySession(student?.email, {
        id: studyNote.sessionId || studyNote.id,
        subject: studyNote.subject,
        grade: studyNote.grade,
        term: studyNote.term,
        topic: studyNote.topic,
        status: progress.completed ? 'completed' : 'active',
        study_pack: studyNote,
        quiz: quiz,
        quiz_progress: progress,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    await postQuizProgress({
      email: student?.email,
      sessionId: studyNote?.sessionId,
      quizProgress: progress,
    });
    await loadSessions();
  };

  const retakeQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto space-y-6' : 'space-y-6'}>
      <button
        onClick={() => setIsFullscreen((v) => !v)}
        className="fixed top-20 right-6 z-50 p-2 rounded-lg bg-slate-800 text-slate-200"
        title="Toggle full screen"
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      {/* 4-Week Study Roadmap Banner Callout */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
          displayMode === 'light'
            ? 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200 text-slate-800'
            : displayMode === 'normal'
            ? 'bg-gradient-to-r from-slate-200 to-sky-100 border-slate-300 text-slate-900'
            : 'bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border-sky-800/40 text-white'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl btn-accent flex items-center justify-center shrink-0 shadow-lg text-white">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 tracking-wider">
                The Firmament Engine
              </span>
              <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                {student?.grade || 'Grade 12'} • {activeSubject?.name}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black tracking-tight">Personalized 4-Week Study Roadmap</h3>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              Curated day-by-day milestone plan aligned to your{' '}
              {student?.firmament?.lifePath?.profile || 'The Architect'} profile and{' '}
              {student?.firmament?.mercury?.element || 'Air'} pacing.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('roadmap')}
          className="btn-accent px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg shrink-0 w-full sm:w-auto justify-center hover:brightness-110 cursor-pointer"
        >
          <span>Open Study Roadmap</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* View Switcher: Study Sessions vs My Conversation Spark Notes */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('atp-syllabus')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'atp-syllabus' ? 'btn-accent text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Study Sessions</span>
          </button>

          <button
            onClick={() => {
              setViewMode('conversation-spark-notes');
              loadUserNotes();
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              viewMode === 'conversation-spark-notes'
                ? 'btn-accent text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>My Session Spark Notes</span>
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-white/20">
              {userSparkNotes.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 text-xs text-slate-400">
          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium">Quiz progress shared with Tutoring & Exam</span>
        </div>
      </div>

      {viewMode === 'atp-syllabus' && (
        <div className="space-y-6">
          {!studyNote ? (
            <>
              {/* SESSION START: the question is mandatory before any notes. */}
              <div className="metallic-card rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-xl space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
                    <Brain className="w-7 h-7 text-sky-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400">
                      New study session
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                      What topic do you want to study?
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
                      The Study Agent closes knowledge gaps, strengthens long-term memory and rebuilds
                      confidence. Your Firmament profile, curriculum criteria and study roadmap are already
                      in context.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    autoFocus
                    type="text"
                    value={sessionPromptTopic}
                    onChange={(e) => {
                      setSessionPromptTopic(e.target.value);
                      if (error) setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') startStudySession();
                    }}
                    placeholder={`e.g. Quadratic equations, Organic reactions, Financial maths — ${activeSubject?.name || 'your subject'}`}
                    className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />

                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-sm font-bold text-slate-200 focus:outline-none shrink-0"
                  >
                    {TERMS.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={startStudySession}
                    disabled={loading}
                    className="btn-accent px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <RotateCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-white" />
                    )}
                    <span>{loading ? 'Building your pack…' : 'Start Study Session'}</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => {
                    setSessionTitle(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Session title (your choice — anything you like)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {roadmapTopics.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Use a focus from your roadmap</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roadmapTopics.slice(0, 6).map((topic) => (
                        <button
                          key={topic}
                          onClick={() => setSessionPromptTopic(topic)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-semibold text-slate-300 hover:border-sky-500/60 hover:text-white transition-all"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    ['Close gaps', 'Targets the prerequisites and misconceptions blocking progress.', Target],
                    ['Strengthen recall', 'Active recall, flashcards and spaced retrieval built in.', Brain],
                    ['Build confidence', 'Corrective feedback that protects self-belief.', Trophy],
                  ].map(([title, body, Icon]: any) => (
                    <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                      <Icon className="w-4 h-4 text-sky-400 mb-2" />
                      <div className="text-xs font-bold text-white">{title}</div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{body}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SESSION HISTORY */}
              <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Recent Study Sessions</h3>
                  </div>
                  <button
                    onClick={loadSessions}
                    disabled={loadingSessions}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1.5"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {sessions.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No study sessions yet. Your first topic starts the record that the Tutoring, Study and
                    Exam agents will all use.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {sessions.slice(0, 6).map((session) => {
                      const progress = session.quiz_progress || {};
                      const attempted = Number(progress.attempted) || 0;
                      const correct = Number(progress.correct) || 0;
                      const percent = attempted ? Math.round((correct / attempted) * 100) : null;
                      return (
                        <div
                          key={session.id}
                          className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col justify-between gap-3 hover:border-slate-600 transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                {session.term || session.grade}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  session.status === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                }`}
                              >
                                {session.status === 'completed' ? 'Completed' : 'In progress'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white line-clamp-2">{session.title || session.topic}</h4>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              <span>
                                {percent === null
                                  ? 'Quiz not attempted'
                                  : `${correct}/${attempted} correct (${percent}%)`}
                              </span>
                            </div>
                            {session.updated_at && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {new Date(session.updated_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => resumeSession(session)}
                            className="btn-accent w-full px-3 py-2 rounded-lg text-[11px] font-bold text-white flex items-center justify-center gap-1.5"
                          >
                            <span>Resume Session</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* ACTIVE STUDY SESSION HEADER */}
              <div className="metallic-card rounded-2xl p-5 sm:p-6 border border-slate-700/60 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                        Study session active
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                        {studyNote.term} • {studyNote.grade}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight mt-1 break-words">
                      {studyNote.title || studyNote.topic}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 break-words">Studying: {studyNote.topic}</p>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-2">{studyNote.summary}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={resetStudySession}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Study Session</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('tutoring')}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl btn-accent text-xs font-bold text-white flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tutor This Topic</span>
                  </button>
                </div>
              </div>

              {studyNote.sessionObjectives && studyNote.sessionObjectives.length > 0 && (
                <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Today's Objectives</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {studyNote.sessionObjectives.map((objective, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{objective}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  {/* Spark Notes */}
                  <div className="metallic-card rounded-2xl p-6 border border-slate-700/60 shadow-xl">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-black text-white tracking-tight">Spark Notes: High-Yield Insights</h3>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                        {studyNote.atpWeek}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {studyNote.sparkNotes.map((note, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800"
                        >
                          <BookmarkCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                          <span className="text-xs sm:text-sm text-slate-200 leading-snug">{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gap diagnosis */}
                  {studyNote.gapDiagnosis && (
                    <div className="metallic-card rounded-2xl p-6 border border-slate-700/60 shadow-xl">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                        <h3 className="text-lg font-black text-white tracking-tight">Gap Diagnosis</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                            Likely prerequisites
                          </div>
                          <ul className="space-y-1.5">
                            {(studyNote.gapDiagnosis.likelyPrerequisites || []).map((item, idx) => (
                              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-sky-400 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                            Gaps to close
                          </div>
                          <ul className="space-y-1.5">
                            {(studyNote.gapDiagnosis.knowledgeGapsToClose || []).map((item, idx) => (
                              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {(studyNote.gapDiagnosis.commonMisconceptions || []).length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Misconception repairs
                          </div>
                          {studyNote.gapDiagnosis.commonMisconceptions.map((item, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs"
                            >
                              <div className="flex items-start gap-2 text-rose-200">
                                <X className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{item.misconception}</span>
                              </div>
                              <div className="flex items-start gap-2 text-emerald-200 mt-2">
                                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{item.correction}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quiz */}
                  {studyNote.quiz && studyNote.quiz.length > 0 && (
                    <div className="metallic-card rounded-2xl p-6 border border-slate-700/60 shadow-xl">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                          <h3 className="text-lg font-black text-white tracking-tight">Recall Quiz</h3>
                        </div>
                        {quizScore && (
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-slate-200">
                              {quizScore.correct}/{quizScore.attempted} correct ({quizScore.percent}%)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {studyNote.quiz.map((question, qIdx) => {
                          const selected = quizAnswers[question.id];
                          return (
                            <div
                              key={question.id || qIdx}
                              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                            >
                              <div className="text-xs sm:text-sm font-bold text-white leading-relaxed mb-3">
                                {qIdx + 1}. {question.question}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {question.options.map((option, optionIdx) => {
                                  const isSelected = selected === optionIdx;
                                  const isCorrect = quizSubmitted && optionIdx === question.correctIndex;
                                  const isWrong = quizSubmitted && isSelected && optionIdx !== question.correctIndex;
                                  return (
                                    <button
                                      key={optionIdx}
                                      onClick={() =>
                                        !quizSubmitted &&
                                        setQuizAnswers((prev) => ({ ...prev, [question.id]: optionIdx }))
                                      }
                                      disabled={quizSubmitted}
                                      className={`text-left px-3 py-2.5 rounded-lg border text-xs leading-snug transition-all ${
                                        isCorrect
                                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                                          : isWrong
                                          ? 'border-rose-500/60 bg-rose-500/10 text-rose-100'
                                          : isSelected
                                          ? 'border-sky-500/70 bg-sky-500/10 text-white'
                                          : 'border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500'
                                      }`}
                                    >
                                      <span className="font-black mr-1.5">
                                        {String.fromCharCode(65 + optionIdx)}.
                                      </span>
                                      {option}
                                    </button>
                                  );
                                })}
                              </div>

                              {quizSubmitted && (
                                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-300 leading-relaxed">
                                  <span className="font-bold text-slate-100">Why: </span>
                                  {question.explanation}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800">
                        <div className="text-[11px] text-slate-400">
                          Answered {Object.keys(quizAnswers).length} of {studyNote.quiz.length}. Progress is
                          saved and shared with your Tutoring and Exam agents.
                        </div>
                        {!quizSubmitted ? (
                          <button
                            onClick={submitQuiz}
                            disabled={Object.keys(quizAnswers).length === 0}
                            className="btn-accent px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                          >
                            Submit Quiz
                          </button>
                        ) : (
                          <button
                            onClick={retakeQuiz}
                            className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-2"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Retake Quiz</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Core axioms */}
                  <div className="metallic-card rounded-2xl p-6 border border-slate-700/60 shadow-xl">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                      <BookOpen className="w-5 h-5 text-sky-400" />
                      <h3 className="text-lg font-black text-white tracking-tight">
                        Core Axioms, Definitions & Formulas
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {studyNote.coreFormulasOrRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl font-mono text-xs text-sky-200"
                        >
                          <div className="text-[10px] text-slate-400 uppercase font-sans font-bold mb-1">
                            Rule #{idx + 1}
                          </div>
                          {rule}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  {/* Flashcards */}
                  {studyNote.flashcards && studyNote.flashcards.length > 0 && (
                    <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-5 h-5 text-indigo-400" />
                          <h3 className="font-black text-sm text-white uppercase tracking-wider">
                            Interactive Flashcards
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-slate-400">
                          {activeFlashcard + 1} of {studyNote.flashcards.length}
                        </span>
                      </div>

                      <div
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="min-h-[180px] bg-slate-900 border-2 border-slate-700 hover:border-slate-500 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all shadow-inner select-none relative group"
                      >
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-slate-400">
                          <span>{isFlipped ? 'Answer / Solution' : 'Prompt / Concept'}</span>
                          <span className="accent-gradient-text">Click to Flip</span>
                        </div>

                        <div className="text-center py-4">
                          <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
                            {isFlipped
                              ? studyNote.flashcards[activeFlashcard]?.back
                              : studyNote.flashcards[activeFlashcard]?.front}
                          </p>
                        </div>

                        <div className="text-center text-[11px] text-slate-400 font-medium">
                          {isFlipped ? 'Mastered concept' : 'Tap to reveal answer'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 gap-2">
                        <button
                          disabled={activeFlashcard === 0}
                          onClick={() => {
                            setIsFlipped(false);
                            setActiveFlashcard((prev) => Math.max(0, prev - 1));
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30"
                        >
                          Previous
                        </button>
                        <button
                          disabled={activeFlashcard === studyNote.flashcards.length - 1}
                          onClick={() => {
                            setIsFlipped(false);
                            setActiveFlashcard((prev) => Math.min(studyNote.flashcards.length - 1, prev + 1));
                          }}
                          className="flex-1 py-1.5 rounded-lg btn-accent text-xs font-bold text-white disabled:opacity-30"
                        >
                          Next Card
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Retrieval plan */}
                  {studyNote.retrievalPlan && (
                    <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-sky-400" />
                        <h3 className="font-black text-sm text-white uppercase tracking-wider">Recall Plan</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                            Active recall
                          </div>
                          <ul className="space-y-1.5">
                            {(studyNote.retrievalPlan.activeRecallPrompts || []).map((item, idx) => (
                              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-sky-400 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                            Spaced repetition
                          </div>
                          <ul className="space-y-1.5">
                            {(studyNote.retrievalPlan.spacedRepetition || []).map((item, idx) => (
                              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                <Clock className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confidence builders */}
                  {studyNote.confidenceBuilders && studyNote.confidenceBuilders.length > 0 && (
                    <div className="metallic-card rounded-2xl p-5 border border-emerald-700/30 shadow-xl bg-emerald-500/5">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-black text-sm text-white uppercase tracking-wider">
                          Confidence Builders
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {studyNote.confidenceBuilders.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-emerald-100 leading-relaxed">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Examiner tips */}
                  <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-amber-400" />
                      <h3 className="font-black text-sm text-white uppercase tracking-wider">
                        Examiner Traps & Tips
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {studyNote.examinerTips.map((tip, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 leading-snug"
                        >
                          <strong className="block mb-1 text-amber-300 font-bold uppercase tracking-wider text-[10px]">
                            Pitfall Alert #{idx + 1}
                          </strong>
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next session */}
                  {studyNote.nextSession && (
                    <div className="metallic-card rounded-2xl p-5 border border-sky-700/30 shadow-xl bg-sky-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowRight className="w-5 h-5 text-sky-400" />
                        <h3 className="font-black text-sm text-white uppercase tracking-wider">Next Session</h3>
                      </div>
                      <p className="text-xs text-sky-100 leading-relaxed">{studyNote.nextSession}</p>
                    </div>
                  )}

                  {studyNote.dbeCurriculumFocus && (
                    <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <h3 className="font-black text-xs text-white uppercase tracking-wider">
                          Curriculum Focus
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{studyNote.dbeCurriculumFocus}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 2: Conversation Spark Notes Vault (Auto-Synced) */}
      {viewMode === 'conversation-spark-notes' && (
        <div className="space-y-6">
          <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Personalized Conversation Spark Notes Vault</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI-synthesized from your 1-on-1 tutoring dialogues and automatically synced to your secure
                  study vault.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => loadUserNotes()}
                disabled={loadingUserNotes}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                title="Refresh Vault"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingUserNotes ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => setActiveTab('tutoring')}
                className="btn-accent px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Tutoring Chat</span>
              </button>
            </div>
          </div>

          {userSparkNotes.length === 0 ? (
            <div className="metallic-card rounded-3xl p-10 text-center border border-slate-800 space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <Flame className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-white">No Conversation Spark Notes Yet</h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Have a tutoring dialogue with the AI Tutor on any tricky {activeSubject?.name || 'subject'}{' '}
                problem, then click <strong>"Analyze Convo"</strong> to turn your discussion into high-yield
                personalized revision cards, diagnostic tips, and flashcards.
              </p>
              <button
                onClick={() => setActiveTab('tutoring')}
                className="btn-accent px-6 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Start Tutoring Session</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userSparkNotes.map((note) => (
                <div
                  key={note.id}
                  className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl flex flex-col justify-between hover:border-slate-600 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {note.subject} • {note.grade}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white group-hover:text-sky-300 transition-colors line-clamp-2">
                      {note.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{note.summary}</p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {note.sparkBullets && note.sparkBullets.length > 0 && (
                        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                          {note.sparkBullets.length} Key Bullets
                        </span>
                      )}
                      {note.weakSpotsIdentified && note.weakSpotsIdentified.length > 0 && (
                        <span className="text-[10px] bg-rose-950/40 border border-rose-800/40 text-rose-300 px-2 py-0.5 rounded-md">
                          {note.weakSpotsIdentified.length} Misconceptions
                        </span>
                      )}
                      {note.flashcards && (
                        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                          {note.flashcards.length} cards
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        deleteSparkNoteLocally(note.id);
                        loadUserNotes();
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSparkNote(note);
                        setIsSparkNotesModalOpen(true);
                      }}
                      className="btn-accent px-4 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Open Notes</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <SparkNotesModal
        notes={selectedSparkNote}
        isOpen={isSparkNotesModalOpen}
        onClose={() => {
          setIsSparkNotesModalOpen(false);
          setSelectedSparkNote(null);
          loadUserNotes();
        }}
        onRegenerate={() => {
          setIsSparkNotesModalOpen(false);
          setActiveTab('tutoring');
        }}
        isRegenerating={false}
      />
    </div>
  );
};
