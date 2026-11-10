import React, { useState } from 'react';
import { Brain, Check, X } from 'lucide-react';
import { MemoryTest } from '../types';

interface MemoryTestComponentProps {
  tests?: MemoryTest[];
  currentIndex: number;
  onComplete: (score: number, total: number, testIndex: number) => void;
  onExit?: () => void;
}

export const MemoryTestComponent: React.FC<MemoryTestComponentProps> = ({
  tests,
  currentIndex,
  onComplete,
  onExit,
}) => {
  const test = tests?.[currentIndex];
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [matchSelections, setMatchSelections] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState(false);

  if (!test) {
    return (
      <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl text-center">
        <Brain className="w-6 h-6 text-slate-400 mx-auto mb-2" />
        <p className="text-xs text-slate-400">No memory tests in this session yet.</p>
        {onExit && (
          <button onClick={onExit} className="mt-3 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white">
            Back to session
          </button>
        )}
      </div>
    );
  }

  const isSpot = test.type === 'spot';
  const pairs = test.pairs || [];
  const answerOptions: string[] = test.options && test.options.length > 0
    ? test.options.filter((o) => typeof o === 'string')
    : test.correctAnswer
      ? [test.correctAnswer]
      : pairs.map((p) => p.answer);

  const allMatched = pairs.every((_, idx) => Boolean(matchSelections[idx]));
  const matchedCount = pairs.filter((_, idx) => matchSelections[idx] === pairs[idx]?.answer).length;
  const score = isSpot
    ? selectedAnswer && selectedAnswer === test.correctAnswer
      ? 1
      : 0
    : allMatched
      ? matchedCount
      : 0;

  const submit = () => {
    onComplete(score, 1, currentIndex);
  };

  const next = () => {
    onComplete(score, 1, currentIndex);
  };

  const handleSelect = (answer: string) => {
    setSelectedAnswer(answer);
    setRevealed(true);
  };

  const handleMatchSelect = (pairIdx: number, answer: string) => {
    setMatchSelections((prev) => ({ ...prev, [pairIdx]: answer }));
    setRevealed(true);
  };

  return (
    <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <h3 className="font-black text-sm text-white uppercase tracking-wider">Memory Test</h3>
        </div>
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {isSpot ? 'Spot the correct answer' : 'Match the answer'}
        </span>
      </div>

      <div className="text-xs sm:text-sm font-bold text-white leading-relaxed">{test.prompt}</div>

      {isSpot ? (
        <div className="space-y-2">
          {answerOptions.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = revealed && option === test.correctAnswer;
            const isWrong = revealed && isSelected && option !== test.correctAnswer;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={revealed}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  isCorrect
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                    : isWrong
                      ? 'border-rose-500/60 bg-rose-500/10 text-rose-100'
                      : isSelected
                        ? 'border-indigo-500/70 bg-indigo-500/10 text-white'
                        : 'border-slate-700 bg-slate-950/40 text-slate-200 hover:border-slate-500'
                }`}
              >
                <span className="font-black mr-1.5">{String.fromCharCode(65 + idx)}.</span>
                {option}
              </button>
            );
          })}
          {revealed && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-300 leading-relaxed">
              <span className="font-bold text-slate-100">Why: </span>
              {test.explanation || 'Recall the underlying concept to protect long-term memory.'}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {pairs.map((pair, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex-1 text-xs font-semibold text-white leading-snug">{pair.prompt}</div>
              <select
                value={matchSelections[idx] || ''}
                onChange={(e) => handleMatchSelect(idx, e.target.value)}
                disabled={revealed}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              >
                <option value="">Select the correct answer…</option>
                {answerOptions.map((o, oi) => (
                  <option key={oi} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {revealed && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-300 leading-relaxed">
              <span className="font-bold text-slate-100">Score: </span>
              {matchedCount}/{pairs.length} matched correctly.
              {test.explanation && (
                <>
                  {' '}
                  <span className="font-bold text-slate-100">Why: </span>
                  {test.explanation}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white"
        >
          Back to session
        </button>
        <button
          onClick={next}
          className="btn-accent px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>{revealed ? 'Continue' : 'Check Answer'}</span>
        </button>
      </div>
      {revealed && isSpot && !isCorrect && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
          <X className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{test.explanation || 'The correct answer was not selected. Review the concept and retry.'}</span>
        </div>
      )}
    </div>
  );
};
