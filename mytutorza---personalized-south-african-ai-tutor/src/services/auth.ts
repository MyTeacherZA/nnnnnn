/**
 * ============================================================================
 * MyTutorZA: Learner Account & Authentication Service
 * ============================================================================
 * Uses Supabase Auth (email + password) whenever the project URL / anon key are
 * configured. When they are not, it falls back to a LOCAL account store so the
 * product still works end-to-end on a fresh deployment.
 *
 * Passwords are NEVER stored in plain text. The local fallback keeps only a
 * salted SHA-256 digest. The local fallback is convenience-grade only — real
 * multi-device security requires Supabase Auth to be configured.
 */

import { StudentAccount } from '../types';
import { getSupabaseClient } from './supabase';

const ACCOUNTS_KEY = 'mytutorza_accounts';
const SESSION_KEY = 'mytutorza_session';

interface LocalAccountRecord {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthResult {
  ok: boolean;
  account?: StudentAccount;
  /** True when the account was created but the user must confirm their email. */
  needsEmailConfirmation?: boolean;
  error?: string;
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** True when Supabase Auth can be used for real, server-side authentication. */
export function isAuthBackendAvailable(): boolean {
  return getSupabaseClient() !== null;
}

// ---------------------------------------------------------------------------
// Hashing helpers (local fallback only)
// ---------------------------------------------------------------------------
function randomSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const payload = `${salt}::${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Non-cryptographic last-resort fallback (insecure contexts only).
  let h = 0;
  for (let i = 0; i < payload.length; i += 1) {
    h = (h << 5) - h + payload.charCodeAt(i);
    h |= 0;
  }
  return `fallback-${h}-${payload.length}`;
}

// ---------------------------------------------------------------------------
// Local account store
// ---------------------------------------------------------------------------
function readLocalAccounts(): LocalAccountRecord[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAccounts(accounts: LocalAccountRecord[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function toAccount(record: LocalAccountRecord): StudentAccount {
  return {
    id: record.id,
    email: record.email,
    phone: record.phone,
    fullName: record.fullName,
    provider: 'local',
    emailConfirmed: true,
    createdAt: record.createdAt,
  };
}

function saveSession(account: StudentAccount): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(account));
}

export function getCurrentAccount(): StudentAccount | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email) return parsed as StudentAccount;
    return null;
  } catch {
    return null;
  }
}

export async function registerAccount(input: SignUpInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();

  if (!fullName) return { ok: false, error: 'Please enter your full name.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (input.password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { full_name: fullName, phone } },
    });

    if (error) {
      const message = /already registered|already exists/i.test(error.message)
        ? 'An account with that email already exists. Try signing in instead.'
        : error.message;
      return { ok: false, error: message };
    }

    const user = data.user;
    if (!user) return { ok: false, error: 'Sign up failed. Please try again.' };

    const account: StudentAccount = {
      id: user.id,
      email,
      phone,
      fullName,
      provider: 'supabase',
      emailConfirmed: !!user.email_confirmed_at || !!data.session,
      createdAt: user.created_at || new Date().toISOString(),
    };

    if (data.session) saveSession(account);
    return { ok: true, account, needsEmailConfirmation: !data.session };
  }

  // ---- Local fallback -----------------------------------------------------
  const accounts = readLocalAccounts();
  if (accounts.some((a) => a.email === email)) {
    return { ok: false, error: 'An account with that email already exists. Try signing in instead.' };
  }

  const salt = randomSalt();
  const record: LocalAccountRecord = {
    id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    email,
    phone,
    fullName,
    passwordHash: await hashPassword(input.password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };

  accounts.push(record);
  writeLocalAccounts(accounts);

  const account = toAccount(record);
  saveSession(account);
  return { ok: true, account };
}

export async function loginAccount(input: SignInInput): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  if (!email || !input.password) {
    return { ok: false, error: 'Enter your email and password.' };
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: input.password,
    });

    if (error || !data.user) {
      return { ok: false, error: 'Incorrect email or password.' };
    }

    const meta: any = data.user.user_metadata || {};
    const account: StudentAccount = {
      id: data.user.id,
      email,
      phone: meta.phone || '',
      fullName: meta.full_name || '',
      provider: 'supabase',
      emailConfirmed: !!data.user.email_confirmed_at,
      createdAt: data.user.created_at || new Date().toISOString(),
    };
    saveSession(account);
    return { ok: true, account };
  }

  // ---- Local fallback -----------------------------------------------------
  const accounts = readLocalAccounts();
  const record = accounts.find((a) => a.email === email);
  if (!record) {
    return { ok: false, error: 'No account found for that email. Please sign up.' };
  }

  const hash = await hashPassword(input.password, record.salt);
  if (hash !== record.passwordHash) {
    return { ok: false, error: 'Incorrect email or password.' };
  }

  const account = toAccount(record);
  saveSession(account);
  return { ok: true, account };
}

export async function logoutAccount(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign-out failed:', err);
    }
  }
  localStorage.removeItem(SESSION_KEY);
}

/** Returns the stored full name for an email (used to recognise returning users). */
export function findAccountNameByEmail(email: string): string | null {
  const normalized = normalizeEmail(email);
  const record = readLocalAccounts().find((a) => a.email === normalized);
  return record ? record.fullName : null;
}


