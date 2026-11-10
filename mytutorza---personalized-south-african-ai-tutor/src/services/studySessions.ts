import type {
  StudyNote,
  StudyQuizProgress,
  StudySessionRecord,
} from '../types';

const SESSIONS_KEY = 'mytutorza_study_sessions';

function safeEmail(email?: string | null) {
  return String(email || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}

function readStore(): Record<string, StudySessionRecord[]> {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StudySessionRecord[]>) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(store));
  } catch {
    // Storage can be unavailable in private mode; the server copy is canonical.
  }
}

function fingerprint(session: Pick<StudySessionRecord, 'subject' | 'topic' | 'term'>) {
  return `${String(session.subject || '').trim().toLowerCase()}::${String(session.topic || '')
    .trim()
    .toLowerCase()}::${String(session.term || '').trim().toLowerCase()}`;
}

/** Local fallback so a study session survives refreshes even before Supabase. */
export function loadLocalStudySessions(email?: string | null, subject?: string): StudySessionRecord[] {
  const store = readStore();
  const rows = store[safeEmail(email)] || [];
  return subject ? rows.filter((row) => row.subject === subject) : rows;
}

export function persistLocalStudySession(
  email: string | null | undefined,
  session: StudySessionRecord,
): StudySessionRecord[] {
  const key = safeEmail(email);
  const store = readStore();
  const rows = store[key] || [];
  const mark = fingerprint(session);
  const existingIndex = rows.findIndex(
    (row) => (session.id && row.id === session.id) || fingerprint(row) === mark,
  );

  const normalized: StudySessionRecord = {
    ...session,
    id: session.id || `local_${Date.now()}`,
    updated_at: new Date().toISOString(),
    created_at: session.created_at || new Date().toISOString(),
  };

  if (existingIndex >= 0) rows[existingIndex] = { ...rows[existingIndex], ...normalized };
  else rows.unshift(normalized);
  store[key] = rows.slice(0, 30);
  writeStore(store);
  return store[key];
}

export function mergeStudySessions(
  remote: StudySessionRecord[],
  local: StudySessionRecord[],
): StudySessionRecord[] {
  const byKey = new Map<string, StudySessionRecord>();
  [...remote, ...local].forEach((session) => {
    const key = session.id || fingerprint(session);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, session);
      return;
    }
    const existingTime = Date.parse(existing.updated_at || existing.created_at || '') || 0;
    const nextTime = Date.parse(session.updated_at || session.created_at || '') || 0;
    byKey.set(key, nextTime >= existingTime ? { ...existing, ...session } : { ...session, ...existing });
  });
  const rows = Array.from(byKey.values());
  // A session generated on this device and the same session returned by the
  // server can have different ids; collapse them by subject + topic.
  const byFingerprint = new Map<string, StudySessionRecord>();
  rows.forEach((row) => {
    const key = fingerprint(row);
    const existing = byFingerprint.get(key);
    if (!existing) {
      byFingerprint.set(key, row);
      return;
    }
    const existingIsLocal = String(existing.id || '').startsWith('local_');
    const rowIsLocal = String(row.id || '').startsWith('local_');
    if (rowIsLocal !== existingIsLocal) {
      byFingerprint.set(key, rowIsLocal ? existing : row);
      return;
    }
    const existingTime = Date.parse(existing.updated_at || existing.created_at || '') || 0;
    const rowTime = Date.parse(row.updated_at || row.created_at || '') || 0;
    byFingerprint.set(key, rowTime >= existingTime ? { ...existing, ...row } : { ...row, ...existing });
  });

  return Array.from(byFingerprint.values()).sort((a, b) => {
    const aTime = Date.parse(a.updated_at || a.created_at || '') || 0;
    const bTime = Date.parse(b.updated_at || b.created_at || '') || 0;
    return bTime - aTime;
  });
}

export async function fetchStudySessions(
  email: string | null | undefined,
  subject?: string,
): Promise<StudySessionRecord[]> {
  const local = loadLocalStudySessions(email, subject);
  if (!email) return local;

  try {
    const params = new URLSearchParams({ email });
    if (subject) params.set('subject', subject);
    const response = await fetch(`/api/study/sessions?${params.toString()}`);
    if (!response.ok) return local;
    const payload = await response.json();
    const remote: StudySessionRecord[] = Array.isArray(payload?.sessions) ? payload.sessions : [];
    return mergeStudySessions(remote, local);
  } catch {
    return local;
  }
}

export async function createStudySession(params: {
  email?: string | null;
  subject: string;
  grade: string;
  term?: string;
  topic: string;
  firmamentProfile?: unknown;
  roadmap?: unknown;
}): Promise<string | null> {
  try {
    const response = await fetch('/api/study/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email,
        subject: params.subject,
        grade: params.grade,
        term: params.term,
        topic: params.topic,
        firmamentProfile: params.firmamentProfile,
        roadmap: params.roadmap,
        status: 'active',
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.sessionId || null;
  } catch {
    return null;
  }
}

export async function postQuizProgress(params: {
  email?: string | null;
  sessionId?: string | null;
  quizProgress: StudyQuizProgress;
}): Promise<boolean> {
  if (!params.sessionId || String(params.sessionId).startsWith('local_')) return false;
  try {
    const response = await fetch(`/api/study/sessions/${encodeURIComponent(params.sessionId)}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email,
        quizProgress: params.quizProgress,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * The study agent receives the live 4-week roadmap as standard context. The
 * roadmap tab stores the generated roadmap here; the study tab reads it.
 */
export function readSubjectRoadmap(subjectId?: string | null): unknown {
  if (!subjectId) return null;
  try {
    const raw = localStorage.getItem(`mytutorza_roadmap_${subjectId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistSubjectRoadmap(subjectId: string | undefined | null, roadmap: unknown) {
  if (!subjectId || !roadmap) return;
  try {
    localStorage.setItem(`mytutorza_roadmap_${subjectId}`, JSON.stringify(roadmap));
  } catch {
    // Non-fatal: the study agent will generate from the curriculum directive.
  }
}

export function normalizeSessionStudyPack(session: StudySessionRecord): StudyNote | null {
  if (!session?.study_pack) return null;
  const pack = session.study_pack as StudyNote;
  if (!Array.isArray(pack.sparkNotes) || pack.sparkNotes.length === 0) return null;
  return {
    ...pack,
    id: pack.id || session.id,
    subject: pack.subject || session.subject,
    grade: pack.grade || session.grade,
    topic: pack.topic || session.topic,
    term: pack.term || session.term || '',
    sessionId: session.id,
  };
}
