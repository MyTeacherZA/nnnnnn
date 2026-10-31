import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, MessageSquareHeart, Send, CheckCircle2 } from 'lucide-react';

export const ContactModal: React.FC = () => {
  const { isContactModalOpen, setIsContactModalOpen, student, activeSubject } = useApp();
  const [name, setName] = useState(student?.fullName || '');
  const [email, setEmail] = useState(student?.email || '');
  const [subject, setSubject] = useState(activeSubject?.name || 'General Curriculum Suggestion');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isContactModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          grade: student?.grade,
        }),
      });
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setIsContactModalOpen(false);
        setMessage('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setIsContactModalOpen(false);
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="metallic-card w-full max-w-lg rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 relative">
        <button
          onClick={() => setIsContactModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl btn-accent flex items-center justify-center">
            <MessageSquareHeart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Contact Us & Suggestions</h2>
            <p className="text-xs text-slate-400">
              Share feedback, curriculum suggestions, or request CAPS past papers
            </p>
          </div>
        </div>

        {sentSuccess ? (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-white">Message Delivered!</h3>
            <p className="text-xs text-slate-400">
              Thank you for helping us enrich MyTutorZA for all South African learners.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Subject Focus
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Your Suggestion / Message
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Suggest a new past paper year, report a curriculum nuance, or provide app feedback..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-accent py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Sending...' : 'Send Suggestion'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
