import React, { useEffect, useState } from 'react';
import { Lock, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { getSupabaseClient } from '../services/supabase';

/**
 * Handles the Supabase password-recovery redirect.
 * The reset email links to Supabase /verify, which redirects back here with
 * `#access_token=...&type=recovery`. Supabase-js picks the session up, and this
 * component lets the learner choose a new password.
 */
export const PasswordRecovery: React.FC = () => {
  const [active, setActive] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const looksLikeRecovery =
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      (hash.includes('access_token=') && hash.includes('refresh_token='));

    if (looksLikeRecovery) setActive(true);

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setActive(true);
    });
    return () => {
      try {
        data?.subscription?.unsubscribe?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  if (!active) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Password recovery requires Supabase Auth to be configured for this deployment.');
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      // Clear the recovery tokens from the URL.
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: any) {
      setError(err?.message || 'Could not update your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="metallic-card w-full max-w-md rounded-3xl border border-slate-800 p-6 sm:p-8 relative">
        <button
          onClick={() => setActive(false)}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl btn-accent flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black text-white">Choose a new password</h2>
          <p className="text-xs text-slate-400 mt-1">Your reset link was verified.</p>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
              <p className="text-sm font-bold">Password updated</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full btn-accent py-3 rounded-xl font-bold text-sm"
            >
              Continue to MyTutorZA
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {error && (
              <div className="flex items-start gap-2 bg-rose-950/60 border border-rose-800 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-200 leading-snug">{error}</p>
              </div>
            )}
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 characters)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full btn-accent py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
