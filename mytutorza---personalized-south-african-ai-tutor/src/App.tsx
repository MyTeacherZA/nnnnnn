/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GraduationCap } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { regionalCopy } from './services/l10n';
import { Navbar } from './components/Navbar';
import { SubjectHeader } from './components/SubjectHeader';
import { TutoringAgentTab } from './components/TutoringAgentTab';
import { StudyAgentTab } from './components/StudyAgentTab';
import { StudyRoadmapTab } from './components/StudyRoadmapTab';
import { ExamAgentTab } from './components/ExamAgentTab';
import { FormulaSheetsTab } from './components/FormulaSheetsTab';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { TextbookModal } from './components/TextbookModal';
import { ContactModal } from './components/ContactModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { SubscriptionGate } from './components/SubscriptionGate';
import { PasswordRecovery } from './components/PasswordRecovery';

const AppContent: React.FC = () => {
  const {
    activeTab,
    displayMode,
    hasCompletedOnboarding,
    student,
    isSubscriptionOpen,
    setIsSubscriptionOpen,
    refreshSubscription,
  } = useApp();
  const copy = regionalCopy(student?.country, student?.nation, student?.state);

  // PayPal appends ?paypal=success&subscription_id=... on return. Confirm the
  // subscription server-side so access is granted even if a webhook is delayed.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypal = params.get('paypal');
    if (!paypal) return;

    const subscriptionId =
      params.get('subscription_id') || params.get('subscriptionId') || params.get('ba_token');
    const email = student?.email;

    const cleanUrl = () => {
      params.delete('paypal');
      params.delete('subscription_id');
      params.delete('subscriptionId');
      params.delete('ba_token');
      const qs = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    };

    if (paypal === 'success' && subscriptionId && email) {
      void fetch('/api/billing/paypal/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, email }),
      })
        .then((r) => r.json())
        .catch(() => null)
        .finally(() => {
          void refreshSubscription();
          cleanUrl();
        });
    } else {
      cleanUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.email]);

  // Any agent that receives a 402 can ask the shell to open the paywall.
  React.useEffect(() => {
    const openSubscription = () => setIsSubscriptionOpen(true);
    window.addEventListener('mytutorza:open-subscription', openSubscription);
    return () => window.removeEventListener('mytutorza:open-subscription', openSubscription);
  }, [setIsSubscriptionOpen]);

  const isLight = displayMode === 'light';
  const isSilver = displayMode === 'normal';

  // A brand-new visitor never sees the workspace (or any demo learner).
  // They get a proper landing + the account/onboarding gate.
  if (!hasCompletedOnboarding) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
        <header className="border-b border-slate-800/80">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-sky-400" />
              <span className="text-lg font-black tracking-tight">MyTutorZA</span>
            </div>
            <button
              onClick={() => setIsSubscriptionOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200"
            >
              Plans &amp; pricing
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl text-center">
            <h1 className="text-3xl sm:text-4xl font-black leading-tight">
              A tutor that calibrates to <span className="text-sky-400">how you think</span>.
            </h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Create your account, tell us your grade, subjects and state, then complete the
              24-item “This vs. That” Firmament diagnostic. Your Tutoring, Study and Exam agents
              are then locked to your cognitive profile and your local curriculum standards.
            </p>

            <ul className="mt-6 grid sm:grid-cols-3 gap-3 text-left">
              <li className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-extrabold text-sky-300">Socratic Tutoring</p>
                <p className="text-[11px] text-slate-400 mt-1">Guided discovery — never just the answer.</p>
              </li>
              <li className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-extrabold text-emerald-300">Study &amp; Exam Agents</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Study closes gaps and builds recall; Exam simulates the paper.
                </p>
              </li>
              <li className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-extrabold text-amber-300">The Firmament</p>
                <p className="text-[11px] text-slate-400 mt-1">A per-learner cognitive learning profile.</p>
              </li>
            </ul>

            <p className="text-[11px] text-slate-500 mt-6">
              Sign up below to begin — it takes about 3 minutes.
            </p>
          </div>
        </main>

        <OnboardingModal />
        <PasswordRecovery />
        <SubscriptionModal open={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 font-sans flex flex-col ${
        isLight
          ? 'bg-white text-slate-900'
          : isSilver
          ? 'bg-slate-200 text-slate-900'
          : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Navigation */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Subject Header & 4 Tabs (Tutoring, Study, Exam, Formulas) */}
        <SubjectHeader />

        {/* Tab Views */}
        <div className="mt-6">
          {activeTab === 'tutoring' && (
            <SubscriptionGate>
              <TutoringAgentTab />
            </SubscriptionGate>
          )}
          {activeTab === 'study' && (
            <SubscriptionGate>
              <StudyAgentTab />
            </SubscriptionGate>
          )}
          {activeTab === 'roadmap' && (
            <SubscriptionGate>
              <StudyRoadmapTab />
            </SubscriptionGate>
          )}
          {activeTab === 'exam' && (
            <SubscriptionGate>
              <ExamAgentTab />
            </SubscriptionGate>
          )}
          {activeTab === 'formulas' && <FormulaSheetsTab />}
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-6 text-center text-xs transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-500'
            : isSilver
            ? 'bg-slate-900/90 border-slate-800 text-slate-400'
            : 'bg-slate-950/90 border-slate-800/80 text-slate-500'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            <strong>MyTutorZA</strong> • {copy.footerLine1}
          </p>
          <p className="text-[11px]">{copy.footerLine2}</p>
        </div>
      </footer>

      {/* Modals */}
      <OnboardingModal />
      <PasswordRecovery />
      <SettingsModal />
      <TextbookModal />
      <ContactModal />
      <SubscriptionModal open={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
