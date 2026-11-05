import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { THEME_ACCENTS, DBE_ALL_SUBJECTS, OFFICIAL_LANGUAGES, GRADES } from '../data/curriculumData';
import { ThemeAccent, DisplayMode, OfficialLanguage } from '../types';
import {
  X,
  Settings,
  Palette,
  Sun,
  Moon,
  Sparkles,
  User,
  Plus,
  Trash2,
  BookOpen,
  Check,
  MessageSquareHeart,
  Save,
  Percent,
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    setIsContactModalOpen,
    student,
    updateStudentProfile,
    updateSubjectSlot,
    addSubjectSlot,
    removeSubjectSlot,
    themeAccent,
    setThemeAccent,
    displayMode,
    setDisplayMode,
  } = useApp();

  const [activeSettingsTab, setActiveSettingsTab] = useState<'subjects' | 'theme' | 'profile'>('subjects');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectMark, setNewSubjectMark] = useState(55);
  const [newSubjectTerm, setNewSubjectTerm] = useState('Term 2');
  const [newSubjectLang, setNewSubjectLang] = useState<OfficialLanguage>('English');

  const avatarOptions = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  ];

  if (!isSettingsOpen || !student) return null;

  const handleAddSubject = () => {
    if (!newSubjectName) return;
    const matchedCategory = DBE_ALL_SUBJECTS.find((s) => s.name === newSubjectName)?.category || 'Elective';
    addSubjectSlot({
      name: newSubjectName,
      category: matchedCategory as any,
      previousTermMark: Number(newSubjectMark),
      previousTermName: newSubjectTerm,
      tutoringLanguage: newSubjectLang,
    });
    setNewSubjectName('');
    setNewSubjectMark(55);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="metallic-card w-full max-w-4xl rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl btn-accent flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Application Settings</h2>
              <p className="text-xs text-slate-400">
                Manage subject slots, term averages, gradient accents & display theme
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 my-4 border-b border-slate-800/80 pb-3 shrink-0">
          <button
            onClick={() => setActiveSettingsTab('subjects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSettingsTab === 'subjects'
                ? 'btn-accent text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Subject Slots & Marks ({student.subjects.length}/9)
          </button>
          <button
            onClick={() => setActiveSettingsTab('theme')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSettingsTab === 'theme'
                ? 'btn-accent text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Gradient Accents & Theme Mode
          </button>
          <button
            onClick={() => setActiveSettingsTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSettingsTab === 'profile'
                ? 'btn-accent text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            Learner Profile & Avatar
          </button>
        </div>

        {/* Tab 1: SUBJECT SLOTS & PREVIOUS TERM MARKS */}
        {activeSettingsTab === 'subjects' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300">
              💡 <strong>Department of Basic Education CAPS Rule:</strong> Grades 8 to 12 have up to 9 subject slots. Entering your previous term average (e.g. 50% in Term 2) allows the Firmament AI to diagnose gaps and calibrate whether to provide <strong>Remedial Scaffolding</strong> (fundamentals first) or <strong>Advancement Scaffolding</strong> (challenge problems).
            </div>

            {/* List of current subjects */}
            <div className="space-y-3">
              {student.subjects.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        Slot #{idx + 1}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                        {sub.category}
                      </span>
                      {sub.isMandatory && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">
                          Mandatory Core
                        </span>
                      )}
                    </div>
                    <p className="font-extrabold text-sm text-white">{sub.name}</p>
                    {sub.textbook && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Textbook: {sub.textbook.title}
                      </p>
                    )}
                  </div>

                  {/* Mark & Term Edit row */}
                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 font-bold">Mark:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={sub.previousTermMark}
                        onChange={(e) =>
                          updateSubjectSlot(sub.id, { previousTermMark: Number(e.target.value) })
                        }
                        className="w-14 bg-transparent text-sm font-black text-amber-300 text-center focus:outline-none"
                      />
                      <span className="text-xs text-slate-400 font-bold">%</span>
                    </div>

                    <select
                      value={sub.previousTermName}
                      onChange={(e) =>
                        updateSubjectSlot(sub.id, { previousTermName: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none"
                    >
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                      <option value="Term 4">Term 4</option>
                    </select>

                    {student?.country === 'ZA' && (
                    <select
                      value={sub.tutoringLanguage}
                      onChange={(e) =>
                        updateSubjectSlot(sub.id, { tutoringLanguage: e.target.value as OfficialLanguage })
                      }
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none"
                    >
                      {OFFICIAL_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                    )}

                    {!sub.isMandatory && (
                      <button
                        onClick={() => removeSubjectSlot(sub.id)}
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="Remove Subject Slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Subject Slot (if under 9) */}
            {student.subjects.length < 9 && (
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Add New Subject Slot ({9 - student.subjects.length} slots remaining)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    >
                      <option value="">Select Official DBE Subject...</option>
                      {DBE_ALL_SUBJECTS.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Avg % (e.g. 50)"
                      min="0"
                      max="100"
                      value={newSubjectMark}
                      onChange={(e) => setNewSubjectMark(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleAddSubject}
                      disabled={!newSubjectName}
                      className="w-full btn-accent p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Slot</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: GRADIENT ACCENTS & THEME MODE */}
        {activeSettingsTab === 'theme' && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Display Mode (Dark, Light, Normal/Luminous Silver) */}
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                Display Base Mode
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Choose the ambient background atmosphere. Does not override your decorative gradient accents.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setDisplayMode('dark')}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                    displayMode === 'dark'
                      ? 'border-sky-500 bg-slate-950 text-white shadow-xl ring-2 ring-sky-400'
                      : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <Moon className="w-5 h-5 mx-auto mb-1.5 text-sky-400" />
                  <span className="text-xs font-bold block">Dark Screen</span>
                  <span className="text-[10px] text-slate-400">Midnight Slate</span>
                </button>

                <button
                  onClick={() => setDisplayMode('light')}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                    displayMode === 'light'
                      ? 'border-amber-500 bg-white text-slate-900 shadow-xl ring-2 ring-amber-400'
                      : 'border-slate-300 bg-white/90 text-slate-800 hover:border-slate-400'
                  }`}
                >
                  <Sun className="w-5 h-5 mx-auto mb-1.5 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 block">Light Mode</span>
                  <span className="text-[10px] text-slate-600">Pure White Background</span>
                </button>

                <button
                  onClick={() => setDisplayMode('normal')}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                    displayMode === 'normal'
                      ? 'border-indigo-500 bg-slate-200 text-slate-900 shadow-xl ring-2 ring-indigo-400'
                      : 'border-slate-300 bg-slate-200/90 text-slate-800 hover:border-slate-400'
                  }`}
                >
                  <Sparkles className="w-5 h-5 mx-auto mb-1.5 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-900 block">Normal Mode</span>
                  <span className="text-[10px] text-slate-600">Luminous Silver Titanium</span>
                </button>
              </div>
            </div>

            {/* Gradient Accent Selection */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Theme Accent Gradient Colors
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Strict decorative gradient styling. Accents decorate buttons (e.g. Chat Send), outlines, progress indicators and borders without changing the display default background.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {THEME_ACCENTS.map((accent) => {
                  const isSelected = themeAccent === accent.id;
                  return (
                    <button
                      key={accent.id}
                      onClick={() => setThemeAccent(accent.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                        isSelected
                          ? 'border-white bg-slate-900 shadow-xl'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      {/* Gradient swatch preview */}
                      <div
                        className="w-full h-8 rounded-xl mb-2.5 shadow-sm border border-white/20"
                        style={{ background: accent.gradient }}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-white">
                          {accent.name}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: PROFILE & AVATAR */}
        {activeSettingsTab === 'profile' && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Avatar picker */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Choose Profile Avatar
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {avatarOptions.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => updateStudentProfile({ avatar: url })}
                    className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all ${
                      student.avatar === url ? 'border-sky-400 scale-105 shadow-lg' : 'border-slate-700 opacity-60'
                    }`}
                  >
                    <img src={url} alt="avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={student.fullName}
                  onChange={(e) => updateStudentProfile({ fullName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Grade Level
                </label>
                <select
                  value={student.grade}
                  onChange={(e) => updateStudentProfile({ grade: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={student.email}
                  onChange={(e) => updateStudentProfile({ email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={student.dateOfBirth}
                  onChange={(e) => updateStudentProfile({ dateOfBirth: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              setIsSettingsOpen(false);
              setIsContactModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            <MessageSquareHeart className="w-4 h-4 text-rose-400" />
            <span>Contact Us / Suggestions</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(false)}
            className="btn-accent px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Done & Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
