import { AiQuota, AiUsageSummary } from '../types';

export interface RawAiUsage {
  calls?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  byAgent?: Record<string, AiUsageAgentBucket>;
}

export interface AiUsageAgentBucket {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface RawAiUsageResponse {
  success?: boolean;
  usage?: RawAiUsage;
  quota?: Partial<AiQuota>;
  agent?: string;
}

export interface AiUsageResult {
  usage: AiUsageSummary;
  quota: AiQuota;
}

const DEFAULT_USAGE: AiUsageSummary = {
  calls: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  costUsd: 0,
  byAgent: {},
};

const DEFAULT_QUOTA: AiQuota = {
  status: 'none',
  enforced: false,
  allowanceTokens: 0,
  usedTokens: 0,
  remainingTokens: 0,
  resetAt: '',
  allowed: true,
};

/**
 * Fetch the learner's AI usage summary + monthly quota.
 * Returns null when the learner has no email or the request fails —
 * client-side metering is non-blocking.
 */
export async function fetchAiUsage(email: string, agent?: string): Promise<AiUsageResult | null> {
  if (!email) return null;
  try {
    const qs = agent ? `&agent=${encodeURIComponent(agent)}` : '';
    const res = await fetch(`/api/ai/usage?email=${encodeURIComponent(email)}${qs}`);
    if (!res.ok) return null;
    const json = (await res.json()) as RawAiUsageResponse;
    const usage: AiUsageSummary = { ...DEFAULT_USAGE, ...(json?.usage || {}) };
    const quota: AiQuota = { ...DEFAULT_QUOTA, ...(json?.quota || {}) };
    return { usage, quota };
  } catch {
    return null;
  }
}

/** True when the backend answered with the AI monthly-quota code. */
export function isAiQuotaExceededPayload(payload: any): boolean {
  return Boolean(payload?.code === 'AI_QUOTA_EXCEEDED') || payload?.quotaExceeded === true;
}

/**
 * Open the subscription modal from anywhere in the workspace when the AI
 * quota has been exhausted server-side (402 AI_QUOTA_EXCEEDED).
 */
export function notifyAiQuotaExceeded(): void {
  try {
    window.dispatchEvent(new CustomEvent('mytutorza:open-subscription'));
  } catch {
    // no-window safety
  }
}

/** True when this AI response means "the learner's AI allowance is gone". */
export function isAiQuotaExceededResponse(response: Response, payload: any): boolean {
  if (response.status === 402) return true;
  return isAiQuotaExceededPayload(payload);
}
