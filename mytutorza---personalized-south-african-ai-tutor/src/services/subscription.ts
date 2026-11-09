import { SubscriptionAccess, SubscriptionStatus } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

interface RawAccess {
  status?: string;
  active?: boolean;
  enforced?: boolean;
  trialExpiresAt?: string;
  plan?: string;
  provider?: string;
  currentPeriodEnd?: string;
}

const KNOWN: SubscriptionStatus[] = [
  'trial',
  'active',
  'past_due',
  'cancelled',
  'expired',
  'pending',
  'none',
];

function normaliseStatus(value?: string): SubscriptionStatus {
  const status = String(value || '').toLowerCase() as SubscriptionStatus;
  return KNOWN.includes(status) ? status : 'trial';
}

/**
 * Turn a raw DB/API row into the entitlement shape used by the UI.
 * A missing status is treated as a grandfathered trial so older accounts
 * are never locked out while the billing wiring is being rolled out.
 */
export function deriveSubscriptionAccess(raw: RawAccess = {}): SubscriptionAccess {
  const now = Date.now();
  const status = normaliseStatus(raw.status);
  const trialMs = raw.trialExpiresAt ? new Date(raw.trialExpiresAt).getTime() : 0;
  const trialActive = status === 'trial' && (!trialMs || trialMs > now);
  const active =
    typeof raw.active === 'boolean'
      ? raw.active
      : status === 'active' || status === 'past_due' || trialActive;
  const daysLeft = trialMs ? Math.max(0, Math.ceil((trialMs - now) / DAY_MS)) : undefined;

  return {
    status,
    active,
    enforced: raw.enforced !== false,
    trialEndsAt: raw.trialExpiresAt,
    plan: raw.plan,
    provider: raw.provider,
    currentPeriodEnd: raw.currentPeriodEnd,
    daysLeft,
  };
}

/** Read the authoritative entitlement from the server. */
export async function fetchSubscriptionAccess(email: string): Promise<SubscriptionAccess | null> {
  if (!email) return null;
  try {
    const res = await fetch(`/api/billing/status?email=${encodeURIComponent(email)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.access) return deriveSubscriptionAccess(json.access);
    return deriveSubscriptionAccess(json);
  } catch {
    return null;
  }
}

/** Human label for the navbar badge. */
export function subscriptionBadgeLabel(access: SubscriptionAccess | null): string {
  if (!access) return 'Subscribe';
  if (access.status === 'active') return 'Active';
  if (access.status === 'past_due') return 'Payment due';
  if (access.status === 'trial') {
    return access.daysLeft === undefined ? 'Trial' : `Trial · ${access.daysLeft}d`;
  }
  if (access.status === 'pending') return 'Pending';
  return 'Subscribe';
}

/**
 * Agents call this when a request returns 402. It opens the subscription
 * dialog from anywhere in the workspace.
 */
export function notifySubscriptionRequired(response: Response): boolean {
  if (response.status !== 402) return false;
  try {
    window.dispatchEvent(new CustomEvent('mytutorza:open-subscription'));
  } catch {
    // SSR/no-window safety.
  }
  return true;
}
