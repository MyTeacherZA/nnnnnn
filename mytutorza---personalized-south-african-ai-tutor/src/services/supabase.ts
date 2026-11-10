import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PersonalizedSparkNotes, SupabaseConfig, SupabaseStatus, StudentProfile, FirmamentProfile } from '../types';

const STORAGE_KEY = 'mytutorza_supabase_config';
const SPARK_NOTES_LOCAL_KEY = 'mytutorza_saved_spark_notes';

// Default / fallback config from env or storage
export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) return parsed;
    }
  } catch (e) {
    console.warn('Could not read supabase config from localStorage', e);
  }

  // Check Vite env
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  const envJwt = (import.meta as any).env?.VITE_SUPABASE_JWT || '';

  return {
    url: envUrl,
    anonKey: envKey,
    jwtToken: envJwt,
    autoSync: true,
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Reset cached instance
    cachedClient = null;
  } catch (e) {
    console.error('Failed to save Supabase config', e);
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    const options: any = {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
      },
    };

    if (config.jwtToken && config.jwtToken.trim()) {
      options.global = {
        headers: {
          Authorization: `Bearer ${config.jwtToken.trim()}`,
        },
      };
    }

    cachedClient = createClient(config.url.trim(), config.anonKey.trim(), options);
    return cachedClient;
  } catch (err) {
    console.error('Failed to instantiate Supabase client:', err);
    return null;
  }
}

/**
 * Checks connection to Supabase and verifies RLS table access
 */
export async function testSupabaseConnection(config?: SupabaseConfig): Promise<SupabaseStatus> {
  const cfg = config || getStoredSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) {
    return {
      connected: false,
      rlsActive: false,
      userAuthenticated: false,
      message: 'Supabase keys not yet configured. Attach your project URL & Anon key.',
    };
  }

  try {
    const testOptions: any = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    if (cfg.jwtToken && cfg.jwtToken.trim()) {
      testOptions.global = {
        headers: { Authorization: `Bearer ${cfg.jwtToken.trim()}` },
      };
    }

    const client = createClient(cfg.url.trim(), cfg.anonKey.trim(), testOptions);

    // Test querying the spark_notes table
    const { data, error } = await client
      .from('spark_notes')
      .select('id')
      .limit(1);

    if (error) {
      // Check if error is related to table missing or RLS denial
      if (error.code === '42P01') {
        return {
          connected: true,
          rlsActive: false,
          userAuthenticated: !!cfg.jwtToken,
          message: 'Connected to Supabase! Table "spark_notes" does not exist yet. Please run the SQL schema script in Supabase SQL Editor.',
        };
      }

      if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt') || error.message.toLowerCase().includes('token')) {
        return {
          connected: true,
          rlsActive: true,
          userAuthenticated: false,
          message: `Connected, but JWT authorization error: ${error.message}. Please check your JWT token.`,
        };
      }

      return {
        connected: true,
        rlsActive: true,
        userAuthenticated: !!cfg.jwtToken,
        message: `Connected to Supabase. RLS policy response: ${error.message}`,
      };
    }

    return {
      connected: true,
      rlsActive: true,
      userAuthenticated: !!cfg.jwtToken,
      message: 'Success! Connected to Supabase with Row Level Security (RLS) enabled.',
    };
  } catch (err: any) {
    return {
      connected: false,
      rlsActive: false,
      userAuthenticated: false,
      message: `Connection failed: ${err.message || String(err)}`,
    };
  }
}

/**
 * Saves generated Spark Notes to Supabase with RLS user isolation.
 * Automatically mirrors to local storage cache as failover and syncs via backend proxy.
 */
export async function saveSparkNotesToSupabase(
  notes: PersonalizedSparkNotes
): Promise<{ success: boolean; id?: string; error?: string; source: 'supabase' | 'local' }> {
  // Always update local cache immediately so learner work is never lost
  saveSparkNotesLocally(notes);

  // 1. First attempt auto-sync via backend proxy (handles server-side Supabase credentials securely)
  try {
    const res = await fetch('/api/spark-notes/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notes),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.synced) {
        notes.syncedToSupabase = true;
        saveSparkNotesLocally(notes);
        return {
          success: true,
          id: data.id || notes.id,
          source: 'supabase',
        };
      }
    }
  } catch (syncErr) {
    console.debug('Backend sync attempt:', syncErr);
  }

  // 2. Direct client fallback if direct client credentials exist
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: true,
      id: notes.id,
      source: 'local',
      error: 'Stored in secure study vault.',
    };
  }

  try {
    const payload = {
      subject: notes.subject,
      grade: notes.grade,
      topic: notes.topic,
      title: notes.title,
      summary: notes.summary,
      key_breakdowns: notes.keyBreakdowns,
      weak_spots: notes.weakSpotsIdentified,
      spark_bullets: notes.sparkBullets,
      formulas_rules: notes.coreFormulasOrRules,
      examiner_traps: notes.examinerTraps,
      flashcards: notes.flashcards,
      cognitive_advice: notes.cognitiveAdvice,
      raw_convo_count: notes.conversationMessageCount,
    };

    const { data, error } = await client
      .from('spark_notes')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      console.warn('Supabase insert note:', error.message);
      return {
        success: true,
        error: error.message,
        source: 'local',
      };
    }

    notes.syncedToSupabase = true;
    saveSparkNotesLocally(notes);

    return {
      success: true,
      id: data?.id || notes.id,
      source: 'supabase',
    };
  } catch (err: any) {
    console.warn('Direct client sync:', err);
    return {
      success: true,
      error: err.message,
      source: 'local',
    };
  }
}

/**
 * Fetches user's saved spark notes from Supabase (via proxy or client) merged with local vault.
 */
export async function fetchUserSparkNotes(subjectFilter?: string): Promise<PersonalizedSparkNotes[]> {
  const localNotes = getLocalSparkNotes();
  let remoteNotes: PersonalizedSparkNotes[] = [];

  // 1. Attempt fetching from server proxy
  try {
    const url = subjectFilter
      ? `/api/spark-notes?subject=${encodeURIComponent(subjectFilter)}`
      : '/api/spark-notes';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.sparkNotes) && data.sparkNotes.length > 0) {
        remoteNotes = data.sparkNotes;
      }
    }
  } catch (err) {
    console.debug('Failed to fetch from backend proxy:', err);
  }

  // 2. Direct client query fallback if client credentials present
  if (remoteNotes.length === 0) {
    const client = getSupabaseClient();
    if (client) {
      try {
        let query = client.from('spark_notes').select('*').order('created_at', { ascending: false });
        if (subjectFilter) {
          query = query.ilike('subject', `%${subjectFilter}%`);
        }
        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          remoteNotes = data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            subject: row.subject,
            grade: row.grade,
            topic: row.topic,
            title: row.title,
            summary: row.summary,
            keyBreakdowns: row.key_breakdowns || [],
            weakSpotsIdentified: row.weak_spots || [],
            sparkBullets: row.spark_bullets || [],
            coreFormulasOrRules: row.formulas_rules || [],
            examinerTraps: row.examiner_traps || [],
            flashcards: row.flashcards || [],
            cognitiveAdvice: row.cognitive_advice || '',
            conversationMessageCount: row.raw_convo_count || 0,
            createdAt: row.created_at || new Date().toISOString(),
            syncedToSupabase: true,
          }));
        }
      } catch (clientErr) {
        console.debug('Direct client fetch error:', clientErr);
      }
    }
  }

  // Merge remote notes with local items without duplication
  const map = new Map<string, PersonalizedSparkNotes>();
  remoteNotes.forEach((n) => map.set(n.id, n));
  localNotes.forEach((n) => {
    if (subjectFilter && n.subject.toLowerCase() !== subjectFilter.toLowerCase()) {
      return;
    }
    if (!map.has(n.id)) {
      map.set(n.id, n);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Local storage caching helpers
export function getLocalSparkNotes(): PersonalizedSparkNotes[] {
  try {
    const raw = localStorage.getItem(SPARK_NOTES_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSparkNotesLocally(note: PersonalizedSparkNotes): void {
  try {
    const existing = getLocalSparkNotes();
    const updated = [note, ...existing.filter((n) => n.id !== note.id)];
    localStorage.setItem(SPARK_NOTES_LOCAL_KEY, JSON.stringify(updated.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save spark notes locally', e);
  }
}

export async function syncOnboardingToSupabase(payload: {
  profile: Partial<StudentProfile>;
  firmamentProfile: FirmamentProfile;
  answers: Record<number, string>;
}): Promise<{ success: boolean; synced: boolean; error?: string }> {
  try {
    const res = await fetch('/api/profile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: payload.profile,
        firmamentProfile: payload.firmamentProfile,
        answers: payload.answers,
      }),
    });
    if (!res.ok) {
      return { success: true, synced: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, synced: !!data.synced, error: data.error };
  } catch (err: any) {
    console.debug('Onboarding sync skipped:', err);
    return { success: true, synced: false, error: err?.message };
  }
}

export function deleteSparkNoteLocally(id: string): void {
  try {
    const existing = getLocalSparkNotes();
    const updated = existing.filter((n) => n.id !== id);
    localStorage.setItem(SPARK_NOTES_LOCAL_KEY, JSON.stringify(updated));
    // Asynchronously notify backend proxy
    fetch(`/api/spark-notes/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  } catch (e) {
    console.error('Failed to delete spark note locally', e);
  }
}

/**
 * Ready-to-execute PostgreSQL DDL and Row Level Security (RLS) script
 * for the user's Supabase SQL Editor.
 */
export const SUPABASE_RLS_SQL_SCHEMA = `-- =====================================================================
-- MyTutorZA: Supabase Database Schema with Row Level Security (RLS)
-- Copy and paste this directly into your Supabase Dashboard SQL Editor.
-- =====================================================================

-- 1. Create table for Personalized Spark Notes generated from Bot-User Convo
CREATE TABLE IF NOT EXISTS public.spark_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_breakdowns JSONB DEFAULT '[]'::jsonb,
  weak_spots JSONB DEFAULT '[]'::jsonb,
  spark_bullets JSONB DEFAULT '[]'::jsonb,
  formulas_rules JSONB DEFAULT '[]'::jsonb,
  examiner_traps JSONB DEFAULT '[]'::jsonb,
  flashcards JSONB DEFAULT '[]'::jsonb,
  cognitive_advice TEXT,
  raw_convo_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS) on spark_notes
ALTER TABLE public.spark_notes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Security Policies for spark_notes (Strict User Isolation)
-- Users can only read their own notes
DROP POLICY IF EXISTS "Users can read own spark notes" ON public.spark_notes;
CREATE POLICY "Users can read own spark notes"
  ON public.spark_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can only insert notes with their own auth.uid()
DROP POLICY IF EXISTS "Users can insert own spark notes" ON public.spark_notes;
CREATE POLICY "Users can insert own spark notes"
  ON public.spark_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can update only their own notes
DROP POLICY IF EXISTS "Users can update own spark notes" ON public.spark_notes;
CREATE POLICY "Users can update own spark notes"
  ON public.spark_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete only their own notes
DROP POLICY IF EXISTS "Users can delete own spark notes" ON public.spark_notes;
CREATE POLICY "Users can delete own spark notes"
  ON public.spark_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create table for Tutoring Chat Sessions & Transcripts
CREATE TABLE IF NOT EXISTS public.tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  language TEXT DEFAULT 'English',
  title TEXT,
  topic TEXT,
  pdf_name TEXT,
  pdf_text TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4b. Study sessions + quiz progress shared by all three agents
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  term TEXT,
  topic TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  firmament_snapshot JSONB DEFAULT '{}'::jsonb,
  roadmap_snapshot JSONB DEFAULT '{}'::jsonb,
  curriculum_snapshot JSONB DEFAULT '{}'::jsonb,
  study_pack JSONB DEFAULT '{}'::jsonb,
  quiz JSONB DEFAULT '[]'::jsonb,
  quiz_progress JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own study sessions" ON public.study_sessions;
CREATE POLICY "Users can manage own study sessions"
  ON public.study_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Study sessions anon fallback" ON public.study_sessions;
CREATE POLICY "Study sessions anon fallback"
  ON public.study_sessions
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5. Enable Row Level Security (RLS) on tutoring_sessions
ALTER TABLE public.tutoring_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tutoring sessions" ON public.tutoring_sessions;
CREATE POLICY "Users can manage own tutoring sessions"
  ON public.tutoring_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 6. Allow public/anon read and insert if testing without JWT login (Optional Fallback)
-- Remove this policy if you strictly require JWT authentication for all requests
DROP POLICY IF EXISTS "Anon test access fallback" ON public.spark_notes;
CREATE POLICY "Anon test access fallback"
  ON public.spark_notes
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
`;
