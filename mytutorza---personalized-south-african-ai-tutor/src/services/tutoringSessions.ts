export interface TutoringSessionRecord {
  id: string;
  subject: string;
  grade: string;
  language?: string;
  title?: string;
  topic?: string;
  mode?: 'tutoring' | 'teach' | string;
  pdfName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
  messages?: Array<{ role: string; content: string }>;
}

export async function fetchTutoringSessions(
  email: string | null | undefined,
  mode?: string,
  subject?: string,
): Promise<TutoringSessionRecord[]> {
  if (!email) return [];
  try {
    const params = new URLSearchParams({ email });
    if (mode) params.set('mode', mode);
    if (subject) params.set('subject', subject);
    const res = await fetch(`/api/tutoring/sessions?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const rows: TutoringSessionRecord[] = Array.isArray(data?.sessions) ? data.sessions : [];
    return rows.sort((a, b) => {
      const at = Date.parse(a.updatedAt || a.createdAt || '') || 0;
      const bt = Date.parse(b.updatedAt || b.createdAt || '') || 0;
      return bt - at;
    });
  } catch {
    return [];
  }
}
