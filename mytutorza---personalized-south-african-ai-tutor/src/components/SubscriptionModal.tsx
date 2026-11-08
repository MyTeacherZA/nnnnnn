import React, { useEffect, useState } from 'react';
import { X, CreditCard } from 'lucide-react';

export const SubscriptionModal: React.FC<{ open: boolean; onClose: () => void; userId?: string }> = ({ open, onClose, userId }) => {
  const [plans, setPlans] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/billing/paypal/plans').then(r => r.json()).then(setPlans).catch(() => {});
  }, [open]);

  const subscribe = async (planKey: string) => {
    setLoading(true);
    try {
      const r = await fetch('/api/billing/paypal/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, userId }),
      });
      const j = await r.json();
      if (j.approvalUrl) window.location.href = j.approvalUrl;
      else alert(j.error || 'Failed');
    } finally { setLoading(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="metallic-card w-full max-w-lg rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-8 relative">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl btn-accent flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
          <h2 className="text-xl font-black text-white">Subscribe</h2>
        </div>
        <div className="space-y-3">
          {plans && Object.entries(plans.plans || {}).map(([key, p]: any) => (
            <button key={key} disabled={loading} onClick={() => subscribe(key)}
              className="w-full btn-accent py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40">
              {p.label} — {p.price} {p.currency} ({p.cycle})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
