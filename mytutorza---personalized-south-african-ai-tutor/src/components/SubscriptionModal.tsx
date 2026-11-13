import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  Check,
  AlertTriangle,
  MessageSquareHeart,
  Loader2,
  Gift,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { subscriptionBadgeLabel } from '../services/subscription';

interface Plan {
  planId?: string;
  label: string;
  price: string;
  currency: string;
  cycle: string;
}

interface PlansResponse {
  configured: boolean;
  plans: Record<string, Plan>;
}

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', ZAR: 'R' };

const planName = (key: string, plan: Plan) => {
  if (key.includes('weekly')) return 'Weekly pass';
  if (key.includes('monthly')) return 'Monthly plan';
  return plan.label;
};

/** Internal PayPal plan keys -> which learners should see them first. */
const preferredCurrency = (country?: string) => {
  if (country === 'UK') return 'GBP';
  return 'USD';
};

export const SubscriptionModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { student, account, subscription, refreshSubscription, setIsContactModalOpen } = useApp();
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [referral, setReferral] = useState<{ code: string | null; uses: number; threshold: number; granted: boolean } | null>(null);

  const email = student?.email || account?.email || '';
  const preferred = preferredCurrency(student?.country);

  useEffect(() => {
    if (!open) return;
    setError(null);
    fetch('/api/billing/paypal/plans')
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => setError('Could not load subscription plans. Please try again.'));

    // Pull referral stats for the 30-users-free promotion.
    if (email) {
      fetch('/api/referrals/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
        .then((r) => r.json())
        .then((data) => setReferral({
          code: data?.code ?? null,
          uses: Number(data?.uses ?? 0),
          threshold: Number(data?.threshold ?? 30),
          granted: Boolean(data?.granted),
        }))
        .catch(() => {});
    }
    void refreshSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const orderedPlans = useMemo(() => {
    if (!plans?.plans) return [];
    return Object.entries(plans.plans).sort(([a], [b]) => {
      const aPreferred = a.endsWith(preferred.toLowerCase()) ? -1 : 1;
      const bPreferred = b.endsWith(preferred.toLowerCase()) ? -1 : 1;
      if (aPreferred !== bPreferred) return aPreferred - bPreferred;
      return a.localeCompare(b);
    });
  }, [plans, preferred]);

  const subscribe = async (planKey: string) => {
    setBusyPlan(planKey);
    setError(null);
    try {
      const res = await fetch('/api/billing/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          email,
          userId: student?.id,
          returnUrl: `${window.location.origin}/?paypal=success`,
          cancelUrl: `${window.location.origin}/?paypal=cancel`,
        }),
      });
      const json = await res.json();
      if (json.approvalUrl) {
        window.location.href = json.approvalUrl;
        return;
      }
      setError(json.error || 'Could not start checkout. Please try again.');
    } catch {
      setError('Could not start checkout. Check your connection and try again.');
    } finally {
      setBusyPlan(null);
    }
  };

  if (!open) return null;

  const statusLabel = subscriptionBadgeLabel(subscription);
  const isActive = subscription?.status === 'active';
  const isTrial = subscription?.status === 'trial';
  const paymentsConfigured = plans?.configured !== false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-title"
    >
      <div className="metallic-card w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          aria-label="Close subscription dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl btn-accent flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="subscription-title" className="text-xl sm:text-2xl font-black text-white">
              Unlock your private tutor
            </h2>
            <p className="text-xs text-slate-400">
              One subscription. Tutoring, Study, Roadmap and Exam — anywhere, anytime.
            </p>
          </div>
        </div>

        {/* Current entitlement */}
        <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            {isActive ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Clock className="w-4 h-4 text-amber-400" />
            )}
            Current status: <span className="text-white">{statusLabel}</span>
          </div>
          {isTrial && subscription?.trialEndsAt && (
            <span className="text-xs text-amber-300 font-semibold">
              Ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
            </span>
          )}
          {isActive && subscription?.currentPeriodEnd && (
            <span className="text-xs text-emerald-300 font-semibold">
              Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          )}
        </div>

        <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-300">
          {[
            'Socratic Tutoring agent — guided, never just answers',
            'Study agent — notes, summaries and flashcards',
            'Personalised Study Roadmap',
            'Exam agent — full simulated papers',
            'Bound to your Firmament cognitive profile',
            'US, UK and CAPS curriculum support',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6">
          {!plans ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading plans…
            </div>
          ) : !paymentsConfigured ? (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center">
              <p className="text-sm font-bold text-amber-200">Payments are not switched on yet.</p>
              <p className="text-xs text-amber-100/80 mt-1">
                Your access is currently open. Message us to arrange a plan.
              </p>
              <button
                onClick={() => {
                  onClose();
                  setIsContactModalOpen(true);
                }}
                className="mt-4 px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-200 inline-flex items-center gap-2"
              >
                <MessageSquareHeart className="w-4 h-4 text-rose-400" />
                Contact us
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {orderedPlans.map(([key, plan]) => {
                const symbol = CURRENCY_SYMBOL[plan.currency] || `${plan.currency} `;
                const popular = key.includes('monthly');
                return (
                  <button
                    key={key}
                    disabled={!!busyPlan}
                    onClick={() => subscribe(key)}
                    className={`relative text-left rounded-2xl border p-4 transition-all disabled:opacity-50 ${
                      popular
                        ? 'border-sky-500/60 bg-sky-500/10 hover:border-sky-400'
                        : 'border-slate-700 bg-slate-900/70 hover:border-slate-500'
                    }`}
                  >
                    {popular && (
                      <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-500 text-white">
                        Best value
                      </span>
                    )}
                    <p className="text-xs font-bold text-slate-300">{planName(key, plan)}</p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {symbol}
                      {plan.price}
                      <span className="text-xs font-semibold text-slate-400">
                        {' '}
                        / {plan.cycle === 'weekly' ? 'week' : 'month'}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {plan.currency} · full access · cancel anytime
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-sky-300">
                      {busyPlan === key ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting…
                        </>
                      ) : (
                        'Subscribe'
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Referral promotion: 30-paying-referrals-free-month */}
        {referral && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Refer a friend</p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  30 paying friends on your code → <strong className="text-emerald-300">1 month free</strong>.
                </p>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {referral.granted
                    ? '🎉 Bonus unlocked — your next month is on us.'
                    : `${referral.uses} / ${referral.threshold} paid friends using your code.`}
                </p>
              </div>
            </div>
            {referral.code && (
              <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Your code</span>
                <code className="text-sm font-black tracking-widest text-emerald-200 bg-slate-950 border border-emerald-600/40 rounded-lg px-3 py-1.5">
                  {referral.code}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(referral.code || '').catch(() => {})}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-slate-500 mt-5 text-center">
          Payments are processed securely by PayPal. Your learner profile and progress stay saved
          if you cancel.
        </p>
      </div>
    </div>
  );
};
