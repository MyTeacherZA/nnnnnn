import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Send,
  Sparkles,
  BrainCircuit,
  Lightbulb,
  Zap,
  Globe2,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  FileText,
  RotateCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ChatMessage, PersonalizedSparkNotes } from '../types';
import { SparkNotesModal } from './SparkNotesModal';
import { getStoredSupabaseConfig, saveSparkNotesToSupabase, getLocalSparkNotes } from '../services/supabase';
import { notifySubscriptionRequired } from '../services/subscription';

export const TutoringAgentTab: React.FC = () => {
  const { student, activeSubject } = useApp();
  const learnerCountry = student?.country || 'US';
  const curriculumLabel =
    learnerCountry === 'UK'
      ? 'the UK national curriculum'
      : learnerCountry === 'ZA'
      ? 'the South African CAPS curriculum'
      : `${student?.state || 'your state'} academic standards`;
  const greeting = learnerCountry === 'ZA' ? 'Sawubona' : 'Hi';
  const openingTopic =
    learnerCountry === 'UK'
      ? 'exam question'
      : learnerCountry === 'ZA'
      ? 'CAPS topic or past paper question'
      : 'standards-aligned problem';

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'ai',
      agent: 'tutoring',
      text: `${greeting} ${student?.fullName || 'Student'}! I am your Guided Discovery AI Tutor for **${activeSubject?.name || 'Mathematics'}** (${student?.grade || 'Grade 12'}).\n\nI am permanently calibrated to your **${student?.firmament.cognitiveScore || student?.firmament.lifePath.profile}** profile under ${curriculumLabel}.\n\n🛡️ **Firmament Guardrail Active:** Generic teaching is disabled. I will never simply give away the final answer or solve problems for you. I will guide you through targeted questions to discover the principle yourself.\n\nBaseline: **${activeSubject?.previousTermMark || 50}%** (${activeSubject?.previousTermMark && activeSubject.previousTermMark < 60 ? 'Remedial Scaffold: We will ensure fundamental concepts are rock-solid first' : 'Advancement Scaffold: Ready for higher-order exam challenges'}).\n\nWhich ${openingTopic} shall we tackle today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [homeworkMode, setHomeworkMode] = useState(false);
  const [askMode, setAskMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Spark Notes Analysis State
  const [activeSparkNotes, setActiveSparkNotes] = useState<PersonalizedSparkNotes | null>(() => {
    const local = getLocalSparkNotes();
    return local[0] || null;
  });
  const [isSparkNotesModalOpen, setIsSparkNotesModalOpen] = useState(false);
  const [isAnalyzingSparkNotes, setIsAnalyzingSparkNotes] = useState(false);
  const [sparkNotesError, setSparkNotesError] = useState<string | null>(null);

  const handleAnalyzeSparkNotes = async (focus: string = 'comprehensive-spark-notes') => {
    if (!activeSubject || messages.length === 0) return;
    setIsAnalyzingSparkNotes(true);
    setSparkNotesError(null);

    const supabaseConfig = getStoredSupabaseConfig();

    try {
      const response = await fetch('/api/tutoring/analyze-spark-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseConfig.jwtToken ? { Authorization: `Bearer ${supabaseConfig.jwtToken}` } : {}),
        },
        body: JSON.stringify({
          email: student?.email,
          conversation: messages,
          subject: activeSubject.name,
          grade: student?.grade,
          firmamentProfile: student?.firmament,
          language: activeSubject.tutoringLanguage,
          focus,
          jwtToken: supabaseConfig.jwtToken,
          supabaseUrl: supabaseConfig.url,
          supabaseAnonKey: supabaseConfig.anonKey,
        }),
      });

      if (notifySubscriptionRequired(response)) return;

      const data = await response.json();
      if (data.sparkNotes) {
        setActiveSparkNotes(data.sparkNotes);
        setIsSparkNotesModalOpen(true);
        // Persist to local & supabase
        await saveSparkNotesToSupabase(data.sparkNotes);
      } else {
        setSparkNotesError(data.error || 'Could not analyze conversation');
      }
    } catch (err: any) {
      console.error('Error analyzing conversation into spark notes:', err);
      setSparkNotesError(err.message || 'Analysis error');
    } finally {
      setIsAnalyzingSparkNotes(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading || !activeSubject) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      agent: 'tutoring',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: activeSubject.tutoringLanguage,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/tutoring/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: student?.email,
          message: query,
          firmamentProfile: student?.firmament,
          subject: activeSubject.name,
          grade: student?.grade,
          previousMark: activeSubject.previousTermMark,
          language: activeSubject.tutoringLanguage,
          state: student?.state,
          country: student?.country,
          nation: student?.nation,
          textbook: activeSubject.textbook,
          homeworkMode,
          askMode,
          history: messages.slice(-5).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (notifySubscriptionRequired(response)) return;

      const data = await response.json();
      const aiReplyText = data.reply || data.error || 'I am ready to help you work through this step-by-step.';

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        agent: 'tutoring',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: activeSubject.tutoringLanguage,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          agent: 'tutoring',
          text: `Let us break down this question: What is the very first definition or formula given in the CAPS guideline for ${activeSubject.name}? Tell me what you remember first.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Help me understand first principles using a real-world South African analogy',
    'Test my pre-requisite knowledge on this topic first',
    'I got stuck on a 5-mark past exam question, guide me step-by-step',
    `Explain the most common DBE examiner traps in ${activeSubject?.name || 'this subject'}`,
  ];

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto' : 'grid grid-cols-1 lg:grid-cols-12 gap-4'}>
      {/* Left Chat Window (9 cols) */}
      <div className="lg:col-span-8 xl:col-span-9 metallic-card rounded-2xl border border-slate-700/60 shadow-2xl flex flex-col h-[650px] overflow-hidden">
        {/* Chat Header */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl btn-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Guided Discovery AI Tutor</h3>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pacing: {student?.firmament.mercury.pacingStyle} • Lang: {activeSubject?.tutoringLanguage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Spark Notes Action Button */}
            <button
              onClick={() => handleAnalyzeSparkNotes()}
              disabled={isAnalyzingSparkNotes || messages.length === 0}
              className="btn-accent px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md disabled:opacity-40 transition-all cursor-pointer"
              title="Analyze full conversation and generate Personalized Spark Notes"
            >
              <Zap className={`w-3.5 h-3.5 ${isAnalyzingSparkNotes ? 'animate-spin' : 'text-amber-300'}`} />
              <span className="hidden sm:inline">
                {isAnalyzingSparkNotes ? 'Analyzing...' : 'Spark Notes'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-black">
                {messages.length}
              </span>
            </button>

            <button
              onClick={() => setHomeworkMode((v) => !v)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${homeworkMode ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
              title="Homework mode"
            >
              Homework
            </button>
            <button
              onClick={() => setAskMode((v) => !v)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-colors ${askMode ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
              title="Ask mode"
            >
              Ask
            </button>
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Toggle full screen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'restart-1',
                    sender: 'ai',
                    agent: 'tutoring',
                    text: `Fresh session started for ${activeSubject?.name}. What question or concept shall we examine first?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
              }}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset Chat"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Proactive Spark Notes Prompt when conversation has 2+ exchanges */}
        {messages.length >= 2 && (
          <div className="px-4 py-2 bg-gradient-to-r from-amber-950/40 via-sky-950/30 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>{messages.length} messages in conversation:</strong> Ready to transform this dialogue into Personalized Spark Notes?
              </span>
            </div>
            <button
              onClick={() => handleAnalyzeSparkNotes()}
              disabled={isAnalyzingSparkNotes}
              className="btn-accent px-2.5 py-1 rounded-lg font-bold text-[11px] text-white shrink-0 cursor-pointer shadow-sm flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>{isAnalyzingSparkNotes ? 'Synthesizing...' : 'Generate Notes'}</span>
            </button>
          </div>
        )}

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                    isUser
                      ? 'btn-accent text-white rounded-br-none shadow-md'
                      : 'bg-slate-900/95 text-slate-100 rounded-bl-none border border-slate-700/80 shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1 text-[11px] opacity-75">
                    <span className="font-bold">
                      {isUser ? student?.fullName || 'You' : 'MyTutorZA Guided Discovery Guide'}
                    </span>
                    <span>{m.timestamp}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-900/90 text-slate-300 rounded-2xl rounded-bl-none p-4 border border-slate-700 text-xs flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>Applying Firmament Guided Discovery Scaffolding...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Suggestions */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
            Suggested:
          </span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat Input & Decorative Send Button */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800 flex gap-2 sm:gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`Ask in ${activeSubject?.tutoringLanguage || 'English'} (e.g. How do I solve first principles without errors?)`}
            className="flex-1 bg-slate-950/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          {/* Decorative Gradient Accent Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="btn-accent px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
            title="Send Message"
          >
            <span className="hidden sm:inline text-xs">Send</span>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Right Cognitive Vector & Case Sidebar (3 cols) */}
      <div className="lg:col-span-4 xl:col-span-3 space-y-4">
        {/* Diagnostic Case Card */}
        <div className="metallic-card rounded-2xl p-4 sm:p-5 border border-slate-700/60 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-sm text-white tracking-wide uppercase">
              Case Treatment Status
            </h3>
          </div>
          <div className="text-xs text-slate-300 space-y-2">
            <p>
              Targeting: <strong className="text-white">{activeSubject?.name}</strong>
            </p>
            <p>
              Baseline: <strong className="text-white">{activeSubject?.previousTermMark}%</strong> ({activeSubject?.previousTermName})
            </p>
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
              {activeSubject && activeSubject.previousTermMark < 60 ? (
                <span>
                  ⚠️ <strong>Remedial protocol engaged:</strong> The AI will avoid cognitive overload, support foundational axioms, and confirm BODMAS/arithmetic prerequisites.
                </span>
              ) : (
                <span>
                  🚀 <strong>Advancement protocol engaged:</strong> The AI will push higher-order reasoning, multi-topic synthesis, and tricky DBE examiner pitfalls.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Personalized Convo Spark Notes Card */}
        <div className="metallic-card rounded-2xl p-4 sm:p-5 border border-slate-700/60 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-black text-xs text-white tracking-wide uppercase">
                Convo Spark Notes
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Auto-Sync
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-tight">
            Turn your dialogue into high-yield CAPS revision notes, diagnosed misconceptions, and flashcards.
          </p>

          <button
            onClick={() => handleAnalyzeSparkNotes()}
            disabled={isAnalyzingSparkNotes || messages.length === 0}
            className="w-full btn-accent py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${isAnalyzingSparkNotes ? 'animate-spin' : 'text-amber-300'}`} />
            <span>{isAnalyzingSparkNotes ? 'Analyzing Dialogue...' : `Analyze Convo (${messages.length} msgs)`}</span>
          </button>

          {activeSparkNotes && (
            <div className="pt-2 border-t border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Latest Generated Note
              </span>
              <button
                onClick={() => setIsSparkNotesModalOpen(true)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-sky-300 font-semibold truncate hover:border-slate-700 transition-colors flex items-center justify-between"
              >
                <span className="truncate">{activeSparkNotes.title}</span>
                <span className="text-[10px] text-slate-400 shrink-0 ml-1">View</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Spark Notes Modal */}
      <SparkNotesModal
        notes={activeSparkNotes}
        isOpen={isSparkNotesModalOpen}
        onClose={() => setIsSparkNotesModalOpen(false)}
        onRegenerate={(focus) => handleAnalyzeSparkNotes(focus)}
        isRegenerating={isAnalyzingSparkNotes}
      />
    </div>
  );
};
