import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PersonalizedSparkNotes, OfficialLanguage } from '../types';
import {
  X,
  Sparkles,
  RotateCw,
  Printer,
  Copy,
  Check,
  BrainCircuit,
  AlertTriangle,
  BookOpen,
  Sigma,
  Zap,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Share2,
} from 'lucide-react';
import { saveSparkNotesToSupabase } from '../services/supabase';

interface SparkNotesModalProps {
  notes: PersonalizedSparkNotes | null;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: (focus: string) => void;
  isRegenerating: boolean;
}

export const SparkNotesModal: React.FC<SparkNotesModalProps> = ({
  notes,
  isOpen,
  onClose,
  onRegenerate,
  isRegenerating,
}) => {
  const { student, displayMode } = useApp();
  const [copied, setCopied] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<string>('comprehensive-spark-notes');
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');

  if (!isOpen || !notes) return null;

  const isLight = displayMode === 'light';

  const handleCopy = () => {
    const textToCopy = `
=== ${notes.title} ===
Subject: ${notes.subject} (${notes.grade})
Topic: ${notes.topic}
Generated: ${new Date(notes.createdAt).toLocaleDateString()}

--- EXECUTIVE SUMMARY ---
${notes.summary}

--- HIGH-YIELD SPARK BULLETS ---
${notes.sparkBullets.map((b) => `• ${b}`).join('\n')}

--- DIAGNOSED WEAK SPOTS & CORRECTIONS ---
${notes.weakSpotsIdentified.map((w) => `⚠ Misconception: ${w.misconception}\n✔ Correct Method: ${w.correction}`).join('\n\n')}

--- CORE FORMULAS & RULES ---
${notes.coreFormulasOrRules.map((f) => `• ${f}`).join('\n')}

--- DBE EXAMINER TRAPS ---
${notes.examinerTraps.map((t) => `• ${t}`).join('\n')}

--- COGNITIVE ADVICE (${student?.firmament.lifePath.profile}) ---
${notes.cognitiveAdvice}
`.trim();

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToVault = async () => {
    setSaveStatus('saving');
    setSaveMessage('Syncing to personal study vault...');
    try {
      const result = await saveSparkNotesToSupabase(notes);
      if (result.success) {
        setSaveStatus('saved');
        setSaveMessage('Saved to personal study vault!');
      } else {
        setSaveStatus('error');
        setSaveMessage(result.error || 'Saved locally in study vault');
      }
    } catch (e: any) {
      setSaveStatus('error');
      setSaveMessage(e?.message || 'Saved locally');
    }
    setTimeout(() => {
      setSaveStatus('idle');
      setSaveMessage('');
    }, 3000);
  };

  const currentFlashcard = notes.flashcards?.[activeFlashcardIndex] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div
        className={`w-full max-w-4xl rounded-3xl border shadow-2xl p-5 sm:p-7 relative max-h-[92vh] flex flex-col transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800'
            : 'metallic-card border-slate-700/80 text-slate-100'
        }`}
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/60 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl btn-accent flex items-center justify-center shadow-lg shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">
                  Personalized Spark Notes
                </h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full btn-accent text-white shadow-sm">
                  AI Synthesized
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Auto-Synced to Vault
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Synthesized from {notes.conversationMessageCount} live chat messages • {notes.subject} ({notes.grade})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={handleSaveToVault}
              disabled={saveStatus === 'saving'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Notes are automatically synced to your vault"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Saved!' : 'Auto-Saved'}</span>
            </button>

            <button
              onClick={handleCopy}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Copy Spark Notes to Clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handlePrint}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Print for Offline Study"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Save Status Banner */}
        {saveMessage && (
          <div
            className={`mt-2 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              saveStatus === 'saved'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : saveStatus === 'error'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {/* Regeneration Controls */}
        <div
          className={`my-3 p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-slate-300">Regenerate Analysis with Focus:</span>
            <select
              value={selectedFocus}
              onChange={(e) => setSelectedFocus(e.target.value)}
              className={`px-2.5 py-1.5 rounded-xl font-medium border text-xs focus:outline-none cursor-pointer ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <option value="comprehensive-spark-notes">Comprehensive Guided Discovery Digest</option>
              <option value="examiner-traps-focus">Examiner Traps & Error Elimination</option>
              <option value="formulas-and-rules">Formulas, Theorems & Proofs Only</option>
              <option value="remedial-foundations">Foundational Prerequisite Focus</option>
            </select>
          </div>

          <button
            onClick={() => onRegenerate(selectedFocus)}
            disabled={isRegenerating}
            className="w-full sm:w-auto btn-accent px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-md disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Re-analyzing Conversation...' : 'Regenerate Notes'}</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">
          {/* Executive Summary Card */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 text-xs font-extrabold uppercase tracking-wider text-sky-400">
              <BookOpen className="w-4 h-4" />
              <span>Guided Discovery Session Synthesis</span>
            </div>
            <h3 className="text-base sm:text-lg font-black mb-2">{notes.title}</h3>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">{notes.summary}</p>
          </div>

          {/* High-Yield Spark Bullets */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border ${
              isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-900/90 border-amber-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-wider text-amber-400">
              <Zap className="w-4 h-4" />
              <span>⚡ High-Yield Spark Notes (Revision Bullets)</span>
            </div>
            <div className="space-y-2.5">
              {notes.sparkBullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="flex-1 leading-relaxed">{bullet}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnosed Weak Spots & Misconceptions Corrected */}
          {notes.weakSpotsIdentified && notes.weakSpotsIdentified.length > 0 && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border ${
                isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-900/90 border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-wider text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>🔍 Diagnosed Weak Spots & Corrected Misconceptions</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {notes.weakSpotsIdentified.map((spot, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                      isLight ? 'bg-white border-rose-200' : 'bg-slate-950/70 border-rose-900/50'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-rose-400 block text-[10px] uppercase">
                        ⚠️ Misconception Encountered
                      </span>
                      <p className="text-slate-300 font-medium mt-0.5">{spot.misconception}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-800">
                      <span className="font-bold text-emerald-400 block text-[10px] uppercase">
                        ✔ Corrected Guided Discovery Method
                      </span>
                      <p className="text-slate-200 font-semibold mt-0.5">{spot.correction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-Column Grid: Core Formulas & Examiner Traps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Core Formulas */}
            <div
              className={`p-4 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-wider text-sky-400">
                <Sigma className="w-4 h-4" />
                <span>📐 Core Formulas & CAPS Rules</span>
              </div>
              <div className="space-y-2">
                {notes.coreFormulasOrRules.map((f, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl font-mono text-xs border ${
                      isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800 text-sky-300'
                    }`}
                  >
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Examiner Traps */}
            <div
              className={`p-4 rounded-2xl border ${
                isLight ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-wider text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>⚠️ DBE Examiner Traps</span>
              </div>
              <div className="space-y-2">
                {notes.examinerTraps.map((trap, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl text-xs border ${
                      isLight ? 'bg-white border-amber-200 text-amber-900' : 'bg-slate-950 border-slate-800 text-amber-200/90'
                    }`}
                  >
                    {trap}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Session Flashcards */}
          {notes.flashcards && notes.flashcards.length > 0 && currentFlashcard && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border ${
                isLight ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-900/90 border-indigo-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span>🃏 Session Flashcard Recall Test</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                  <span>Card {activeFlashcardIndex + 1} of {notes.flashcards.length}</span>
                </div>
              </div>

              {/* Flashcard Box */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`min-h-[140px] p-5 rounded-2xl border text-center flex flex-col justify-center items-center cursor-pointer transition-all transform hover:scale-[1.01] ${
                  isFlipped
                    ? 'bg-gradient-to-br from-indigo-950/80 to-slate-900 border-indigo-500/60 text-white'
                    : isLight
                    ? 'bg-white border-indigo-200 text-slate-800 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 block">
                  {isFlipped ? '✔ Answer / Explanation (Click to flip back)' : '❓ Problem / Question (Click to reveal answer)'}
                </span>
                <p className="text-sm sm:text-base font-bold leading-relaxed px-4">
                  {isFlipped ? currentFlashcard.back : currentFlashcard.front}
                </p>
              </div>

              {/* Flashcard Carousel Controls */}
              <div className="flex items-center justify-between mt-3 text-xs">
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setActiveFlashcardIndex((prev) => (prev > 0 ? prev - 1 : notes.flashcards.length - 1));
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  Previous Card
                </button>

                <div className="flex gap-1.5">
                  {notes.flashcards.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsFlipped(false);
                        setActiveFlashcardIndex(idx);
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        idx === activeFlashcardIndex ? 'bg-indigo-500 w-5' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setActiveFlashcardIndex((prev) => (prev < notes.flashcards.length - 1 ? prev + 1 : 0));
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  Next Card
                </button>
              </div>
            </div>
          )}

          {/* Firmament Cognitive Advice Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-900/90 border-emerald-500/30'
            }`}
          >
            <BrainCircuit className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-black text-emerald-400 uppercase tracking-wider block mb-1">
                Firmament Cognitive Vector ({student?.firmament.lifePath.profile})
              </span>
              <p className="leading-relaxed text-slate-300">{notes.cognitiveAdvice}</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between gap-3 shrink-0 text-xs">
          <span className="text-slate-400 hidden sm:inline">
            Personalized spark notes & flashcards are automatically synced to your secure study vault.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="btn-accent px-6 py-2.5 rounded-xl font-bold text-white shadow-md cursor-pointer"
            >
              Done & Return to Tutoring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
