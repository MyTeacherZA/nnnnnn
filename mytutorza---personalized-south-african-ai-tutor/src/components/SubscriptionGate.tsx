import React from 'react';
import { CreditCard, Lock, ShieldCheck, Clock, MessageSquareHeart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { subscriptionBadgeLabel } from '../services/subscription';

/**
 * Gates the paid agents (Tutoring, Study, Roadmap, Exam).
 * While billing is unconfigured the server marks access as unenforced, so
 * nobody is locked out before payments are live.
 */
export const SubscriptionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasAgentAccess, subscription, setIsSubscriptionOpen, setIsContactModalOpen } = useApp();

  if (hasAgentAccess) return <>{children}</>;

  const expired = subscription?.status === 'expired' || subscription?.status === 'cancelled';
  const label = subscriptionBadgeLabel(subscription);

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="metallic-card rounded-3xl border border-slate-700/80 p-6 sm:p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-300 flex items-center justify-center mx-auto">
          {expired ? <Lock className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
        </div>

        <h2 className="text-2xl font-black mt-5">
          {expired ? 'Your access needs renewing' : 'Your trial has ended'}
        </h2>
        <p className="text-sm text-slate-400 mt-3 max-w-xl mx-auto leading-relaxed">
          A MyTutorZA subscription unlocks the Tutoring, Study, Roadmap and Exam agents. Your
          learner profile, Firmament cognitive vector, subjects and progress are all saved — they
          will be waiting the moment you subscribe.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Current status: {label}
        </div>

        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setIsSubscriptionOpen(true)}
            className="btn-accent px-6 py-3 rounded-xl text-sm font-black text-white inline-flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Choose a plan
          </button>
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="px-6 py-3 rounded-xl text-sm font-bold bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-200 inline-flex items-center justify-center gap-2"
          >
            <MessageSquareHeart className="w-4 h-4 text-rose-400" />
            Contact us
          </button>
        </div>

        <p className="text-[11px] text-slate-500 mt-5">
          Formula Sheets remain free. Cancel anytime from your subscription settings.
        </p>
      </div>
    </div>
  );
};
