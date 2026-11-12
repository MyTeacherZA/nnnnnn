import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, BookMarked, Save, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export const TextbookModal: React.FC = () => {
  const {
    isTextbookModalOpen,
    setIsTextbookModalOpen,
    activeSubject,
    student,
    updateTextbookForActiveSubject,
  } = useApp();

  const [title, setTitle] = useState('');
  const [author1, setAuthor1] = useState('');
  const [author2, setAuthor2] = useState('');
  const [editor, setEditor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (activeSubject?.textbook) {
      setTitle(activeSubject.textbook.title || '');
      setAuthor1(activeSubject.textbook.authors?.[0] || '');
      setAuthor2(activeSubject.textbook.authors?.[1] || '');
      setEditor(activeSubject.textbook.editor || '');
      setPublisher(activeSubject.textbook.publisher || '');
      setYear(activeSubject.textbook.year || '');
    } else {
      setTitle('');
      setAuthor1('');
      setAuthor2('');
      setEditor('');
      setPublisher('');
      setYear('');
    }
  }, [activeSubject?.id, isTextbookModalOpen]);

  if (!isTextbookModalOpen || !activeSubject) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const authors = [author1, author2].filter(Boolean);
    updateTextbookForActiveSubject({
      title,
      authors: authors.length > 0
        ? authors
        : [student?.country === 'UK' ? 'National exam board syllabus' : student?.country === 'US' ? 'State / College Board framework' : 'Department of Basic Education'],
      editor: editor || undefined,
      publisher: publisher || undefined,
      year: year || undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsTextbookModalOpen(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="metallic-card w-full max-w-lg rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 relative">
        <button
          onClick={() => setIsTextbookModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl btn-accent flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Reference Textbook</h2>
            <p className="text-xs text-slate-400">
              Align AI terminology & chapters for <strong className="text-slate-200">{activeSubject.name}</strong>
            </p>
          </div>
        </div>

        {savedSuccess ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-white">Textbook Linked Successfully!</h3>
            <p className="text-xs text-slate-400">
              MyTutorZA will now use this textbook’s terminology, formulas, and chapters.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Textbook Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Platinum English Home Language Grade 12 Learner Book"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Authors (Slots)
              </label>
              <input
                type="text"
                value={author1}
                onChange={(e) => setAuthor1(e.target.value)}
                placeholder="Author Slot 1: e.g. M. Ridge"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <input
                type="text"
                value={author2}
                onChange={(e) => setAuthor2(e.target.value)}
                placeholder="Author Slot 2: e.g. L. Barker"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Editor (Optional)
                </label>
                <input
                  type="text"
                  value={editor}
                  onChange={(e) => setEditor(e.target.value)}
                  placeholder="e.g. J. C. Phillips"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Publisher
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g. Pearson / Allcopy / Via Afrika"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Year
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2024"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              ✨ No need for complex university referencing styles! This provides essential syllabus alignment and nomenclature context to your AI agents.
            </p>

            <button
              type="submit"
              className="w-full btn-accent py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <Save className="w-4 h-4" />
              <span>Save & Align AI Engine</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
