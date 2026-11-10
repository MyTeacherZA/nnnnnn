import React, { useEffect, useState } from 'react';
import { X, Compass } from 'lucide-react';

export type StudySelectionType = 'topic' | 'chapter' | 'semester';

interface StudySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: StudySelectionType, value: string, title?: string) => void;
  subject?: any;
  topics?: string[];
  subtopics?: string[];
}

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4 (Finals)'];

export const StudySelectionModal: React.FC<StudySelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  subject,
  topics = [],
  subtopics = [],
}) => {
  const [type, setType] = useState<StudySelectionType>('topic');
  const [topic, setTopic] = useState('');
  const [chapter, setChapter] = useState('');
  const [term, setTerm] = useState<string>(TERMS[1]);

  useEffect(() => {
    if (isOpen) {
      setType('topic');
      setTopic('');
      setChapter('');
      setTerm(TERMS[1]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const start = () => {
    if (type === 'topic') {
      const value = topic.trim();
      if (!value) return;
      onSelect('topic', value, value);
      return;
    }
    if (type === 'chapter') {
      const value = chapter.trim();
      if (!value) return;
      onSelect('chapter', value, value);
      return;
    }
    onSelect('semester', term, term);
  };

  const topicList = topics.filter((t) => t && t.trim().length > 0);
  const subtopicList = subtopics.filter((t) => t && t.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="metallic-card w-full max-w-lg rounded-3xl p-6 border border-slate-700/60 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">
                What do you want to study?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {subject?.name || 'Your subject'} — pick a focus to start a new study session.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { key: 'topic', label: 'Topic' },
              { key: 'chapter', label: 'Chapter / Subtopic' },
              { key: 'semester', label: 'Semester / Term' },
            ] as { key: StudySelectionType; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setType(opt.key)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                type === opt.key
                  ? 'bg-sky-500/15 border-sky-500/60 text-sky-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {type === 'topic' && (
          <div className="space-y-2">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Choose a topic
            </div>
            {topicList.length === 0 ? (
              <p className="text-xs text-slate-400">No saved topics for this subject yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {topicList.map((t) => (
                  <button
                    key={t}
                    onClick={() => onSelect('topic', t, t)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:border-sky-500/60 hover:text-white transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {type === 'chapter' && (
          <div className="space-y-2">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Choose a chapter / subtopic
            </div>
            {subtopicList.length === 0 ? (
              <p className="text-xs text-slate-400">No saved chapters yet. Start from a topic instead.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {subtopicList.map((t) => (
                  <button
                    key={t}
                    onClick={() => onSelect('chapter', t, t)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:border-sky-500/60 hover:text-white transition-all"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {type === 'semester' && (
          <div className="space-y-2">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Choose a semester / term
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TERMS.map((t) => (
                <button
                  key={t}
                  onClick={() => onSelect('semester', t, t)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    term === t
                      ? 'bg-sky-500/15 border-sky-500/60 text-sky-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={start}
          disabled={type === 'topic' && !topic.trim() || type === 'chapter' && !chapter.trim()}
          className="w-full px-4 py-3 rounded-xl btn-accent text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Compass className="w-4 h-4" />
          <span>Start Study Session</span>
        </button>
      </div>
    </div>
  );
};
