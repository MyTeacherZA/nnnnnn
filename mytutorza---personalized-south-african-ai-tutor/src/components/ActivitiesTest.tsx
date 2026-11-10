import React from 'react';
import { ClipboardCheck, PlayCircle, Check } from 'lucide-react';
import { ActivityTest } from '../types';

interface ActivitiesTestComponentProps {
  tests?: ActivityTest[];
  currentIndex: number;
  onComplete: (score: number, total: number, testIndex: number) => void;
  onExit?: () => void;
}

export const ActivitiesTestComponent: React.FC<ActivitiesTestComponentProps> = ({
  tests,
  currentIndex,
  onComplete,
  onExit,
}) => {
  const test = tests?.[currentIndex];

  if (!test) {
    return (
      <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl text-center">
        <ClipboardCheck className="w-6 h-6 text-slate-400 mx-auto mb-2" />
        <p className="text-xs text-slate-400">No activities or practice tests in this session yet.</p>
        {onExit && (
          <button
            onClick={onExit}
            className="mt-3 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white"
          >
            Back to session
          </button>
        )}
      </div>
    );
  }

  const isPractice = test.kind === 'practice';

  return (
    <div className="metallic-card rounded-2xl p-5 border border-slate-700/60 shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        {isPractice ? (
          <ClipboardCheck className="w-5 h-5 text-amber-400" />
        ) : (
          <PlayCircle className="w-5 h-5 text-emerald-400" />
        )}
        <h3 className="font-black text-sm text-white uppercase tracking-wider">
          {isPractice ? 'Practice Test' : 'Activity'}
        </h3>
      </div>

      <div className="text-xs sm:text-sm font-bold text-white leading-relaxed">{test.prompt}</div>

      {test.instructions && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-300 leading-relaxed">
          {test.instructions}
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
          onClick={() => onComplete(1, 1, currentIndex)}
          className="btn-accent px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>{isPractice ? 'Finish Practice Test' : 'Mark Activity Complete'}</span>
        </button>
      </div>
    </div>
  );
};
