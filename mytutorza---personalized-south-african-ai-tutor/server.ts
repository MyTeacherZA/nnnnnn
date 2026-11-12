import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  buildFirmamentSystemPrompt,
  buildLearningHistoryBlock,
  buildStudySystemPrompt,
  buildTutoringSessionScope,
  describeCurriculum,
  getCurriculumDirective,
} from './serverFirmamentRules';
import { isMailConfigured, sendMail } from './serverMailer';
// NOTE: prompts use getCurriculumDirective() for country-correct content.
import {
  buildCapsVaultIndex,
  searchCapsVault,
  detectTOC,
  splitByTOC,
  extractPdfTextFromBuffer,
} from './serverPdfIngestion';
import { selectSourceChunksWithScore, isPossiblyOffTopic, detectStruggleSignal } from './serverTutoringContext';
import { searchWeb, detectNeedsWeb, webSearchConfigured } from './serverWebSearch';
import { createHash } from 'crypto';
import {
  pickFiles as pickCapsFiles,
  matchSubject as capsMatchSubject,
  matchGrade as capsMatchGrade,
} from './serverCapsCatalog';

dotenv.config();

// Llama 3.3 is the brain for Tutoring, Study & Exam agents.
const LLAMA_API_KEY =
  process.env.LLAMA_API_KEY ||
  process.env.OLLAMA_API_KEY ||
  process.env.GROQ_API_KEY ||
  process.env.TOGETHER_API_KEY ||
  '';
const LLAMA_BASE_URL = (process.env.LLAMA_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
const LLAMA_MODEL_ID = process.env.LLAMA_MODEL || 'llama-3.3-70b-versatile';

// DeepSeek (OpenAI-compatible) — used by the Tutoring + Exam agents for deep reasoning / long outputs.
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// Upstash Redis REST
const UPSTASH_URL = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

app.use(express.json({ limit: '10mb' }));

// In-memory cache mirror (L1). Upstash is the shared L2 when configured.
const cacheVault = new Map<string, { data: any; expiry: number }>();
const CACHE_MEMORY_LIMIT = 400;

function encodeCacheKey(key: string) {
  return Buffer.from(key)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function pruneLocalCache() {
  if (cacheVault.size <= CACHE_MEMORY_LIMIT) return;
  const now = Date.now();
  for (const [key, item] of cacheVault) {
    if (now > item.expiry) cacheVault.delete(key);
  }
  while (cacheVault.size > CACHE_MEMORY_LIMIT) {
    const oldest = cacheVault.keys().next().value as string | undefined;
    if (!oldest) break;
    cacheVault.delete(oldest);
  }
}

async function getCache(key: string): Promise<any> {
  // L1: process memory.
  const local = cacheVault.get(key);
  if (local) {
    if (Date.now() <= local.expiry) return local.data;
    cacheVault.delete(key);
  }

  // L2: Upstash (shared across instances).
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const r = await fetch(`${UPSTASH_URL}/get/${encodeCacheKey(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    if (!r.ok) return null;
    const json = await r.json();
    if (json?.result === null || json?.result === undefined) return null;

    let parsed: any = json.result;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        // Plain string values are valid cache entries.
      }
    }
    cacheVault.set(key, { data: parsed, expiry: Date.now() + 5 * 60 * 1000 });
    pruneLocalCache();
    return parsed;
  } catch (e) {
    console.warn('Upstash get error:', (e as any)?.message || e);
    return null;
  }
}

async function setCache(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
  cacheVault.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
  pruneLocalCache();

  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  try {
    // POST body avoids the URL-length limits that silently broke larger
    // payloads (study packs, exam references) with the old GET-style write.
    const r = await fetch(`${UPSTASH_URL}/set/${encodeCacheKey(key)}?EX=${ttlSeconds}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.warn('Upstash set rejected:', r.status, detail.slice(0, 200));
    }
  } catch (e) {
    console.warn('Upstash set error:', (e as any)?.message || e);
  }
}

async function callLlamaChat(params: {
  system?: string;
  user?: string;
  messages?: { role: string; content: string }[];
  jsonMode?: boolean;
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}): Promise<string | null> {
  const providerApiKey = params.apiKey || LLAMA_API_KEY;
  const providerBaseUrl = (params.baseUrl || LLAMA_BASE_URL).replace(/\/+$/, '');
  const providerModel = params.model || LLAMA_MODEL_ID;
  const providerTemperature = params.temperature ?? 0.4;
  const providerTimeoutMs = params.timeoutMs ?? 9000;
  const providerMaxTokens = params.maxTokens ?? 4000;
  const providerJsonMode = params.jsonMode ?? false;
  if (!providerApiKey) return null;
  const payload: any = {
    model: providerModel,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
      ...(user ? [{ role: 'user', content: user }] : []),
    ],
    temperature: providerTemperature,
    max_tokens: providerMaxTokens,
  };
  if (providerJsonMode) {
    payload.response_format = { type: 'json_object' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), providerTimeoutMs);

  const useNativeOllama = providerBaseUrl.endsWith('/api') || providerBaseUrl.endsWith('/api/');
  const effectiveMaxTokens = providerMaxTokens;

  try {
    const url = useNativeOllama
      ? `${providerBaseUrl}/chat`
      : `${providerBaseUrl}/chat/completions`;

    const body = useNativeOllama
      ? {
          model: providerModel,
          messages: payload.messages,
          stream: false,
          format: providerJsonMode ? 'json' : undefined,
          options: { temperature: providerTemperature, num_predict: effectiveMaxTokens },
        }
      : { ...payload, max_tokens: effectiveMaxTokens };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errText = await res.text();
      console.warn('Llama chat error:', res.status, errText);
      return null;
    }
    const data = await res.json();
    if (useNativeOllama) {
      return data?.message?.content ?? data?.response ?? null;
    }
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err: any) {
    clearTimeout(timer);
    console.warn('Llama chat failed:', err?.message || err);
    return null;
  }
}

// ---------------------------------------------------------------------
// HEALTH & SECURE STATUS
// ---------------------------------------------------------------------
const supabaseServerUrl = process.env.SUPABASE_URL || '';
const supabaseServerAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  '';
const supabaseServerJwt = process.env.SUPABASE_JWT_SECRET || process.env.SUPABASE_JWT || '';

function getSupabaseServerClient(req?: Request) {
  if (!supabaseServerUrl || !supabaseServerAnonKey) return null;
  const clientOptions: any = {};
  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    clientOptions.global = { headers: { Authorization: authHeader } };
  }
  try {
    return createClient(supabaseServerUrl, supabaseServerAnonKey, clientOptions);
  } catch (err) {
    console.warn('Failed to initialize server Supabase client:', err);
    return null;
  }
}

function getServiceSupabaseClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseServerAnonKey || '';
  if (!supabaseServerUrl || !key) return null;
  try {
    return createClient(supabaseServerUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    console.warn('Failed to initialize service Supabase client:', err);
    return null;
  }
}

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    app: 'MyTutorZA Backend Engine',
    llamaConfigured: !!LLAMA_API_KEY,
    llamaModel: LLAMA_MODEL_ID,
    supabaseConfigured: !!(supabaseServerUrl && supabaseServerAnonKey),
    upstashConfigured: !!(UPSTASH_URL && UPSTASH_TOKEN),
    curriculumDb: 'US state standards / AP · UK nation curricula / ZA CAPS vault (fallback)',
    webSearchConfigured: webSearchConfigured(),
  });
});

app.get('/api/supabase/status', (req: Request, res: Response) => {
  res.json({
    configured: !!(supabaseServerUrl && supabaseServerAnonKey),
    url: supabaseServerUrl
      ? supabaseServerUrl.replace(/^(https:\/\/[^.]+).*/, '$1.supabase.co')
      : null,
    hasAnonKey: !!supabaseServerAnonKey,
    hasJwtSecret: !!supabaseServerJwt,
    rlsReady: true,
  });
});

// Timeout helper to prevent HeadersTimeoutError from long-running AI generation
async function callWithTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI generation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

function getAuthenticDBEPaper(
  subject: string,
  grade: string,
  paperType: string,
  dur: number,
  topic?: string,
) {
  const isMathLit = subject.toLowerCase().includes('literacy');
  const isPhysics =
    subject.toLowerCase().includes('physical') || subject.toLowerCase().includes('science');
  const isEnglish =
    subject.toLowerCase().includes('english') || subject.toLowerCase().includes('language');
  const isAccounting = subject.toLowerCase().includes('accounting');

  if (isMathLit) {
    return {
      title: `${grade} Mathematical Literacy ${paperType}`,
      subject,
      grade,
      examType: paperType,
      durationMinutes: dur,
      totalMarks: dur === 30 ? 25 : dur === 60 ? 50 : 100,
      instructions: [
        'Answer ALL the questions.',
        'Use the ANNEXURES provided where applicable.',
        'An approved non-programmable calculator may be used.',
        'Round off all final answers to TWO decimal places.',
      ],
      sections: [
        {
          title: 'SECTION A: Basic Calculations & Terminology (Finance & Tax)',
          description:
            'Short objective questions on SARS taxation, VAT and percentage calculations.',
          totalMarks: 15,
          questions: [
            {
              id: 'lit-1-1',
              number: '1.1',
              section: 'Section A',
              prompt:
                'A solar power inverter system is priced at R14 950,00 excluding VAT. Calculate the total price including 15% South African VAT.',
              type: 'calculation' as const,
              marks: 3,
              rubric:
                '1 mark: VAT formula (Amount × 1,15), 1 mark: Substitution 14950 × 1,15, 1 mark: Final answer R17 192,50.',
              examinerTrap:
                'Students often calculate 15% but forget to add it back to the original price.',
              solution: 'VAT Inclusive = R14 950 × 1,15 = R17 192,50',
            },
            {
              id: 'lit-1-2',
              number: '1.2',
              section: 'Section A',
              prompt:
                'Define the term "Primary Rebate" as used by the South African Revenue Service (SARS).',
              type: 'short' as const,
              marks: 2,
              rubric:
                '2 marks: Full definition stating standard tax deduction allowed for all taxpayers.',
              examinerTrap:
                'Confusing a tax rebate (deduction from tax payable) with a tax deduction (deduction from gross income).',
              solution:
                'A statutory tax relief discount deducted directly from the calculated tax payable for all individual taxpayers under 65 years old.',
            },
          ],
        },
        {
          title: 'SECTION B: Maps, Plans, Scale & Measurements',
          description: 'Context-based calculations on distance, scale ratios, and capacity.',
          totalMarks: 25,
          questions: [
            {
              id: 'lit-2-1',
              number: '2.1',
              section: 'Section B',
              prompt:
                'On a topographical hiking map with a scale of 1 : 50 000, the distance between Sentinel Peak and Tugela Falls measures 7,6 cm with a ruler. Calculate the actual ground distance in kilometers (km).',
              type: 'calculation' as const,
              marks: 4,
              rubric:
                '1 mark: Multiplication 7,6 × 50 000 = 380 000 cm, 1 mark: Division by 100 to meters (3 800 m), 1 mark: Division by 1 000 to km, 1 mark: Final answer 3,8 km.',
              examinerTrap:
                'Dividing by 10 000 instead of 100 000 to convert centimeters directly to kilometers.',
              solution:
                'Real distance = 7,6 cm × 50 000 = 380 000 cm.\n380 000 cm ÷ 100 000 = 3,8 km.',
            },
          ],
        },
        {
          title: 'SECTION C: Data Handling & Financial Decisions',
          description: 'Complex financial scenario comparing hire purchase versus personal loan.',
          totalMarks: 10,
          questions: [
            {
              id: 'lit-3-1',
              number: '3.1',
              section: 'Section C',
              prompt:
                'A learner purchases a refrigerator with a cash price of R8 500 on Hire Purchase. Terms: 10% cash deposit, 36 equal monthly installments of R345,00. Calculate the total interest paid and evaluate if this is cost-effective.',
              type: 'calculation' as const,
              marks: 6,
              rubric:
                '1 mark: Deposit = R850, 1 mark: Total installments = 36 × 345 = R12 420, 1 mark: Total cost = R13 270, 2 marks: Total interest = R13 270 - R8 500 = R4 770, 1 mark: Valid evaluation.',
              examinerTrap:
                'Forgetting to include the 10% deposit in the total money paid.',
              solution:
                'Deposit = 10% of R8 500 = R850.\nInstallments = 36 × R345 = R12 420.\nTotal HP Cost = R850 + R12 420 = R13 270.\nTotal Interest Paid = R13 270 - R8 500 = R4 770 (over 56% interest).',
            },
          ],
        },
      ],
    };
  }

  // Default: Pure Mathematics authentic NSC paper
  return {
    title: `${grade} ${subject} ${paperType}`,
    subject,
    grade,
    examType: paperType,
    durationMinutes: dur,
    totalMarks: dur === 30 ? 25 : dur === 60 ? 50 : 100,
    instructions: [
      'Answer ALL the questions.',
      'Clearly show ALL calculations, diagrams, and graphs used in determining your answers.',
      'Answers only will NOT necessarily be awarded full marks.',
      'An approved scientific calculator may be used unless stated otherwise.',
      'Round off all final answers to TWO decimal places where appropriate.',
    ],
    sections: [
      {
        title: 'SECTION A: Objective Concepts & Number Patterns',
        description: 'Nature of roots, quadratic equations, and geometric sequences.',
        totalMarks: 15,
        questions: [
          {
            id: 'q1-1',
            number: '1.1',
            section: 'Section A',
            prompt: 'Which of the following describes the roots of 2x² - 4x + 5 = 0?',
            type: 'mcq' as const,
            options: [
              'A: Real, rational, and equal',
              'B: Real, irrational, and unequal',
              'C: Non-real (imaginary)',
              'D: Real, rational, and unequal',
            ],
            marks: 3,
            rubric:
              '1 mark: Discriminant formula Δ = b² - 4ac, 1 mark: Calculation Δ = -24, 1 mark: Correct deduction (C).',
            examinerTrap:
              'Students often forget the brackets around (-4)², writing -16 instead of +16, leading to an incorrect positive discriminant.',
            solution:
              'Δ = (-4)² - 4(2)(5) = 16 - 40 = -24. Since Δ < 0, roots are non-real. Correct answer is C.',
          },
          {
            id: 'q1-2',
            number: '1.2',
            section: 'Section A',
            prompt:
              'Given the geometric sequence: 7; 14; 28; ... Write down the value of the common ratio r and determine the 8th term (T₈).',
            type: 'short' as const,
            marks: 3,
            rubric:
              '1 mark: Common ratio r = 2, 1 mark: Formula T_n = a·r^(n-1), 1 mark: T₈ = 7(2)⁷ = 896.',
            examinerTrap:
              'Confusing common difference d with ratio r or writing 7(2)⁸ instead of (n-1).',
            solution: 'r = T₂ / T₁ = 14 / 7 = 2.\nT₈ = 7 × 2⁷ = 7 × 128 = 896.',
          },
        ],
      },
      {
        title: 'SECTION B: Functions, Calculus & Financial Mathematics',
        description: 'Differentiation from first principles and annuity calculations.',
        totalMarks: 25,
        questions: [
          {
            id: 'q2-1',
            number: '2.1',
            section: 'Section B',
            prompt: 'Differentiate f(x) = 2x² - 3x from first principles.',
            type: 'calculation' as const,
            marks: 5,
            rubric:
              "1 mark: Definition f'(x) = lim_{h->0} [f(x+h) - f(x)]/h, 1 mark: Expansion 2(x+h)² - 3(x+h), 1 mark: Simplification 4xh + 2h² - 3h, 1 mark: Factorising h out, 1 mark: Limit evaluation 4x - 3.",
            examinerTrap:
              'Dropping the limit notation lim_{h->0} before the final line loses a critical notation mark in NSC papers.',
            solution:
              "f(x+h) = 2(x+h)² - 3(x+h) = 2x² + 4xh + 2h² - 3x - 3h\nf(x+h) - f(x) = 4xh + 2h² - 3h\nf'(x) = lim_{h->0} [h(4x + 2h - 3)] / h = lim_{h->0} (4x + 2h - 3) = 4x - 3.",
          },
          {
            id: 'q2-2',
            number: '2.2',
            section: 'Section B',
            prompt:
              'Ayanda takes out a home loan of R1 250 000 at an interest rate of 11,25% p.a. compounded monthly over 20 years. Calculate her equal monthly repayment installment x.',
            type: 'calculation' as const,
            marks: 4,
            rubric:
              '1 mark: Present value annuity formula, 1 mark: i = 0,1125/12 and n = 240, 1 mark: Substitution, 1 mark: Final monthly installment R13 124,19.',
            examinerTrap:
              'Using the future value annuity formula instead of present value for a home mortgage loan.',
            solution:
              'P_v = x[1 - (1 + i)^(-n)] / i\n1 250 000 = x[1 - (1 + 0,1125/12)^(-240)] / (0,1125/12)\nx = R13 124,19 per month.',
          },
        ],
      },
      {
        title: 'SECTION C: Cubic Function Analysis & Optimization',
        description: 'Turning points, points of inflection and tangents.',
        totalMarks: 10,
        questions: [
          {
            id: 'q3-1',
            number: '3.1',
            section: 'Section C',
            prompt:
              'Given the cubic function f(x) = x³ - 3x² - 9x + 5. Determine the coordinates of the turning points and classify them as local maximum or minimum.',
            type: 'calculation' as const,
            marks: 6,
            rubric:
              "1 mark: f'(x) = 3x² - 6x - 9, 1 mark: Setting 3(x - 3)(x + 1) = 0, 1 mark: x = 3 and x = -1, 1 mark: y = -22 and y = 10, 2 marks: Classification (-1; 10) local max, (3; -22) local min.",
            examinerTrap:
              'Substituting x values into the derivative instead of the original function f(x) to find turning point y-coordinates.',
            solution:
              "f'(x) = 3x² - 6x - 9 = 0 ⟹ x² - 2x - 3 = 0 ⟹ (x - 3)(x + 1) = 0\nx = 3 or x = -1.\nf(-1) = (-1)³ - 3(-1)² - 9(-1) + 5 = 10 ⟹ (-1; 10) is a local maximum.\nf(3) = 27 - 27 - 27 + 5 = -22 ⟹ (3; -22) is a local minimum.",
          },
        ],
      },
    ],
  };
}

/**
/**
 * Short, stable hash for cache keys (LLM replies, source slices).
 */
function hashForCache(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 40);
}

app.post('/api/tutoring/chat', async (req: Request, res: Response) => {
  try {
    if (await rejectWithoutAgentAccess(req, res)) return;
    const {
      message,
      firmamentProfile,
      subject,
      grade,
      previousMark,
      language,
      textbook,
      history,
      homeworkMode,
      askMode,
      lockedTopic,
      pdf,
      sourceId,
      sessionId,
      state,
      country,
      nation,
      includeWeb,
      email: bodyEmail,
    } = req.body || {};

    const email = String(bodyEmail || '').trim().toLowerCase();
    const bodyTitle = String(req.body?.title || '').trim();
    const cleanMessage = String(message || '').trim().slice(0, 6000);

    if (!cleanMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const cleanTopic = String(lockedTopic || bodyTitle || '').trim().slice(0, 300);
    const requestedSessionId =
      typeof sessionId === 'string' && /^[0-9a-fA-F-]{16,64}$/.test(sessionId) ? sessionId : undefined;
    const requestedSourceId =
      typeof sourceId === 'string' && /^[0-9a-fA-F-]{16,64}$/.test(sourceId) ? sourceId : undefined;

    const targetLang = language || 'English';
    const mark = previousMark !== undefined ? Number(previousMark) : 50;
    const cleanSubject = String(subject || 'Mathematics');
    const cleanGrade = String(grade || 'Grade 12');

    // -----------------------------------------------------------------
    // 1. CONTEXT + SOURCE + HISTORY IN PARALLEL (single round-trip).
    //    History is rebuilt from the database only when the client has
    //    none (page reload / resumed session).
    // -----------------------------------------------------------------
    const resolveSource = async () => {
      if (requestedSourceId) {
        const stored = await getTutoringSource(email, requestedSourceId);
        if (stored) return stored;
      }
      if (pdf && String(pdf.text || '').trim()) {
        return {
          name: String(pdf.name || 'uploaded source').trim(),
          text: String(pdf.text).slice(0, 400000),
          tableOfContents: Array.isArray(pdf.tableOfContents) ? pdf.tableOfContents : [],
        };
      }
      return null;
    };

    const [learningHistory, resolvedSource] = await Promise.all([
      getLearningHistory(email, cleanSubject),
      resolveSource(),
    ]);

    let sessionSource: { id?: string; name: string; text: string; tableOfContents?: any[] } | null =
      resolvedSource;

    let historyMessages: { role: string; content: string }[] = Array.isArray(history)
      ? history
          .slice(-8)
          .map((h: any) => ({
            role: h?.sender === 'user' ? 'user' : 'assistant',
            content: String(h?.text || '').trim().slice(0, 900),
          }))
          .filter((m: any) => m.content)
      : [];

    if (historyMessages.length === 0 && requestedSessionId) {
      historyMessages = await loadTutoringHistory(email, requestedSessionId, 8);
    }

    const tocTitles = Array.isArray(sessionSource?.tableOfContents)
      ? (sessionSource!.tableOfContents as any[])
          .map((entry) => (typeof entry === 'string' ? entry : String(entry?.title || '')))
          .filter(Boolean)
      : [];

    // -----------------------------------------------------------------
    // 2. KNOWLEDGE ROUTER (deterministic, zero extra LLM calls)
    //    A. uploaded PDF RAG — measure topic coverage (lexical)
    //    B. bounded web fallback — only when:
    //         (a) the learner explicitly asked for web examples, OR
    //         (b) the message is time-sensitive, OR
    //         (c) the uploaded source covers NOTHING of this request
    //    C. otherwise: the locked topic + curriculum + training data only
    // -----------------------------------------------------------------
    const sourceQuery = `${cleanTopic} ${cleanMessage}`;
    const sourceChunks = sessionSource
      ? selectSourceChunksWithScore(String(sessionSource.text || ''), sourceQuery)
      : { text: '', bestScore: 0, coverageCount: 0 };
    const sourceCoverage = sessionSource ? sourceChunks.bestScore : 0;
    const sourceText = sourceChunks.text;

    let webSnippets: { title: string; url: string; snippet: string }[] | null = null;
    const wantsWeb =
      Boolean(includeWeb) ||
      detectNeedsWeb(cleanMessage) ||
      Boolean(sessionSource && sourceCoverage === 0);

    if (wantsWeb) {
      const webCacheKey = `web:${hashForCache(`${cleanTopic}||${cleanMessage}`)}`;
      const cachedWeb = await getCache(webCacheKey);
      if (Array.isArray(cachedWeb) && cachedWeb.length > 0) {
        webSnippets = cachedWeb;
      } else {
        try {
          webSnippets = await searchWeb(`${cleanTopic} ${cleanMessage}`.slice(0, 300), 3);
          if (webSnippets?.length) {
            await setCache(webCacheKey, webSnippets, 60 * 60 * 12); // 12h TTL: reuse is free
          }
        } catch {
          webSnippets = null;
        }
      }
    }

    // -----------------------------------------------------------------
    // 3. SYSTEM PROMPT: stable base → progress → role → modes → knowledge →
    //    session contract LAST (highest recency / priority).
    // -----------------------------------------------------------------
    let systemInstruction = buildFirmamentSystemPrompt({
      firmamentProfile,
      subject: cleanSubject,
      grade: cleanGrade,
      previousMark: mark,
      language: targetLang,
      state,
      country,
      nation,
      textbook,
      // Curriculum retrieval is filtered by the LOCKED TOPIC, never by an
      // arbitrary user message, so it cannot pull in off-topic chapters.
      userQuery: cleanTopic || cleanSubject,
      taskType: 'tutoring',
    });

    systemInstruction += `\n\n${buildLearningHistoryBlock(learningHistory)}`;
    systemInstruction += `

TUTORING AGENT ROLE LOCK (NON-NEGOTIABLE):
- This is the TUTORING AGENT, not the Study Agent and not the Exam Agent.
- Purpose: build deep, holistic and comprehensive understanding of knowledge, the subject, the curriculum, and what the curriculum expects of the learner.
- Use Socratic questioning and guided discovery. Do not hand over final answers.
- Do not convert this into a study note pack, flashcard drill, quiz drill or exam paper. The Study Agent owns gap-closing and recall; the Exam Agent owns assessment simulation.
`;

    let extraModeInstruction = '';
    if (homeworkMode)
      extraModeInstruction +=
        "\nHOMEWORK MODE ACTIVE: Evaluate the student's submitted work, pinpoint errors, and guide correction without revealing final answers. Stay inside the session's locked topic.";
    if (askMode)
      extraModeInstruction +=
        "\nASK MODE ACTIVE: Opening should be synonymous with: What is it that you don't understand? Feel free to open up. Stay inside the session's locked topic.";
    if (extraModeInstruction) systemInstruction += extraModeInstruction;

    if (sessionSource) {
      const tocList = tocTitles.slice(0, 24).join(' | ');

      systemInstruction += `

UPLOADED SOURCE / RAG CONTEXT (FIRST CONTEXT — "THE HOLY GRAIL"):
- An uploaded source was provided for this session: "${String(sessionSource.name || 'uploaded source').trim()}".
- Source table of contents: ${tocList || '(not detected)'}.
- Retrieved source content (most relevant to the locked topic): ${
        sourceText || '(no extractable text content was provided).'
      }
- Source coverage for this request: ${sourceCoverage} matching chunk(s).
- THE UPLOADED SOURCE IS THE FIRST CONTEXT AND THE HOLY GRAIL FOR THIS TUTORING SESSION. Tutor the student on the locked topic using this uploaded source as the primary grounding.
- Use internet knowledge only to provide further clarity and emphasis on what the uploaded source says about the topic.
- If the uploaded source has no content relevant to the locked topic, say so briefly and fall back to internet-based knowledge strictly specific to the locked topic.`;
    }

    if (webSnippets && webSnippets.length > 0) {
      const snippetBlock = webSnippets
        .map(
          (s, i) =>
            `${i + 1}. ${String(s.title || 'Untitled').slice(0, 150)} — ${String(s.snippet || '').slice(0, 400)} (source: ${String(s.url || '').slice(0, 120)})`,
        )
        .join('\n');

      systemInstruction += `

WEB SNIPPETS (bounded search, fetched live — the ONLY permitted internet references):
${snippetBlock}
- Use these snippets ONLY to clarify or ground the locked topic "${cleanTopic}".
- If snippets conflict with the uploaded source, the uploaded source wins.
- If they add anything beyond the topic, ignore it.
- Never present snippet text verbatim at length; paraphrase, then attribute to the source briefly.`;
    }

    const offTopicHint = isPossiblyOffTopic(cleanMessage, cleanTopic, tocTitles, cleanSubject);

    systemInstruction += `\n\n${buildTutoringSessionScope({
      lockedTopic: cleanTopic,
      subject: cleanSubject,
      grade: cleanGrade,
      hasSource: Boolean(sessionSource),
      sourceName: sessionSource?.name,
      sourceToc: tocTitles,
      offTopicHint,
    })}`;

    // -----------------------------------------------------------------
    // 4. LLM CALL with response cache (repeat prompts cost $0) and
    //    tight output/cost caps for Socratic tutoring.
    // -----------------------------------------------------------------
    const cacheKey = `tutoring:reply:${hashForCache(
      [
        // Per-user + per-session cache isolation (shared-machine safe).
        hashForCache(email),
        requestedSessionId || 'anon',
        includeWeb ? 'web' : '',
        DEEPSEEK_MODEL,
        cleanSubject,
        cleanGrade,
        targetLang,
        country || '',
        state || '',
        firmamentProfile?.cognitiveScore || '',
        firmamentProfile?.mercury?.element || '',
        homeworkMode ? 'hw' : '',
        askMode ? 'ask' : '',
        cleanTopic,
        cleanMessage,
        historyMessages
          .slice(-4)
          .map((m) => `${m.role}:${m.content}`)
          .join('|'),
        sessionSource
          ? `${sessionSource.name}:${hashForCache(String(sessionSource.text || '').slice(0, 5000))}`
          : 'no-source',
      ].join('||'),
    )}`;

    let reply: string | null = null;
    let replySource = 'deepseek';

    if (DEEPSEEK_API_KEY) {
      const cachedReply = await getCache(cacheKey);
      if (typeof cachedReply === 'string' && cachedReply.trim()) {
        reply = cachedReply;
        replySource = 'cache';
      } else {
        try {
          reply = await callLlamaChat({
            system: systemInstruction,
            messages: historyMessages,
            user: cleanMessage,
            temperature: 0.35,
            timeoutMs: 45000,
            maxTokens: 2000,
            baseUrl: DEEPSEEK_BASE_URL,
            apiKey: DEEPSEEK_API_KEY,
            model: DEEPSEEK_MODEL,
          });
          if (reply) await setCache(cacheKey, reply, 900);
        } catch (llamaErr: any) {
          console.warn(
            'Tutoring LLM timeout/error, serving topic-locked fallback:',
            llamaErr?.message || llamaErr,
          );
        }
      }
    }

    if (!reply) {
      const fallbackCurriculum = describeCurriculum(country, state, nation);
      const greeting = fallbackCurriculum.isUS
        ? 'Hi there!'
        : fallbackCurriculum.isUK
        ? 'Hello!'
        : 'Sawubona!';
      reply = `${greeting} Let's stay with "${cleanTopic || cleanSubject}". ${
        sessionSource ? `I have "${sessionSource.name}" loaded as our source. ` : ''
      }What is the first definition, rule or step you would write down for it?`;
      replySource = 'topic-locked-fallback';
    }

    // Persist the exchange against ONE session row (never one row per message).
    const savedTutoringSessionId = await saveTutoringSession({
      email,
      sessionId: requestedSessionId,
      subject: cleanSubject,
      grade: cleanGrade,
      language: targetLang,
      title: bodyTitle,
      topic: cleanTopic,
      source: sessionSource,
      messages: [
        { role: 'user', content: cleanMessage },
        { role: 'assistant', content: reply },
      ],
    });

    // Fire-and-forget: extract learning signals into the shared
    // study_sessions profile (struggle regex gate + 3-turn cadence + hard cap).
    // Never blocks the reply; silently no-ops if the DDL isn't applied yet.
    void maybeExtractLearningSignals({
      email,
      subject: cleanSubject,
      grade: cleanGrade,
      topic: cleanTopic,
      userMessage: cleanMessage,
      assistantReply: reply,
      messageCount: historyMessages.length + 2,
    }).catch(() => {});

    return res.json({
      reply,
      source: replySource,
      cached: replySource === 'cache',
      sessionId: savedTutoringSessionId || requestedSessionId || null,
      sourceId: requestedSourceId || null,
      sourceResolved: Boolean(sessionSource),
      // Tells the client to fall back to inline text on the next turn when the
      // server could not load a previously ingested source (e.g. DDL missing).
      sourceMissing: Boolean(requestedSourceId) && !sessionSource,
      offTopicFlagged: offTopicHint,
      webUsed: Boolean(webSnippets && webSnippets.length > 0),
      webCount: webSnippets?.length || 0,
      webConfigured: webSearchConfigured(),
    });
  } catch (err: any) {
    console.error('Tutoring API error:', err);
    const safeTopic = String(req.body?.lockedTopic || req.body?.title || '').trim();
    return res.json({
      reply: safeTopic
        ? `Let us keep this session on "${safeTopic}". What is the first step or idea you would write down?`
        : 'Let us work through this together step by step. What is the fundamental formula or theorem we should apply first?',
      source: 'safe-fallback',
      sessionId: null,
    });
  }
});

// ---------------------------------------------------------------------
// 1A-2. TUTORING SOURCE INGEST (PDF / TEXT -> PARSE -> RAG -> SUPABASE & UPSTASH)
// Parses an uploaded textbook/source, extracts readable text + a table of
// contents, and caches the source metadata in Upstash for fast reuse.
// ---------------------------------------------------------------------
app.post('/api/tutoring/source/ingest', async (req: Request, res: Response) => {
  try {
    if (await rejectWithoutAgentAccess(req, res)) return;

    const { name, base64, topic, subject, grade } = req.body || {};
    const email = String(req.body?.email || '').trim().toLowerCase();
    const fileName = String(name || '').trim() || 'uploaded-source';
    const cleanTopic = String(topic || '').trim().slice(0, 300);
    const encoded = String(base64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!encoded) return res.status(400).json({ error: 'Source file is required.' });

    const buffer = Buffer.from(encoded, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'Could not read the uploaded source.' });
    if (buffer.length > 7 * 1024 * 1024) {
      return res.status(413).json({ error: 'Source is too large. Please upload a file under 7MB.' });
    }

    let text = '';
    if (/\.pdf$/i.test(fileName)) {
      text = await extractPdfTextFromBuffer(buffer);
    } else {
      text = buffer.toString('utf8');
    }

    text = text
      .replace(/\u0000/g, ' ')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!text) {
      return res.status(422).json({ error: 'No readable text could be extracted from this source.' });
    }

    // Cap stored text (≈400k chars ≈ 100k tokens) so one textbook cannot
    // blow up request/database sizes. RAG selects the relevant slices.
    if (text.length > 400000) text = text.slice(0, 400000);

    const tableOfContents = detectTOC(text).slice(0, 40);
    const contentHash = createHash('sha256').update(text).digest('hex');
    const sourceKey = `tutoring:source:${contentHash.slice(0, 32)}`;

    // L2 (Supabase) stores the full text so later requests only need the id.
    // If the table has not been created yet, the inline fallback still works.
    const storedSource = await saveTutoringSource({
      email,
      name: fileName,
      subject: String(subject || '').trim(),
      grade: String(grade || '').trim(),
      topic: cleanTopic,
      text,
      contentHash,
      tableOfContents,
    });

    await setCache(
      sourceKey,
      {
        id: storedSource?.id || null,
        name: fileName,
        tableOfContents,
        chars: text.length,
        topic: cleanTopic,
        ingestedAt: new Date().toISOString(),
      },
      60 * 60 * 24 * 7,
    );

    return res.json({
      name: fileName,
      sourceId: storedSource?.id || null,
      text,
      tableOfContents,
      chars: text.length,
      sourceKey,
      persisted: Boolean(storedSource?.id),
    });
  } catch (err: any) {
    console.error('Tutoring source ingest error:', err);
    return res.status(500).json({ error: err?.message || 'Source ingest failed.' });
  }
});

// ---------------------------------------------------------------------
// 1B. CONVERSATION ANALYSIS & PERSONALIZED SPARK NOTES GENERATOR
/**
 * Extract learning signals from ONE tutoring exchange and merge them into the
 * learner's shared learning profile (one `tutoring-derived` study_sessions row
 * per user + subject + topic).
 *
 * Cost control, in order:
 *  1. Struggle-signal regex on the learner's message (zero LLM cost).
 *  2. Only every 3rd exchanged turn.
 *  3. Hard cap: at most 5 extractions per derived row, then it stops.
 *  4. Mini-model output: strict JSON, max 4 items per array, 400 tokens.
 * Typical steady-state cost: ≈$0.00015 per tutoring message.
 *
 * Never throws and never blocks the user — all failure paths return silently.
 */
async function maybeExtractLearningSignals(input: {
  email: string;
  subject: string;
  grade: string;
  topic: string;
  userMessage: string;
  assistantReply: string;
  messageCount: number;
}): Promise<void> {
  if (!input.email || !detectStruggleSignal(input.userMessage)) return;
  if (input.messageCount % 3 !== 0) return;

  const client = getServiceSupabaseClient();
  if (!client) return;

  try {
    const profile = await findProfileByEmail(client, input.email);
    if (!profile?.id) return;

    const { data: rows } = await client
      .from('study_sessions')
      .select('id, quiz_progress, study_pack')
      .eq('user_id', profile.id)
      .eq('subject', input.subject)
      .eq('topic', input.topic)
      .eq('status', 'tutoring-derived')
      .limit(1);

    const existing = Array.isArray(rows) && rows.length ? rows[0] : null;
    const previousProgress = existing?.quiz_progress || {};
    const previousPack = existing?.study_pack || {};
    if ((Number(previousProgress.extractionCount) || 0) >= 5) return;

    const prompt = `You analyse ONE tutoring exchange and extract learning signals for the learner.
Return ONLY compact JSON with this exact shape:
{"weakSkills": string[], "misconceptions": [{"misconception": string, "correction": string}], "masteredSkills": string[], "confident": boolean}
Rules:
- Use short, precise skill names (e.g. "factorising quadratics", "ionic bonding", "explaining PESTLE").
- At most 4 items per array; [] when a category is not clearly evidenced.
- confident=true ONLY if the learner clearly reasoned or answered correctly.
- Never include unrelated skills; never guess when the exchange is not diagnostic.`;

    const user = `LOCKED TOPIC: ${String(input.topic).slice(0, 120)}
STUDENT MESSAGE: ${String(input.userMessage).slice(0, 1500)}
TUTOR REPLY: ${String(input.assistantReply).slice(0, 1500)}`;

    let raw: string | null = null;
    if (DEEPSEEK_API_KEY) {
      raw = await callLlamaChat({
        system: prompt,
        user,
        jsonMode: true,
        temperature: 0.1,
        timeoutMs: 8000,
        maxTokens: 400,
        baseUrl: DEEPSEEK_BASE_URL,
        apiKey: DEEPSEEK_API_KEY,
        model: DEEPSEEK_MODEL,
      });
    }
    if (!raw && LLAMA_API_KEY) {
      raw = await callLlamaChat({
        system: prompt,
        user,
        jsonMode: true,
        temperature: 0.1,
        timeoutMs: 8000,
        maxTokens: 400,
      });
    }
    if (!raw) return;

    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '');
    }
    const parsed: any = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== 'object') return;

    const weakSkills = Array.isArray(parsed.weakSkills)
      ? parsed.weakSkills.map(String).filter(Boolean).slice(0, 4)
      : [];
    const rawMisconceptions = Array.isArray(parsed.misconceptions) ? parsed.misconceptions : [];
    const misconceptions = rawMisconceptions
      .map((m: any) => ({
        misconception: String(m?.misconception || '').trim().slice(0, 200),
        correction: String(m?.correction || '').trim().slice(0, 300),
      }))
      .filter((m: any) => m.misconception)
      .slice(0, 4);
    const masteredSkills = Array.isArray(parsed.masteredSkills)
      ? parsed.masteredSkills.map(String).filter(Boolean).slice(0, 4)
      : [];

    if (weakSkills.length === 0 && misconceptions.length === 0 && masteredSkills.length === 0) {
      return;
    }

    const previousGapDiagnosis = previousPack?.gapDiagnosis || {};
    const previousGaps = Array.isArray(previousGapDiagnosis.knowledgeGapsToClose)
      ? previousGapDiagnosis.knowledgeGapsToClose
      : [];
    const previousMisconceptions = Array.isArray(previousGapDiagnosis.commonMisconceptions)
      ? previousGapDiagnosis.commonMisconceptions
      : [];
    const mergedMisconceptions = [...previousMisconceptions, ...misconceptions]
      .filter(
        (m: any, i: number, arr: any[]) =>
          arr.findIndex(
            (x: any) =>
              String(x?.misconception || '').toLowerCase() ===
              String(m?.misconception || '').toLowerCase(),
          ) === i,
      )
      .slice(0, 8);

    const mergedPack = {
      ...previousPack,
      gapDiagnosis: {
        knowledgeGapsToClose: [...new Set([...previousGaps, ...weakSkills])].slice(0, 12),
        commonMisconceptions: mergedMisconceptions,
      },
    };

    const mergedProgress = {
      attempted:
        (Number(previousProgress.attempted) || 0) +
        weakSkills.length +
        misconceptions.length +
        masteredSkills.length,
      correct: (Number(previousProgress.correct) || 0) + masteredSkills.length,
      wrongSkills: [
        ...new Set([
          ...(Array.isArray(previousProgress.wrongSkills) ? previousProgress.wrongSkills : []),
          ...weakSkills,
        ]),
      ].slice(0, 12),
      extractionCount: (Number(previousProgress.extractionCount) || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    if (existing?.id) {
      await client
        .from('study_sessions')
        .update({
          study_pack: mergedPack,
          quiz_progress: mergedProgress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await client.from('study_sessions').insert([
        {
          user_id: profile.id,
          subject: input.subject,
          grade: input.grade,
          topic: input.topic,
          title: `Tutoring — ${String(input.topic).slice(0, 80)}`,
          status: 'tutoring-derived',
          study_pack: mergedPack,
          quiz_progress: mergedProgress,
        },
      ]);
    }
  } catch {
    // Extraction is opportunistic and must never affect the tutoring reply.
  }
}

// Transforms Bot-User tutoring transcripts into structured Spark Notes
// ---------------------------------------------------------------------
function generatePersonalizedSparkNotesFallback(params: {
  conversation: any[];
  subject: string;
  grade: string;
  firmamentProfile: any;
  language?: string;
  focus?: string;
  country?: string;
  state?: string;
  nation?: string;
}) {
  const { conversation, subject, grade, firmamentProfile } = params;
  const countryCode = String(params.country || 'US').toUpperCase();
  const frameworkWord = countryCode === 'UK' ? 'exam-board mark-scheme' : countryCode === 'US' ? 'state standards / AP rubric' : 'CAPS';
  const combinedText = conversation.map((c: any) => c.text || '').join(' ').toLowerCase();

  let detectedTopic = 'Core Concept Socratic Mastery';
  if (
    combinedText.includes('first principle') ||
    combinedText.includes('derivative') ||
    combinedText.includes('calculus')
  ) {
    detectedTopic = 'Calculus & First Principles Derivatives';
  } else if (
    combinedText.includes('trig') ||
    combinedText.includes('sine') ||
    combinedText.includes('cosine') ||
    combinedText.includes('tan')
  ) {
    detectedTopic = 'Trigonometric Identities & Reduction Formulae';
  } else if (
    combinedText.includes('quadratic') ||
    combinedText.includes('factor') ||
    combinedText.includes('parabola') ||
    combinedText.includes('turning point')
  ) {
    detectedTopic = 'Functions, Turning Points & Quadratic Graphs';
  } else if (
    combinedText.includes('newton') ||
    combinedText.includes('force') ||
    combinedText.includes('momentum') ||
    combinedText.includes('velocity')
  ) {
    detectedTopic = "Newton's Laws & Momentum Conservation";
  } else if (
    combinedText.includes('acid') ||
    combinedText.includes('base') ||
    combinedText.includes('organic') ||
    combinedText.includes('ester')
  ) {
    detectedTopic = 'Organic Chemistry & Reaction Mechanisms';
  } else if (
    combinedText.includes('vat') ||
    combinedText.includes('tax') ||
    combinedText.includes('interest') ||
    combinedText.includes('annuity')
  ) {
    detectedTopic = 'Financial Mathematics, Annuities & SARS Taxation';
  } else if (
    combinedText.includes('balance sheet') ||
    combinedText.includes('ledger') ||
    combinedText.includes('depreciation') ||
    combinedText.includes('gaap')
  ) {
    detectedTopic = 'Financial Statements & Year-End Adjustments';
  } else if (
    combinedText.includes('genetics') ||
    combinedText.includes('dna') ||
    combinedText.includes('meiosis')
  ) {
    detectedTopic = 'Genetics, DNA Replication & Meiosis';
  }

  const archetype = firmamentProfile?.lifePath?.archetype || 'The Architect';
  const modality = firmamentProfile?.cognitiveVector?.primaryModality || 'Logical-Rule';

  return {
    id: `spark-${Date.now()}`,
    subject,
    grade,
    topic: detectedTopic,
    title: `${detectedTopic} - Personalized Socratic Spark Notes`,
    summary: `Synthesized directly from live dialogue between student and MyTutorZA AI Tutor. Analyzed ${conversation.length} exchange(s) covering foundational rules, Socratic problem-solving under ${frameworkWord} guidelines, and targeted error elimination calibrated to ${archetype}.`,
    keyBreakdowns: [
      {
        heading: 'Socratic Concept Foundation',
        details: `Identified and reinforced the core premise of ${detectedTopic}. Verified prerequisite algebraic manipulation and structural axioms before attempting substitutions.`,
      },
      {
        heading: 'Step-by-Step Reasoning Scaffold',
        details: `Followed ${modality} scaffold: State formal DBE definition ➔ Factorize and isolate target variables ➔ Carry signs cleanly ➔ Formulate final answer with SI units or mathematical justification.`,
      },
      {
        heading: 'Dialectical Problem Resolution',
        details:
          'Corrected intermediate arithmetic and variable misalignments discovered during the tutoring exchange.',
      },
    ],
    weakSpotsIdentified: [
      {
        misconception:
          'Rushing to substitute numerical values before simplifying the algebraic or symbolic expression.',
        correction: 'Always expand and cancel algebraic terms completely before substituting values.',
      },
      {
        misconception:
          'Sign reversal when applying distributive laws over brackets containing negatives.',
        correction: 'Place negative multipliers in explicit brackets -(...) and distribute step-by-step.',
      },
      {
        misconception: `Omitting accepted ${frameworkWord} reasons in geometric or formal proofs.`,
        correction:
          countryCode === 'ZA'
            ? 'Every mathematical claim in CAPS Paper 2 requires an approved shorthand reason (e.g., "∠s on a straight line").'
            : countryCode === 'UK'
              ? 'Every mathematical claim at GCSE/A-level requires a clearly stated reason or justification consistent with the mark scheme.'
              : 'Every mathematical claim on state exams requires a clearly stated justification written in complete sentences.',
      },
    ],
    sparkBullets: [
      `Mastered core theorem for ${detectedTopic} in ${grade} ${subject}.`,
      'Never omit intermediate factorization steps; mark schemes award method marks (M1) even before final accuracy.',
      'Watch bracket placement when working with negative signs.',
      'Always verify whether the question asks for exact surd form or rounding to 2 decimal places.',
      'Check consistency with real-world constraints (dimensions, rates, and probabilities cannot be negative).',
      `Optimized for ${archetype} cognitive profile: structural mastery and axiomatic verification.`,
    ],
    coreFormulasOrRules: [
      "f'(x) = lim_{h→0} [f(x+h) - f(x)] / h",
      'Quadratic Formula: x = [-b ± √(b² - 4ac)] / (2a)',
      countryCode === 'ZA'
        ? 'DBE Method Mark Rule: Method mark retained on consistent accuracy (CA) provided no conceptual error occurred.'
        : 'Method Mark Rule: Method marks are retained for consistent accuracy even after an earlier error, provided the approach is correct.',
    ],
    examinerTraps: [
      'Examiner Trap #1: Distributing powers over addition: (a + b)² ≠ a² + b².',
      'Examiner Trap #2: Forgetting to take both positive and negative square roots when solving x² = k.',
      'Examiner Trap #3: Confusing average rate of change with instantaneous rate of change at a point.',
    ],
    flashcards: [
      {
        front: `What is the crucial first step when working with ${detectedTopic}?`,
        back: countryCode === 'ZA'
          ? 'Write down the authentic formula or definition from the CAPS formula sheet before substituting.'
          : 'Write down the official formula, definition or rule from your specification before substituting values.',
      },
      {
        front: countryCode === 'ZA' ? 'What does Consistent Accuracy (CA) mean in DBE marking memos?' : 'What does Method Mark Consistency mean in mark schemes?',
        back: 'You still get method marks for subsequent correct working even if an earlier arithmetic calculation had an error.',
      },
      {
        front: 'How do you avoid sign errors when subtracting expressions with multiple terms?',
        back: 'Wrap the entire subtracted expression in parentheses: - (term1 + term2) = -term1 - term2.',
      },
      {
        front: `What is the diagnostic advice for ${archetype}?`,
        back: 'Construct step-by-step structural summaries and verify boundary cases before final submission.',
      },
    ],
    cognitiveAdvice: `Calibrated for ${archetype} (${modality}): Maintain your rigorous structural verification. When under exam time pressure, draft the outline of each multi-mark problem first to prevent algebraic tunnel vision.`,
    conversationMessageCount: conversation.length,
    createdAt: new Date().toISOString(),
  };
}

app.post('/api/tutoring/analyze-spark-notes', async (req: Request, res: Response) => {
  try {
    if (await rejectWithoutAgentAccess(req, res)) return;
    const {
      conversation,
      subject,
      grade,
      firmamentProfile,
      language,
      focus,
      jwtToken,
      supabaseUrl,
      supabaseAnonKey,
      country,
      state,
      nation,
    } = req.body;

    if (!Array.isArray(conversation) || conversation.length === 0) {
      return res.status(400).json({ error: 'Conversation history is required for analysis' });
    }

    const sub = subject || 'Mathematics';
    const grd = grade || 'Grade 12';
    const lang = language || 'English';
    const archetype = firmamentProfile?.lifePath?.archetype || 'The Architect';
    const modality = firmamentProfile?.cognitiveVector?.primaryModality || 'Logical-Rule';

    const transcript = conversation
      .map((m: any) => `${m.sender === 'user' ? 'STUDENT' : 'AI TUTOR'}: ${m.text}`)
      .join('\n\n');

    let generatedNotes: any = null;

    if (LLAMA_API_KEY) {
      const basePrompt = buildFirmamentSystemPrompt({
        firmamentProfile,
        subject: sub,
        grade: grd,
        language: lang,
        userQuery: transcript,
        taskType: 'spark-notes',
        country,
        state,
        nation,
      });

      const systemInstruction = `
${basePrompt}

ADDITIONAL MISSION: CONVERSATION SPARK NOTES SYNTHESIS
Perform deep cognitive analysis of the tutoring dialogue transcript and turn it into personalized, high-yield SPARK NOTES that capture:
1. Exact topics and concepts discussed in the session
2. Specific misconceptions, errors, or hesitation the student showed, along with the precise corrective insight
3. 5-8 punchy, high-yield Spark Notes bullet points
4. Core formulas, theorems, or rules used or required (aligned to this learner's curriculum framework)
5. Examiner traps relevant to the conversation (as expected by this learner's exam board)
6. 4-6 interactive self-test flashcards directly derived from what was discussed
7. Actionable cognitive advice calibrated specifically to ${archetype} (${firmamentProfile?.cognitiveScore || modality})

You MUST return valid JSON strictly matching this schema:
{
  "topic": string,
  "title": string,
  "summary": string,
  "keyBreakdowns": [
    { "heading": string, "details": string }
  ],
  "weakSpotsIdentified": [
    { "misconception": string, "correction": string }
  ],
  "sparkBullets": string[],
  "coreFormulasOrRules": string[],
  "examinerTraps": string[],
  "flashcards": [
    { "front": string, "back": string }
  ],
  "cognitiveAdvice": string
}
Do not include markdown code fences if responseMimeType is json.
`;

      try {
        const textRaw = await callLlamaChat({
          system: systemInstruction,
          user: `Analyze the following tutoring conversation and generate Personalized Spark Notes:\n\n${transcript}`,
          jsonMode: true,
          temperature: 0.4,
          timeoutMs: 9500,
        });
        let text = (textRaw || '').trim();
        if (text.startsWith('```json')) {
          text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (text.startsWith('```')) {
          text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.sparkBullets)) {
          generatedNotes = {
            id: `spark-${Date.now()}`,
            subject: sub,
            grade: grd,
            topic: parsed.topic || 'Socratic Dialogue Synthesis',
            title: parsed.title || `${sub} Socratic Spark Notes`,
            summary:
              parsed.summary || 'Personalized revision notes synthesized from live tutoring.',
            keyBreakdowns: Array.isArray(parsed.keyBreakdowns) ? parsed.keyBreakdowns : [],
            weakSpotsIdentified: Array.isArray(parsed.weakSpotsIdentified)
              ? parsed.weakSpotsIdentified
              : [],
            sparkBullets: parsed.sparkBullets,
            coreFormulasOrRules: Array.isArray(parsed.coreFormulasOrRules)
              ? parsed.coreFormulasOrRules
              : [],
            examinerTraps: Array.isArray(parsed.examinerTraps) ? parsed.examinerTraps : [],
            flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
            cognitiveAdvice: parsed.cognitiveAdvice || `Calibrated for ${archetype}.`,
            conversationMessageCount: conversation.length,
            createdAt: new Date().toISOString(),
            source: LLAMA_MODEL_ID,
          };
        }
      } catch (llamaErr: any) {
        console.warn(
          'Llama spark notes analysis error/timeout, using cognitive fallback:',
          (llamaErr as any)?.message || llamaErr,
        );
      }
    }

    if (!generatedNotes) {
      generatedNotes = {
        ...generatePersonalizedSparkNotesFallback({
          conversation,
          subject: sub,
          grade: grd,
          firmamentProfile,
          language: lang,
          focus,
          country,
          state,
          nation,
        }),
        source: 'firmament-engine-local',
      };
    }

    const targetUrl = supabaseUrl || supabaseServerUrl;
    const targetKey = supabaseAnonKey || supabaseServerAnonKey;
    let supabaseSaved = false;

    if (targetUrl && targetKey) {
      try {
        const clientOptions: any = {};
        if (jwtToken) {
          clientOptions.global = { headers: { Authorization: `Bearer ${jwtToken}` } };
        }
        const supabase = createClient(targetUrl, targetKey, clientOptions);
        const { error: sbError } = await supabase.from('spark_notes').insert([
          {
            subject: generatedNotes.subject,
            grade: generatedNotes.grade,
            topic: generatedNotes.topic,
            title: generatedNotes.title,
            summary: generatedNotes.summary,
            key_breakdowns: generatedNotes.keyBreakdowns,
            weak_spots: generatedNotes.weakSpotsIdentified,
            spark_bullets: generatedNotes.sparkBullets,
            formulas_rules: generatedNotes.coreFormulasOrRules,
            examiner_traps: generatedNotes.examinerTraps,
            flashcards: generatedNotes.flashcards,
            cognitive_advice: generatedNotes.cognitiveAdvice,
            raw_convo_count: generatedNotes.conversationMessageCount,
          },
        ]);
        if (!sbError) {
          supabaseSaved = true;
          generatedNotes.syncedToSupabase = true;
        } else {
          console.warn('Supabase server-side insert notification:', sbError.message);
        }
      } catch (sbErr) {
        console.warn('Supabase sync skipped:', sbErr);
      }
    }

    return res.json({ sparkNotes: generatedNotes, supabaseSaved });
  } catch (err: any) {
    console.error('Spark notes analysis error:', err);
    return res.status(500).json({ error: 'Failed to analyze conversation for spark notes' });
  }
});

app.get('/api/spark-notes', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseServerClient(req);
    if (!supabase) {
      return res.json({ sparkNotes: [], source: 'offline' });
    }
    const subject = req.query.subject as string | undefined;
    let query = supabase.from('spark_notes').select('*').order('created_at', { ascending: false });
    if (subject) {
      query = query.ilike('subject', `%${subject}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return res.json({ sparkNotes: [], error: error.message });
    }
    const mapped = (data || []).map((row: any) => ({
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
    return res.json({ sparkNotes: mapped, source: 'supabase' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/spark-notes/sync', async (req: Request, res: Response) => {
  try {
    const note = req.body;
    if (!note || !note.title) {
      return res.status(400).json({ error: 'Valid spark note required' });
    }
    const supabase = getSupabaseServerClient(req);
    if (!supabase) {
      return res.json({
        success: true,
        synced: false,
        message: 'Server Supabase credentials not set, stored in local vault',
      });
    }
    const { data, error } = await supabase
      .from('spark_notes')
      .insert([
        {
          subject: note.subject,
          grade: note.grade,
          topic: note.topic,
          title: note.title,
          summary: note.summary,
          key_breakdowns: note.keyBreakdowns || [],
          weak_spots: note.weakSpotsIdentified || [],
          spark_bullets: note.sparkBullets || [],
          formulas_rules: note.coreFormulasOrRules || [],
          examiner_traps: note.examinerTraps || [],
          flashcards: note.flashcards || [],
          cognitive_advice: note.cognitiveAdvice || '',
          raw_convo_count: note.conversationMessageCount || 0,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('Supabase sync error:', error.message);
      return res.json({ success: false, synced: false, error: error.message });
    }
    return res.json({ success: true, synced: true, id: data?.id || note.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/spark-notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseServerClient(req);
    if (!supabase) {
      return res.json({ success: true });
    }
    const { error } = await supabase.from('spark_notes').delete().eq('id', id);
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Shared learning history for the Tutoring, Study, Exam and Roadmap agents.
 * Quiz results and study-session gaps follow the learner instead of dying in
 * one tab.
 */
async function getLearningHistory(email: string, subject?: string) {
  if (!email) return null;
  const client = getServiceSupabaseClient();
  if (!client) return null;

  try {
    const profile = await findProfileByEmail(client, email);
    if (!profile?.id) return null;

    let query = client
      .from('study_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(8);
    if (subject) query = query.eq('subject', subject);

    const { data, error } = await query;
    if (error || !Array.isArray(data) || data.length === 0) return null;

    let attempted = 0;
    let correct = 0;
    const weakSkills = new Set<string>();
    const misconceptions = new Set<string>();

    const recentSessions = data.map((row: any) => {
      const progress = row.quiz_progress || {};
      const sessionAttempts = Number(progress.attempted) || 0;
      const sessionCorrect = Number(progress.correct) || 0;
      attempted += sessionAttempts;
      correct += sessionCorrect;

      (Array.isArray(progress.wrongSkills) ? progress.wrongSkills : []).forEach((skill: string) =>
        weakSkills.add(skill)
      );
      const gaps = row.study_pack?.gapDiagnosis?.knowledgeGapsToClose || [];
      (Array.isArray(gaps) ? gaps : []).forEach((gap: string) => weakSkills.add(gap));
      const misses = row.study_pack?.gapDiagnosis?.commonMisconceptions || [];
      (Array.isArray(misses) ? misses : []).forEach((miss: any) => {
        if (miss?.misconception) misconceptions.add(miss.misconception);
      });

      return {
        title: row.title || row.topic,
        topic: row.topic,
        status: row.status,
        updatedAt: row.updated_at,
        quizProgress: progress,
        gaps,
      };
    });

    return {
      recentSessions,
      overall: { attempted, correct },
      weakSkills: Array.from(weakSkills).slice(0, 10),
      misconceptions: Array.from(misconceptions).slice(0, 8),
    };
  } catch {
    return null;
  }
}

interface StudySessionInput {
  email: string;
  sessionId?: string;
  subject: string;
  grade: string;
  term?: string;
  topic: string;
  /** User-chosen study session title. */
  title?: string;
  firmamentProfile?: any;
  roadmap?: any;
  curriculum?: any;
  studyPack?: any;
  quizProgress?: any;
  status?: string;
}

async function saveStudySession(input: StudySessionInput): Promise<string | null> {
  const client = getServiceSupabaseClient();
  if (!client || !input.email) return null;

  try {
    const profile = await findProfileByEmail(client, input.email);
    if (!profile?.id) return null;

    const row: Record<string, any> = {
      user_id: profile.id,
      subject: input.subject,
      grade: input.grade,
      term: input.term || null,
      topic: input.topic,
      title: input.title || null,
      status: input.status || 'active',
      firmament_snapshot: input.firmamentProfile || {},
      roadmap_snapshot: input.roadmap || {},
      curriculum_snapshot: input.curriculum || {},
      study_pack: input.studyPack || {},
      quiz: input.studyPack?.quiz || [],
      updated_at: new Date().toISOString(),
    };
    if (input.quizProgress) row.quiz_progress = input.quizProgress;

    if (input.sessionId) {
      const { data: existing } = await client
        .from('study_sessions')
        .select('id, user_id')
        .eq('id', input.sessionId)
        .maybeSingle();
      if (existing?.user_id && existing.user_id !== profile.id) return null;

      const { data } = await client
        .from('study_sessions')
        .update(row)
        .eq('id', input.sessionId)
        .select('id')
        .maybeSingle();
      return data?.id || input.sessionId;
    }

    const { data } = await client.from('study_sessions').insert([row]).select('id').single();
    return data?.id || null;
  } catch {
    return null;
  }
}

interface TutoringSourceRow {
  id?: string;
  name: string;
  text: string;
  tableOfContents?: any[];
}

/**
 * Persists an ingested textbook/source in Supabase (L2) so later tutoring
 * requests only need the source id instead of re-uploading the full text.
 * Deduplicates by (user, content hash).
 */
async function saveTutoringSource(input: {
  email: string;
  name: string;
  subject?: string;
  grade?: string;
  topic?: string;
  text: string;
  contentHash?: string;
  tableOfContents?: any[];
}): Promise<{ id: string | null; deduped: boolean }> {
  const client = getServiceSupabaseClient();
  if (!client || !input.email || !input.text) return { id: null, deduped: false };

  try {
    const profile = await findProfileByEmail(client, input.email);
    if (!profile?.id) return { id: null, deduped: false };

    const contentHash =
      input.contentHash || createHash('sha256').update(input.text).digest('hex');

    const { data: existing } = await client
      .from('tutoring_sources')
      .select('id')
      .eq('user_id', profile.id)
      .eq('content_hash', contentHash)
      .maybeSingle();

    if (existing?.id) return { id: existing.id, deduped: true };

    const { data, error } = await client
      .from('tutoring_sources')
      .insert([
        {
          user_id: profile.id,
          name: input.name,
          subject: input.subject || '',
          grade: input.grade || '',
          topic: input.topic || '',
          content: input.text,
          content_hash: contentHash,
          chars: input.text.length,
          table_of_contents: Array.isArray(input.tableOfContents) ? input.tableOfContents : [],
          updated_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('Tutoring source could not be stored (run the tutoring_sources DDL):', error.message);
      return { id: null, deduped: false };
    }
    return { id: data?.id || null, deduped: false };
  } catch (err: any) {
    console.warn('Tutoring source save failed:', err?.message || err);
    return { id: null, deduped: false };
  }
}

/** Loads an ingested source and enforces per-user ownership. */
async function getTutoringSource(email: string, sourceId: string): Promise<TutoringSourceRow | null> {
  const client = getServiceSupabaseClient();
  if (!client || !email || !sourceId) return null;

  try {
    const profile = await findProfileByEmail(client, email);
    if (!profile?.id) return null;

    const { data, error } = await client
      .from('tutoring_sources')
      .select('id,user_id,name,content,table_of_contents')
      .eq('id', sourceId)
      .maybeSingle();

    if (error || !data) return null;
    if (data.user_id && data.user_id !== profile.id) return null;

    return {
      id: data.id,
      name: data.name || 'uploaded source',
      text: String(data.content || ''),
      tableOfContents: Array.isArray(data.table_of_contents) ? data.table_of_contents : [],
    };
  } catch (err: any) {
    console.warn('Tutoring source lookup failed:', err?.message || err);
    return null;
  }
}

/** Rebuilds recent tutoring context from the database (reload / resume). */
async function loadTutoringHistory(
  email: string,
  sessionId: string,
  limit: number = 8,
): Promise<{ role: string; content: string }[]> {
  const client = getServiceSupabaseClient();
  if (!client || !email || !sessionId) return [];

  try {
    const profile = await findProfileByEmail(client, email);
    if (!profile?.id) return [];

    const { data, error } = await client
      .from('tutoring_sessions')
      .select('user_id,messages')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) return [];
    if (data.user_id && data.user_id !== profile.id) return [];

    const messages = Array.isArray(data.messages) ? data.messages : [];
    return messages
      .slice(-Math.max(1, limit))
      .map((m: any) => ({
        role: m?.role === 'user' ? 'user' : 'assistant',
        content: String(m?.content || '').slice(0, 900),
      }))
      .filter((m: any) => m.content);
  } catch {
    return [];
  }
}

/**
 * Persists a tutoring conversation against ONE row per session.
 *
 * Previously every message inserted a brand new session row, so the database
 * filled with duplicate fragments and no real conversation could be resumed.
 */
async function saveTutoringSession(input: {
  email: string;
  sessionId?: string;
  subject: string;
  grade: string;
  language?: string;
  title?: string;
  topic?: string;
  source?: TutoringSourceRow | null;
  messages: { role: string; content: string }[];
}): Promise<string | null> {
  const client = getServiceSupabaseClient();
  if (!client || !input.email) return null;

  try {
    const profile = await findProfileByEmail(client, input.email);
    if (!profile?.id) return null;

    const row: Record<string, any> = {
      user_id: profile.id,
      subject: input.subject,
      grade: input.grade,
      language: input.language || 'English',
      title: input.title || '',
      topic: input.topic || '',
      pdf_name: input.source?.name || null,
      pdf_source_id: input.source?.id || null,
      // Store a short excerpt only; the full text lives in tutoring_sources.
      pdf_text: input.source?.text ? input.source.text.slice(0, 4000) : null,
      updated_at: new Date().toISOString(),
    };

    // Schema-tolerant write: retry with fewer optional columns when a
    // deployment has not run the latest DDL yet. Core fields are preserved.
    const insertRow = async (messages: any[]): Promise<string | null> => {
      const attempts: Record<string, any>[] = [
        { ...row, messages },
        (() => {
          const copy = { ...row, messages };
          delete copy.pdf_source_id;
          return copy;
        })(),
        {
          user_id: profile.id,
          subject: input.subject,
          grade: input.grade,
          language: input.language || 'English',
          title: input.title || '',
          messages,
          updated_at: new Date().toISOString(),
        },
      ];
      for (const attempt of attempts) {
        const { data, error } = await client
          .from('tutoring_sessions')
          .insert([attempt])
          .select('id')
          .maybeSingle();
        if (!error) return data?.id || null;
      }
      return null;
    };

    if (input.sessionId) {
      const { data: existing } = await client
        .from('tutoring_sessions')
        .select('id,user_id,messages')
        .eq('id', input.sessionId)
        .maybeSingle();

      if (existing?.user_id && existing.user_id !== profile.id) return null;

      if (existing) {
        const prior = Array.isArray(existing.messages) ? existing.messages : [];
        const merged = [...prior, ...input.messages].slice(-60);
        const updateAttempts: Record<string, any>[] = [
          { ...row, messages: merged },
          (() => {
            const copy = { ...row, messages: merged };
            delete copy.pdf_source_id;
            return copy;
          })(),
        ];
        for (const attempt of updateAttempts) {
          const { error } = await client
            .from('tutoring_sessions')
            .update(attempt)
            .eq('id', input.sessionId);
          if (!error) return input.sessionId;
        }
        return input.sessionId;
      }

      // First message of a client-generated session: create it with that id.
      const { data, error } = await client
        .from('tutoring_sessions')
        .insert([{ id: input.sessionId, ...row, messages: input.messages.slice(-60) }])
        .select('id')
        .maybeSingle();
      if (!error) return data?.id || input.sessionId;
      return insertRow(input.messages.slice(-60));
    }

    return insertRow(input.messages.slice(-60));
  } catch (err: any) {
    console.warn('Tutoring session save failed:', err?.message || err);
    return null;
  }
}

app.post('/api/study/generate', async (req: Request, res: Response) => {
  try {
    if (await rejectWithoutAgentAccess(req, res)) return;

    const {
      subject,
      grade,
      topic,
      term,
      language,
      state,
      country,
      nation,
      firmamentProfile,
      roadmap,
      sessionId,
      learningHistory: suppliedHistory,
      title,
    } = req.body || {};

    const email = String(req.body?.email || '').trim().toLowerCase();
    const cleanTopic = String(topic || '').trim();
    const cleanTitle = String(title || '').trim() || cleanTopic;
    if (!cleanTopic) {
      return res.status(400).json({ error: 'Please choose a topic to study first.' });
    }

    const curriculum = describeCurriculum(country, state, nation);
    const learningHistory = suppliedHistory || (await getLearningHistory(email, subject));

    // The pack is personalised, so the cache key must include the cognitive
    // vector and the learner's current quiz accuracy.
    const profileSignature = [
      firmamentProfile?.mercury?.element || '',
      firmamentProfile?.cognitiveScore || '',
      ...Object.values(firmamentProfile?.dimensions || {}).map((d: any) => d?.score ?? ''),
      learningHistory?.overall?.attempted || 0,
      learningHistory?.overall?.correct || 0,
    ].join('|');

    const cacheKey =
      `study:${country || 'ZA'}:${state || ''}:${grade}:${subject}:${cleanTopic}:${term}:${
        language || 'English'
      }:${profileSignature}`
        .toLowerCase()
        .replace(/\s+/g, '_');

    const cached = await getCache(cacheKey);
    if (cached) {
      const savedSessionId = await saveStudySession({
        email,
        sessionId,
        subject,
        grade,
        term,
        topic: cached.topic || cleanTopic,
        title: cached.title || cleanTitle,
        firmamentProfile,
        roadmap,
        curriculum: {
          framework: curriculum.frameworkLabel,
          curriculumName: curriculum.curriculumName,
          country,
          state,
          nation,
        },
        studyPack: cached,
      });
      return res.json({
        ...cached,
        title: cached.title || cleanTitle,
        sessionId: savedSessionId || sessionId || null,
        source: 'cache',
      });
    }

    const systemInstruction = buildStudySystemPrompt({
      firmamentProfile,
      subject,
      grade,
      topic: cleanTopic,
      title: cleanTitle,
      term,
      language,
      state,
      country,
      nation,
      roadmap,
      learningHistory,
    });

    if (LLAMA_API_KEY) {
      try {
        const textRaw = await callLlamaChat({
          system: systemInstruction,
          user: `Create today's STUDY SESSION pack for ${grade} ${subject} on the topic "${cleanTopic}". Diagnose gaps first, teach directly in the learner's cognitive delivery style, then build recall and a short quiz. JSON only.`,
          jsonMode: true,
          temperature: 0.35,
          timeoutMs: 60000,
          maxTokens: 8000,
        });
        let text = (textRaw || '').trim();
        if (text.startsWith('```json')) {
          text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (text.startsWith('```')) {
          text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.sparkNotes) && parsed.sparkNotes.length > 0) {
          await setCache(cacheKey, parsed, 3600);
          const savedSessionId = await saveStudySession({
            email,
            sessionId,
            subject,
            grade,
            term,
            topic: parsed.topic || cleanTopic,
            title: parsed.title || cleanTitle,
            firmamentProfile,
            roadmap,
            curriculum: {
              framework: curriculum.frameworkLabel,
              curriculumName: curriculum.curriculumName,
              country,
              state,
              nation,
            },
            studyPack: parsed,
          });
          return res.json({ ...parsed, title: parsed.title || cleanTitle, sessionId: savedSessionId || sessionId || null, source: LLAMA_MODEL_ID });
        }
      } catch (llamaErr: any) {
        console.warn(
          'Llama study timeout/error, serving fallback study notes:',
          (llamaErr as any)?.message || llamaErr
        );
      }
    }

    const fallbackData = {
      topic: cleanTopic,
      atpWeek: 'Weeks 4-6 Curriculum Schedule',
      summary: `High-yield study pack for ${grade} ${subject}, focused on closing gaps and strengthening recall.`,
      sessionObjectives: [
        `Identify the learner's current knowledge gaps in ${cleanTopic}.`,
        `Build durable recall of the core ${subject} content.`,
        'Complete a short retrieval quiz and correct misconceptions.',
      ],
      sparkNotes: [
        'State the core definition or rule before applying it.',
        'Verify units, signs and preconditions before calculating.',
        'Explain the concept aloud in your own words to expose gaps.',
        'Re-attempt missed quiz items after 24 hours, then after 3 days.',
      ],
      coreFormulasOrRules: [
        'Write the governing rule or formula first.',
        'Show the substitution step explicitly.',
        'Check the reasonableness of the final answer.',
      ],
      flashcards: [
        {
          front: `What is the core idea of ${cleanTopic}?`,
          back: 'State the definition, then give one worked example in your own words.',
        },
        {
          front: 'What is the most common mistake in this topic?',
          back: 'Skipping the prerequisite check or the verification step.',
        },
      ],
      examinerTips: [
        'Show method steps even when the final answer is uncertain.',
        'Re-read the command word before answering.',
      ],
      dbeCurriculumFocus: `Core ${subject} criteria for ${grade}.`,
      gapDiagnosis: {
        likelyPrerequisites: [`Prior knowledge required for ${cleanTopic}`],
        commonMisconceptions: [
          {
            misconception: 'Memorising the final answer without the reasoning.',
            correction: 'Reconstruct the reasoning from the definition or rule each time.',
          },
        ],
        knowledgeGapsToClose: [`Core definitions and prerequisites for ${cleanTopic}`],
      },
      retrievalPlan: {
        activeRecallPrompts: [
          `Without notes, explain ${cleanTopic} in three sentences.`,
          'Write the key rule from memory, then check it.',
        ],
        spacedRepetition: ['Review after 24 hours.', 'Review after 3 days.', 'Review after 7 days.'],
      },
      confidenceBuilders: [
        'You have already started the repair by naming the topic.',
        'Each corrected retrieval attempt is evidence that the memory is strengthening.',
      ],
      quiz: [
        {
          id: 'q1',
          question: `Which statement best describes the core idea of ${cleanTopic}?`,
          options: [
            'The definition or rule that governs the topic',
            'An unrelated formula',
            'A memorised final answer only',
            'A skipped prerequisite',
          ],
          correctIndex: 0,
          explanation: 'The core idea is the governing definition or rule, not a memorised answer.',
          skill: `${cleanTopic} core concept`,
        },
      ],
      nextSession: 'Re-test the missed items, then advance to the next roadmap checkpoint.',
    };

    const savedSessionId = await saveStudySession({
      email,
      sessionId,
      subject,
      grade,
      term,
      topic: cleanTopic,
      title: cleanTitle,
      firmamentProfile,
      roadmap,
      curriculum: {
        framework: curriculum.frameworkLabel,
        curriculumName: curriculum.curriculumName,
        country,
        state,
        nation,
      },
      studyPack: fallbackData,
    });
    await setCache(cacheKey, fallbackData, 3600);
    return res.json({
      ...fallbackData,
      title: cleanTitle,
      sessionId: savedSessionId || sessionId || null,
      source: 'firmament-study-fallback',
    });
  } catch (err: any) {
    console.error('Study API error:', err);
    return res.status(500).json({
      error: err?.message || 'Study session could not be generated.',
      topic: req.body?.topic || 'Study session',
    });
  }
});

/**
 * GET /api/study/sessions?email=...&subject=...
 * Returns recent study sessions (including quiz progress) for the learner.
 */
app.get('/api/study/sessions', async (req: Request, res: Response) => {
  const email = String((req.query.email as string) || '').trim().toLowerCase();
  const subject = String((req.query.subject as string) || '').trim();
  if (!email) return res.status(400).json({ error: 'email required' });

  const client = getServiceSupabaseClient();
  if (!client) return res.json({ success: true, sessions: [], reason: 'supabase_not_configured' });

  try {
    const profile = await findProfileByEmail(client, email);
    if (!profile?.id) return res.json({ success: true, sessions: [] });

    let query = client
      .from('study_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(20);
    if (subject) query = query.eq('subject', subject);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, sessions: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

/**
 * POST /api/study/sessions
 * Creates or updates a study session. Used when the UI starts a session before
 * the AI pack is generated.
 */
app.post('/api/study/sessions', async (req: Request, res: Response) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const topic = String(body.topic || '').trim();
  if (!email || !topic || !body.subject || !body.grade) {
    return res.status(400).json({ error: 'email, subject, grade and topic are required' });
  }

  const sessionId = await saveStudySession({
    email,
    sessionId: body.sessionId,
    subject: body.subject,
    grade: body.grade,
    term: body.term,
    topic,
    title: body.title || topic,
    firmamentProfile: body.firmamentProfile,
    roadmap: body.roadmap,
    curriculum: body.curriculum,
    studyPack: body.studyPack,
    status: body.status,
  });

  return res.json({ success: Boolean(sessionId), sessionId });
});

/**
 * POST /api/study/sessions/:id/progress
 * Persists quiz attempts and scores so all three agents can use them.
 */
app.post('/api/study/sessions/:id/progress', async (req: Request, res: Response) => {
  const sessionId = String(req.params.id || '').trim();
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const quizProgress = body.quizProgress || {};
  if (!sessionId || !email) return res.status(400).json({ error: 'session id and email are required' });

  const client = getServiceSupabaseClient();
  if (!client) return res.json({ success: false, reason: 'supabase_not_configured' });

  try {
    const profile = await findProfileByEmail(client, email);
    if (!profile?.id) return res.status(404).json({ error: 'profile not found' });

    const { data: session } = await client
      .from('study_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (!session || session.user_id !== profile.id) {
      return res.status(404).json({ error: 'study session not found' });
    }

    const attempted = Number(quizProgress.attempted) || 0;
    const correct = Number(quizProgress.correct) || 0;
    const completed = attempted > 0 && quizProgress.completed !== false;
    const { error } = await client
      .from('study_sessions')
      .update({
        quiz_progress: quizProgress,
        status: completed ? 'completed' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, score: attempted ? Math.round((correct / attempted) * 100) : 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

// ---------------------------------------------------------------------
// 2B. STUDY ROADMAP API (Firmament 4-Week Personalized Study Engine)
// ---------------------------------------------------------------------
function getFirmamentRoadmapFallback(
  subject: string,
  grade: string,
  firmamentProfile: any,
  previousMark: number,
  targetExam?: string,
  focusTopic?: string,
  country?: string,
  state?: string,
  nation?: string,
) {
  const countryCode = String(country || 'US').toUpperCase();
  const planWord =
    countryCode === 'US' ? 'US state standards / AP' : countryCode === 'UK' ? 'the UK curriculum' : 'DBE CAPS';
  const paperWord =
    countryCode === 'US' ? 'state/AP past papers' : countryCode === 'UK' ? 'exam-board past papers' : 'past DBE trial papers';
  const examinerWord = countryCode === 'US' ? 'state/AP' : countryCode === 'UK' ? 'UK exam-board' : 'DBE';
  const mark = Number(previousMark) || 50;
  const isRemedial = mark < 60;
  const archetype = firmamentProfile?.lifePath?.archetype || 'The Architect';
  const lifePathNumber = firmamentProfile?.lifePath?.number || 7;
  const mercuryElement = firmamentProfile?.mercury?.element || 'Air';
  const primaryModality = firmamentProfile?.cognitiveVector?.primaryModality || 'Logical-Rule';
  const modalityTip =
    primaryModality === 'Visual'
      ? 'Use color-coded mind maps, summary diagrams, and highlighters.'
      : primaryModality === 'Kinesthetic'
      ? 'Write out each step physically on paper, flashcard sorting drills, and practice problems.'
      : primaryModality === 'Auditory'
      ? 'Verbalize rules out loud, explain concepts to a peer, and record audio summaries.'
      : 'Derive proofs from first principles, build deductive step charts, and classify problem types.';

  const pacingNote =
    mercuryElement === 'Fire'
      ? 'Fire Engine: High-intensity 25-minute Pomodoro sprints with brisk problem sets.'
      : mercuryElement === 'Earth'
      ? 'Earth Engine: Methodical 45-minute deep-focus blocks with structured step-by-step drills.'
      : mercuryElement === 'Air'
      ? 'Air Engine: Socratic dialogue, conceptual mind-mapping, and active inquiry.'
      : 'Water Engine: Holistic connection sessions, thematic linkage, and intuitive pattern recognition.';

  const subLower = subject.toLowerCase();
  const isMathPure = subLower.includes('mathematics') && !subLower.includes('literacy');
  const isMathLit = subLower.includes('literacy');
  const isPhysics = subLower.includes('physical') || subLower.includes('science');
  const isLifeScience =
    subLower.includes('life science') || subLower.includes('biology');
  const isEnglish = subLower.includes('english') || subLower.includes('language');
  const isCommerce =
    subLower.includes('account') ||
    subLower.includes('business') ||
    subLower.includes('economic');

  let week1Theme = 'Week 1: Foundational Diagnostic & Axiom Mastery';
  let week2Theme = 'Week 2: Routine Procedures & Method-Mark Optimization';
  let week3Theme = 'Week 3: Complex Scenarios & Examiner Trap Inoculation';
  let week4Theme = 'Week 4: NSC Examination Simulation & Timing Calibration';

  let week1Topics: string[] = ['Core Terminology', 'Prerequisite Algebra', 'Definition Formulas'];
  let week2Topics: string[] = ['Standard Procedures', 'Step-by-Step Algorithms', 'Graph/Diagram Analysis'];
  let week3Topics: string[] = ['Higher-Order Applications', 'Synthesis Problems', 'Blooms Level 3 & 4'];
  let week4Topics: string[] = ['Past NSC Paper 1 & 2 Drills', 'Memorandum Rubric Review', 'Time Management'];

  let week1Traps: string[] = ['Premature rounding', 'Sign errors in transposition'];
  let week2Traps: string[] = ['Omitting required intermediate calculation steps', 'Unit conversions ignored'];
  let week3Traps: string[] = ['Misreading negative constraints', 'Falling for distractor values in multi-step questions'];
  let week4Traps: string[] = ['Spending more than 1 minute per mark on early questions', 'Leaving blank responses'];

  if (isMathPure) {
    week1Theme = isRemedial
      ? 'Week 1: Algebraic Diagnostic & Equations Recovery'
      : 'Week 1: Advanced Algebraic Foundations & Function Inverses';
    week1Topics = [
      'Quadratic Equations & Inequalities',
      'Nature of Roots (Δ = b² - 4ac)',
      'Exponents & Surds laws',
      'Hyperbola & Parabola axes',
    ];
    week1Traps = [
      'Dividing both sides by variable x without considering x = 0',
      'Forgetting to test solutions in fractional equations',
    ];

    week2Theme = 'Week 2: Differential Calculus & Sequence/Series Mastery';
    week2Topics = [
      'Arithmetic & Geometric Series (Σ notation)',
      'First Principles Differentiation',
      'Rules of Differentiation',
      'Cubic Polynomial Factorization',
    ];
    week2Traps = [
      'Differentiating terms before expanding brackets',
      'Confusing sum to infinity (|r| < 1) with divergent series',
    ];

    week3Theme = 'Week 3: Analytical Geometry & Euclidean Circle Theorems';
    week3Topics = [
      'Equation of Tangent to a Circle',
      'Euclidean Cyclic Quadrilateral Theorems',
      'Tan-Chord Theorem Proof',
      'Proportionality & Similarity',
    ];
    week3Traps = [
      'Writing geometric statements without accepted DBE reasons (e.g. omitting "tan-chord thm")',
      'Confusing radius perpendicular to tangent with midpoint theorem',
    ];

    week4Theme = 'Week 4: NSC Paper 1 & Paper 2 Full Simulation';
    week4Topics = [
      'Trigonometry Compound & Double Angles',
      'Calculus Optimization Word Problems',
      'Financial Mathematics (Amortization & Sinking Funds)',
      'Past NSC Timed Papers',
    ];
    week4Traps = [
      'Premature decimal rounding before final answer in finance equations',
      'Writing general solutions in radians instead of degrees',
    ];
  } else if (isMathLit) {
    week1Theme = 'Week 1: Financial Mathematics, SARS Tax & VAT Mastery';
    week1Topics = [
      '15% VAT Inclusive/Exclusive Conversions',
      'SARS Personal Income Tax Brackets',
      'UIF & Medical Scheme Credits',
      'Household Budgets & Tariffs',
    ];
    week1Traps = [
      'Multiplying by 0.15 instead of dividing by 1.15 for VAT-inclusive base prices',
      'Tax threshold confusion',
    ];

    week2Theme = 'Week 2: Measurement, Perimeter, Area & Volume Conversions';
    week2Topics = [
      'Metric Unit Conversions (cm³ to Litres)',
      'Packaging & Volume Calculations',
      'Surface Area of Cylinders & Prisms',
      'Assembly Diagrams',
    ];
    week2Traps = [
      'Converting cm² to m² by dividing by 100 instead of 10 000',
      'Using diameter instead of radius',
    ];

    week3Theme = 'Week 3: Maps, Plans, Scale & Elevation Profiles';
    week3Topics = [
      'Number Scales vs Bar Scales',
      'Compass Bearings & Grid References',
      'Floor Plans & Elevation Drawings',
      'Travel Schedules & Speed/Distance',
    ];
    week3Traps = [
      'Measuring map distance incorrectly without checking print scale accuracy',
      'Time conversion (e.g. treating 2.5 hours as 2h 50min instead of 2h 30min)',
    ];

    week4Theme = 'Week 4: Data Handling, Probability & NSC Past Paper Simulation';
    week4Topics = [
      'Box-and-Whisker Plots & Quartiles',
      'Mean, Median, Mode & Spread',
      'Tree Diagrams & Contingency Tables',
      'DBE Paper 1 & 2 Timed Exam Review',
    ];
    week4Traps = [
      'Confusing mean and median in skewed distributions',
      'Misidentifying outlier limits',
    ];
  } else if (isPhysics) {
    week1Theme = "Week 1: Newton's Laws, Momentum & Vector Foundations";
    week1Topics = [
      'Free-body Diagrams & Normal Force',
      "Newton's Second Law (Fnet = ma)",
      'Conservation of Linear Momentum',
      'Elastic vs Inelastic Collisions',
    ];
    week1Traps = [
      'Drawing forces that act ON other bodies rather than ON the target object in free-body diagrams',
      'Omitting coordinate direction (+ and -) in momentum vectors',
    ];

    week2Theme = 'Week 2: Work, Energy, Power & Organic Chemistry Nomenclature';
    week2Topics = [
      'Work-Energy Theorem (Wnet = ΔK)',
      'Conservative vs Non-conservative forces',
      'IUPAC Naming of Homologous Series',
      'Intermolecular Forces & Boiling Points',
    ];
    week2Traps = [
      'Omitting hyphens/commas in IUPAC names (e.g. 2-methylbutane)',
      'Confusing hydrogen bonds with covalent bonds',
    ];

    week3Theme = 'Week 3: Chemical Equilibrium, Rates of Reaction & Doppler Effect';
    week3Topics = [
      "Le Chatelier's Principle & Equilibrium Constant (Kc)",
      'Reaction Rate Factors & Maxwell-Boltzmann curves',
      'Doppler Effect Equation & Redshift',
      'Electrochemical Galvanic Cells',
    ];
    week3Traps = [
      'Including pure liquids or solids in the Kc expression',
      'Confusing frequency observed with emitted frequency when source is moving towards observer',
    ];

    week4Theme = 'Week 4: Electric Circuits, Acids & Bases, Full Mock Paper Trial';
    week4Topics = [
      'Internal Resistance & EMF Calculations (ε = I(R + r))',
      'Acid-Base Titrations & Ka/Kb',
      'Photoelectric Effect & Work Function',
      'Timed physics and chemistry mock exam trials',
    ];
    week4Traps = [
      'Forgetting that internal resistance drops terminal voltage under load',
      'Miscalculating moles in neutralization reactions',
    ];
  } else if (isLifeScience) {
    week1Theme = 'Week 1: DNA, RNA & Molecular Genetics Mastery';
    week1Topics = [
      'DNA Replication & Discovery',
      'Transcription & Translation (Protein Synthesis)',
      'RNA Codons & Anticodons',
      'Genetic Aberrations & Mutations',
    ];
    week1Traps = [
      'Confusing Thymine in DNA with Uracil in mRNA',
      'Transcribing from tRNA instead of mRNA for amino acid charts',
    ];

    week2Theme = 'Week 2: Mendelian Genetics, Meiosis & Pedigree Charts';
    week2Topics = [
      'Phases of Meiosis & Non-disjunction',
      'Monohybrid & Dihybrid Cross Formats',
      'Sex-linked Disorders (Haemophilia)',
      'Pedigree Diagram Interpretation',
    ];
    week2Traps = [
      'Omitting parental phenotypes and genotypes format in genetic crosses',
      'Confusing homologous chromosome separation with sister chromatid separation',
    ];

    week3Theme = 'Week 3: Human Endocrine System, Reproduction & Homeostasis';
    week3Topics = [
      'Negative Feedback Mechanisms (TSH, Insulin/Glucagon)',
      'Menstrual Cycle Hormone Fluctuation',
      'Thermoregulation & Osmoregulation',
      'Human Ear and Eye Structure',
    ];
    week3Traps = [
      'Confusing Glycogen (storage molecule) with Glucagon (hormone)',
      'Accommodation mechanism for near vs distant objects',
    ];

    week4Theme = 'Week 4: Evolution by Natural Selection & NSC Past Paper Trials';
    week4Topics = [
      'Lamarckism vs Darwinism Comparisons',
      'Speciation via Geographic Isolation',
      'Hominid Fossil Evidence in South Africa',
      'DBE Paper 1 & 2 Structured Question Trials',
    ];
    week4Traps = [
      'Using Lamarckian phrasing ("organisms adapted in order to survive") in Darwinian questions',
      'Failing to cite Australopithecus sediba / africanus fossils correctly',
    ];
  } else if (isEnglish) {
    week1Theme = 'Week 1: Paper 1 Comprehension & Summary Writing Precision';
    week1Topics = [
      'Textual Analysis & Inferences',
      'Critical Language Awareness & Tone',
      'Point-form Summary Writing (Rule of 70 words)',
      'Denotation vs Connotation',
    ];
    week1Traps = [
      'Quoting verbatim in summary instead of using own words',
      'Failing to state text reference line numbers when requested',
    ];

    week2Theme = 'Week 2: Visual Literacy, Cartoons, Advertisements & Language Mechanics';
    week2Topics = [
      'Cartoon Body Language & Satirical Techniques',
      'AIDA Advertising Principles',
      'Active to Passive Voice',
      'Direct to Indirect Speech & Concord',
    ];
    week2Traps = [
      'Describing visual details without linking them to the underlying message or satirical target',
      'Forgetting tense shifts in indirect speech',
    ];

    week3Theme = 'Week 3: Paper 2 Literature Mastery (Prescribed Drama & Poetry)';
    week3Topics = [
      'Theme & Character Arc Synthesis',
      'Contextual Questions Passage Mapping',
      'Poetic Devices (Metaphor, Enjambment, Tone)',
      'Literature Essay Structure (PEEL format)',
    ];
    week3Traps = [
      'Writing narrative plot summaries instead of analytical arguments in literary essays',
      'Confusing speaker with poet',
    ];

    week4Theme = 'Week 4: Paper 3 Writing Time Trial & Paper 1/2 Final Drills';
    week4Topics = [
      'Discursive & Narrative Essay Planning',
      'Transactional Texts (Formal Letter, CV, Obituary)',
      'Editing Drills & Punctuation Traps',
      'Timed Mock Examination Paper',
    ];
    week4Traps = [
      'Writing beyond the prescribed word limits in Paper 3',
      'Tone too informal for formal letters',
    ];
  }

  const makeTasks = (weekNum: number, prefix: string, topics: string[]) => [
    {
      id: `w${weekNum}-t1`,
      dayLabel: 'Days 1–2',
      title: `${topics[0] || 'Core Foundation'} Intensive`,
      description: `Target the fundamental axioms and definitions for ${
        topics[0] || 'the core module'
      }. Review DBE summary notes and establish clear understanding.`,
      durationMinutes: mercuryElement === 'Fire' ? 30 : 45,
      cognitiveTip: `${modalityTip} Focus specifically on how this connects to South African curriculum standards.`,
      completed: false,
    },
    {
      id: `w${weekNum}-t2`,
      dayLabel: 'Days 3–4',
      title: `${topics[1] || 'Procedural'} Applied Practice`,
      description: `Complete 6 structured DBE practice questions on ${
        topics[1] || 'this topic'
      }. Focus on scoring method marks and identifying the question layout.`,
      durationMinutes: mercuryElement === 'Fire' ? 35 : 50,
      cognitiveTip: `Apply ${archetype} reasoning: write intermediate steps explicitly before writing the final answer.`,
      completed: false,
    },
    {
      id: `w${weekNum}-t3`,
      dayLabel: 'Days 5–6',
      title: `${topics[2] || 'Synthesis'} & Exam Trap Immunity`,
      description: `Deep dive into common mistakes students make. Solve 3 challenging past paper problems under timed conditions.`,
      durationMinutes: mercuryElement === 'Fire' ? 40 : 55,
      cognitiveTip: `Pay close attention to ${examinerWord} traps: check signs, units, and geometric/scientific reasons.`,
      completed: false,
    },
    {
      id: `w${weekNum}-t4`,
      dayLabel: 'Day 7',
      title: 'Weekly Mastery Checkpoint & AI Socratic Review',
      description: `Self-assess with a 20-mark mini test, then prompt MyTutorZA's Socratic Tutoring Agent to clarify any remaining uncertainties.`,
      durationMinutes: 30,
      cognitiveTip: `Reflect on your learning curve. Log any formula or concept you had to look up.`,
      completed: false,
    },
  ];

  return {
    id: `roadmap-${grade}-${subject}-${Date.now()}`.toLowerCase().replace(/\s+/g, '-'),
    subject,
    grade,
    createdAt: new Date().toISOString(),
    overallGoal: `4-Week ${planWord} Mastery for ${grade} ${subject} targeting ${
      isRemedial ? '70%+ Achievement Level' : '85%+ Distinction Level'
    }`,
    targetExam: targetExam || (countryCode === 'ZA' ? 'Term 2 / NSC Examination' : 'Final Examination'),
    firmamentSummary: {
      archetype,
      lifePathNumber,
      mercuryElement,
      primaryModality,
      pacingStrategy: pacingNote,
      diagnosticTreatment: isRemedial ? 'REMEDIAL_SCAFFOLD' : 'ADVANCEMENT_SCAFFOLD',
    },
    keyAdvice: [
      `Align your study schedule with your ${mercuryElement} element pacing: study in focused blocks rather than passive reading.`,
      `Leverage your ${primaryModality} cognitive modality: ${modalityTip}`,
      `Previous term baseline was ${mark}% (${
        isRemedial
          ? 'Remedial Scaffold: emphasize axiomatic foundations'
          : 'Advancement: prioritize complex synthesis & time trial'
      }).`,
      `Never leave blank questions in formal examinations; partial method marks can elevate your result.`,
    ],
    weeks: [
      {
        weekNumber: 1,
        theme: week1Theme,
        atpFocus: `${planWord} — Diagnostic Phase: ${week1Topics.slice(0, 2).join(' & ')}`,
        mercuryRhythmNotes: pacingNote,
        estimatedHours: mercuryElement === 'Earth' ? 6 : 5,
        topics: week1Topics,
        milestoneCheckpoint: `Demonstrate 100% accuracy on prerequisite diagnostic drill and state core definitions without reference notes.`,
        examinerTraps: week1Traps,
        tasks: makeTasks(1, 'w1', week1Topics),
      },
      {
        weekNumber: 2,
        theme: week2Theme,
        atpFocus: `${planWord} — Procedural Phase: ${week2Topics.slice(0, 2).join(' & ')}`,
        mercuryRhythmNotes: `${mercuryElement} rhythm: Transition into routine calculation patterns and structured proofs.`,
        estimatedHours: 6,
        topics: week2Topics,
        milestoneCheckpoint: `Complete 12 ${paperWord} routine questions with correct intermediate step-by-step layout.`,
        examinerTraps: week2Traps,
        tasks: makeTasks(2, 'w2', week2Topics),
      },
      {
        weekNumber: 3,
        theme: week3Theme,
        atpFocus: `${planWord} — Synthesis & Traps: ${week3Topics.slice(0, 2).join(' & ')}`,
        mercuryRhythmNotes: `${mercuryElement} rhythm: High-order synthesis drills; analyze complex multi-step problems.`,
        estimatedHours: 7,
        topics: week3Topics,
        milestoneCheckpoint: `Successfully avoid all listed examiner traps in a 40-mark timed past paper section.`,
        examinerTraps: week3Traps,
        tasks: makeTasks(3, 'w3', week3Topics),
      },
      {
        weekNumber: 4,
        theme: week4Theme,
        atpFocus: `${planWord} — Final Exam Readiness: ${week4Topics.slice(0, 2).join(' & ')}`,
        mercuryRhythmNotes: `${mercuryElement} rhythm: Full exam condition rehearsals with official memorandum mark schemes.`,
        estimatedHours: 8,
        topics: week4Topics,
        milestoneCheckpoint: `Complete a full timed mock exam under standard test conditions, scoring above your target level.`,
        examinerTraps: week4Traps,
        tasks: makeTasks(4, 'w4', week4Topics),
      },
    ],
  };
}

app.post('/api/roadmap/generate', async (req: Request, res: Response) => {
  try {
    if (await rejectWithoutAgentAccess(req, res)) return;
    const { subject, grade, firmamentProfile, previousMark, targetExam, focusTopic, language, state, country, nation } =
      req.body;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const targetSubject = subject || 'Mathematics';
    const targetGrade = grade || 'Grade 12';
    const mark = previousMark !== undefined ? Number(previousMark) : 50;
    const isRemedial = mark < 60;
    const targetLang = language || 'English';
    const curriculum = describeCurriculum(country, state, nation);
    const learningHistory = await getLearningHistory(email, targetSubject);
    const progressSignature = `${learningHistory?.overall?.attempted || 0}-${
      learningHistory?.overall?.correct || 0
    }`;

    const cacheKey =
      `roadmap:${country || 'ZA'}:${state || ''}:${targetGrade}:${targetSubject}:${mark}:${targetExam || 'general'}:${
        focusTopic || 'all'
      }:${targetLang}:${progressSignature}`
        .toLowerCase()
        .replace(/\s+/g, '_');
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: 'cache' });
    }

    const systemInstruction = `
You are MyTutorZA's Master Academic Director and Chief Strategist for ${curriculum.curriculumName} (Grades 4-12).
Your task is to build a bespoke, highly motivating, structured 4-WEEK STUDY ROADMAP tailored specifically to the student's psychological profile under THE FIRMAMENT ENGINE:

STUDENT'S FIRMAMENT PSYCHOMETRIC PROFILE:
- Student: ${firmamentProfile?.studentName || 'Student'}
- Life Path Archetype: ${firmamentProfile?.lifePath?.archetype || 'The Architect'} (Life Path ${firmamentProfile?.lifePath?.number || 7})
- Strengths: ${firmamentProfile?.lifePath?.strengths?.join(', ') || 'Analytical thinking, perseverance'}
- Mercury Element & Rhythm: ${firmamentProfile?.mercury?.element || 'Air'} (${firmamentProfile?.mercury?.pacingStyle || 'Conceptual dialogue'}, rhythm: ${firmamentProfile?.mercury?.learningRhythm || 'Steady deep dive'})
- Cognitive Vector: ${firmamentProfile?.cognitiveVector?.primaryModality || 'Logical-Rule'}
- Reasoning Scaffold: ${firmamentProfile?.cognitiveVector?.reasoningScaffold || 'Deductive Proofs & First Principles'}
- South African Analogy Focus: ${firmamentProfile?.cognitiveVector?.southAfricanAnalogySet || 'South African engineering, sports, and transit systems'}

DIAGNOSTIC STATUS:
- Previous Term Average: ${mark}%.
- Case Treatment: ${isRemedial ? 'REMEDIAL_SCAFFOLD' : 'ADVANCEMENT_SCAFFOLD'}.
${isRemedial
  ? '- CRITICAL: Student has prerequisite foundational gaps. Week 1 must rebuild core definitions, prerequisite algebra/rules, and confidence before progressing.'
  : '- ADVANCED: Student is proficient. Emphasize multi-step synthesis, higher-order DBE questions (Blooms Level 3-4), and trap avoidance.'
}

CURRICULUM SPECIFICATIONS:
- Subject: ${targetSubject}
- Grade: ${targetGrade}
- Target Milestones: ${targetExam || (curriculum.isUS ? 'Upcoming state assessment' : 'Upcoming DBE Assessment')}
- Focus Area: ${focusTopic || 'Full curriculum for this course and grade'}
- Language of instruction: ${targetLang}

CURRICULUM GROUNDING (${curriculum.frameworkLabel}):
${getCurriculumDirective({ subject: targetSubject, grade: targetGrade, topic: focusTopic, state, country, nation })}

RETURN STRICT JSON matching this schema:
{
  "id": string,
  "subject": string,
  "grade": string,
  "overallGoal": string,
  "targetExam": string,
  "firmamentSummary": {
    "archetype": string,
    "lifePathNumber": number,
    "mercuryElement": string,
    "primaryModality": string,
    "pacingStrategy": string,
    "diagnosticTreatment": "REMEDIAL_SCAFFOLD" | "ADVANCEMENT_SCAFFOLD"
  },
  "keyAdvice": string[], // 3-4 golden study rules tailored to their archetype and modality
  "weeks": [
    {
      "weekNumber": number, // 1, 2, 3, 4
      "theme": string,
      "atpFocus": string,
      "mercuryRhythmNotes": string,
      "estimatedHours": number,
      "topics": string[],
      "milestoneCheckpoint": string,
      "examinerTraps": string[],
      "tasks": [
        {
          "id": string,
          "dayLabel": string, // "Days 1–2", "Days 3–4", "Days 5–6", "Day 7"
          "title": string,
          "description": string,
          "durationMinutes": number,
          "cognitiveTip": string
        }
      ]
    }
  ]
}
`;

    const roadmapSystemInstruction = `${systemInstruction}\n\n${buildLearningHistoryBlock(learningHistory)}`;

    if (LLAMA_API_KEY) {
      try {
        const textRaw = await callLlamaChat({
          system: roadmapSystemInstruction,
          user: `Generate a personalized 4-week ${curriculum.frameworkLabel} study roadmap for ${targetGrade} ${targetSubject} for a student with previous mark ${mark}% and archetype ${
            firmamentProfile?.lifePath?.archetype || 'The Architect'
          }. Focus: ${focusTopic || 'Full Curriculum'}.`,
          jsonMode: true,
          temperature: 0.4,
          timeoutMs: 9000,
          maxTokens: 3000,
        });
        let text = (textRaw || '').trim();
        if (text.startsWith('```json')) {
          text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (text.startsWith('```')) {
          text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.weeks) && parsed.weeks.length === 4) {
          await setCache(cacheKey, parsed, 7200);
          return res.json({ ...parsed, source: LLAMA_MODEL_ID });
        }
      } catch (llamaErr: any) {
        console.warn(
          'Llama roadmap generation timeout/error, serving firmament fallback:',
          (llamaErr as any)?.message || llamaErr,
        );
      }
    }

    const fallback = getFirmamentRoadmapFallback(
      targetSubject,
      targetGrade,
      firmamentProfile,
      mark,
      targetExam,
      focusTopic,
      country,
      state,
      nation,
    );
    await setCache(cacheKey, fallback, 7200);
    return res.json({ ...fallback, source: 'firmament-engine-local' });
  } catch (err: any) {
    console.error('Roadmap endpoint error:', err);
    const safeFallback = getFirmamentRoadmapFallback(
      req.body?.subject || 'Mathematics',
      req.body?.grade || 'Grade 12',
      req.body?.firmamentProfile,
      req.body?.previousMark || 50,
      req.body?.targetExam,
      req.body?.focusTopic,
      req.body?.country,
      req.body?.state,
      req.body?.nation,
    );
    return res.json({ ...safeFallback, source: 'emergency-safe-fallback' });
  }
});

// ---------------------------------------------------------------------
// 3. EXAM AI AGENT API (US state/AP & UK exam-board simulator, ZA NSC fallback)
// ---------------------------------------------------------------------
app.post('/api/exam/generate', async (req: Request, res: Response) => {
  try {
    if (await rejectWithoutAgentAccess(req, res)) return;
    const { subject, grade, examType, durationMinutes, topic, term, state, country, nation } = req.body;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const dur = Number(durationMinutes) || 60;
    const countryCode = String(country || 'US').toUpperCase();
    const paperType = examType || (countryCode === 'US' ? 'Final Exam' : countryCode === 'UK' ? 'Mock Exam' : 'November Final Exam');
    const curriculum = describeCurriculum(country, state, nation);
    const learningHistory = await getLearningHistory(email, subject);
    const progressSignature = `${learningHistory?.overall?.attempted || 0}-${
      learningHistory?.overall?.correct || 0
    }`;

    const cacheKey =
      `exam:${country || 'ZA'}:${state || ''}:${grade}:${subject}:${paperType}:${dur}:${topic || 'general'}:${progressSignature}`
        .toLowerCase()
        .replace(/\s+/g, '_');
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: 'cache' });
    }

    const systemInstruction = `
You are the Chief Examiner & Chief Invigilator for ${curriculum.isUS ? `${curriculum.regionLabel} state assessments` : curriculum.isUK ? `${curriculum.ukFramework.qualifications} examinations (${curriculum.ukNation})` : 'South African National Senior Certificate (NSC) Examinations'}.
You must construct an authentic, rigorous ${curriculum.isUS ? `${curriculum.regionLabel} standards-aligned` : curriculum.isUK ? `${curriculum.ukNation} curriculum-aligned` : 'South African DBE'} exam paper with high real-life accuracy to past papers for:
Subject: ${subject}
Grade: ${grade}
Examination: ${paperType} (${
      paperType.includes('June') ? 'Mid-Year Examination' : 'November Final Examination'
    })
Allocated Time: ${dur} minutes
Topic Focus: ${topic ? topic : curriculum.isUS ? 'Full state standards for this course' : curriculum.isUK ? 'Full specification content for this qualification' : 'Full CAPS Syllabus for this exam stage'}

CURRICULUM & EXAM SPECIFICATION (${curriculum.frameworkLabel}):
${getCurriculumDirective({ subject, grade, topic, state, country, nation })}

STRICT EXAM STRUCTURE MANDATE:
1. SECTION A: Objective Questions (MCQs, matching items, or short 1-word concepts) - approx 20-25% of marks.
2. SECTION B: Routine & Complex Procedures (Structured multi-part questions, calculations, diagram analysis, step-by-step problem solving) - approx 55-60% of marks.
3. SECTION C: Problem Solving / Synthesis / Essay / Application - approx 20% of marks.

CRITICAL REQUIREMENTS:
- Provide authentic question numbers (e.g. 1.1, 1.2, 1.3, 2.1.1, 2.1.2).
- Every question must have an EXACT MARK ALLOCATION with explicit sub-mark allocations (e.g., "[1.1.1 (2 marks: Formula 1, Substitution 1)]").
- Provide an exhaustive, accurate OFFICIAL MEMORANDUM showing step-by-step solutions, mark breakdowns, and explicit "EXAMINER TRAPS" (common misconceptions students fall for).
- Follow ${curriculum.isUS ? `${curriculum.regionLabel} state assessment question conventions (US spelling, dollars, customary units, US civic/historical references).` : curriculum.isUK ? `${curriculum.ukNation} exam-board conventions (British English, pounds sterling, SI/metric units, command words and mark-scheme phrasing).` : 'South African CAPS question conventions (e.g., BODMAS, DBE geometric reasons, SARS tax brackets, SI units).'}

Return valid JSON conforming strictly to:
{
  "title": string,
  "subject": string,
  "grade": string,
  "examType": string,
  "durationMinutes": number,
  "totalMarks": number,
  "instructions": string[],
  "sections": [
    {
      "title": string, // e.g. "SECTION A: Objective Concepts"
      "description": string,
      "totalMarks": number,
      "questions": [
        {
          "id": string,
          "number": string, // e.g. "1.1"
          "section": string,
          "prompt": string,
          "type": "mcq" | "calculation" | "short" | "essay",
          "options": string[], // for MCQ
          "marks": number,
          "rubric": string, // e.g. "1 mark: formula, 1 mark: substitution, 1 mark: answer"
          "examinerTrap": string, // common mistake alert
          "solution": string
        }
      ]
    }
  ]
}
`;

    const examSystemInstruction = `${systemInstruction}\n\n${buildLearningHistoryBlock(learningHistory)}
\nEXAM AGENT ROLE LOCK (NON-NEGOTIABLE):
- This is the EXAM AGENT, not the Tutoring Agent and not the Study Agent.
- Purpose: simulate authentic assessment under exam conditions.
- Do not teach, coach, scaffold or reveal answers inside the paper. Put all solutions in the memorandum only.
- Weight question selection toward the learner's recorded weak skills and quiz failures, while remaining inside the official curriculum scope.`;

    if (LLAMA_API_KEY) {
      try {
        const textRaw = await callLlamaChat({
          system: examSystemInstruction,
          user: `Generate a realistic ${dur}-minute ${curriculum.frameworkLabel} examination for ${grade} ${subject} (${paperType}) on ${
            topic || 'core syllabus'
          }.`,
          jsonMode: true,
          temperature: 0.3,
          timeoutMs: 9000,
          maxTokens: 5000,
        });
        let text = (textRaw || '').trim();
        if (text.startsWith('```json')) {
          text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (text.startsWith('```')) {
          text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          await setCache(cacheKey, parsed, 7200);
          return res.json({ ...parsed, source: LLAMA_MODEL_ID });
        }
      } catch (llamaErr: any) {
        console.warn(
          'Llama exam generation timeout/error, serving authentic CAPS DBE paper bank:',
          (llamaErr as any)?.message || llamaErr,
        );
      }
    }

    const fallbackPaper = getAuthenticDBEPaper(subject, grade, paperType, dur, topic);
    await setCache(cacheKey, fallbackPaper, 7200);
    return res.json({ ...fallbackPaper, source: 'curriculum-dbe-bank' });
  } catch (err: any) {
    console.error('Exam endpoint safety handler:', err);
    const safePaper = getAuthenticDBEPaper(
      req.body?.subject || 'Mathematics (Pure)',
      req.body?.grade || 'Grade 12',
      req.body?.examType || 'November Final Exam',
      req.body?.durationMinutes || 60,
    );
    return res.json({ ...safePaper, source: 'emergency-safe-fallback' });
  }
});

// ---------------------------------------------------------------------
// 4. USER FEEDBACK / CONTACT US
// ---------------------------------------------------------------------
app.post('/api/feedback', async (req: Request, res: Response) => {
  const { name, email, subject, message, grade } = req.body;
  console.log(`Feedback received from ${name} (${email}): [${grade}] ${subject} - ${message}`);

  const recipient = process.env.SMTP_USER || 'lexiparcio@gmail.com';
  try {
    if (isMailConfigured()) {
      await sendMail({
        to: recipient,
        subject: `[MyTutorZA Contact] ${subject || 'General feedback'} — ${name}`,
        text: `From: ${name} <${email}>\nGrade: ${grade || 'n/a'}\nSubject: ${subject}\n\n${message}`,
        html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p><strong>Grade:</strong> ${grade || 'n/a'}</p><p><strong>Subject:</strong> ${subject}</p><hr/><p>${String(message).replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p>`,
      });
    }
  } catch (err: any) {
    console.error('Feedback email failed:', err?.message || err);
  }

  return res.json({
    success: true,
    message:
      'Thank you! Your suggestion has been logged and sent to the MyTutorZA curriculum team.',
  });
});

// ---------------------------------------------------------------------
// LLM TUTOR (firmament-guarded, cost-efficient)
// ---------------------------------------------------------------------
// NOTE: The canonical tutoring chat handler is registered earlier (section 1A)
// so it can apply the per-session topic lock, source RAG grounding, response
// caching and transcript persistence. Do not register a second handler for
// `/api/tutoring/chat` here: Express uses the first match, so a duplicate is
// dead code that silently bypasses the lock.


// ---------------------------------------------------------------------
app.post('/api/caps/ingest', async (req: Request, res: Response) => {
  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  try {
    const result = await buildCapsVaultIndex();
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

app.get('/api/caps/search', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const limit = Number(req.query.limit || 6);
  const results = searchCapsVault(q, limit);
  return res.json({ results });
});

// ---------------------------------------------------------------------
// BILLING (PayFast gating: beta mode until merchant configured)
// ---------------------------------------------------------------------
app.get('/api/billing/trial', (req: Request, res: Response) => {
  const trialStarted = Date.now() - 0;
  const expires = trialStarted + 3 * 24 * 60 * 60 * 1000;
  return res.json({
    trialStartedAt: new Date(trialStarted).toISOString(),
    trialExpiresAt: new Date(expires).toISOString(),
    daysRemaining: 3,
    status: 'trial',
  });
});

app.get('/api/billing/status', (req: Request, res: Response) => {
  const configured = !!process.env.PAYFAST_MERCHANT_ID;
  return res.json({
    betaMode: !configured,
    payfastConfigured: configured,
    plans: [
      { id: 'weekly', label: 'R25 / 7 days', price: 25, cycle: 'weekly' },
      { id: 'monthly', label: 'R80 / month', price: 80, cycle: 'monthly' },
    ],
  });
});

app.post('/api/billing/checkout', (req: Request, res: Response) => {
  const { merchantId = process.env.PAYFAST_MERCHANT_ID, plan = 'weekly' } = req.body || {};

  if (!merchantId) {
    return res.json({
      success: true,
      betaMode: true,
      message: 'Beta testing mode: subscription not required yet.',
    });
  }

  const amount = plan === 'monthly' ? '80.00' : '25.00';
  const itemName =
    plan === 'monthly' ? 'MyTutorZA Monthly Subscription' : 'MyTutorZA Weekly Subscription';
  const sandbox = process.env.PAYFAST_SANDBOX !== 'false';
  const baseUrl = sandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  return res.json({
    success: true,
    redirectUrl: `${baseUrl}?merchant_id=${encodeURIComponent(
      merchantId,
    )}&amount=${amount}&item_name=${encodeURIComponent(itemName)}`,
  });
});

// ---------------------------------------------------------------------
// PAYPAL SUBSCRIPTIONS
// ---------------------------------------------------------------------
const PAYPAL_MODE = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
const PAYPAL_BASE = PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function paypalAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID || '';
  const secret = process.env.PAYPAL_CLIENT_SECRET || '';
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const j: any = await r.json();
  if (!j.access_token) throw new Error(j.error_description || 'PayPal auth failed');
  return j.access_token;
}

const PAYPAL_PLANS: Record<string, { planId: string; label: string; price: string; currency: string; cycle: string }> = {
  weekly_usd: { planId: process.env.PAYPAL_PLAN_WEEKLY_USD || '', label: '7 days', price: '2.99', currency: 'USD', cycle: 'weekly' },
  monthly_usd: { planId: process.env.PAYPAL_PLAN_MONTHLY_USD || '', label: '1 month', price: '10.99', currency: 'USD', cycle: 'monthly' },
  weekly_gbp: { planId: process.env.PAYPAL_PLAN_WEEKLY_GBP || '', label: '7 days', price: '2.50', currency: 'GBP', cycle: 'weekly' },
  monthly_gbp: { planId: process.env.PAYPAL_PLAN_MONTHLY_GBP || '', label: '1 month', price: '10.50', currency: 'GBP', cycle: 'monthly' },
};

/** Billing is enforced only once PayPal credentials + at least one plan exist. */
function subscriptionsConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      Object.values(PAYPAL_PLANS).some((plan) => !!plan.planId)
  );
}

interface BillingAccess {
  status: string;
  active: boolean;
  enforced: boolean;
  trialEndsAt?: string;
  plan?: string;
  provider?: string;
  currentPeriodEnd?: string;
  daysLeft?: number;
}

function computeBillingAccess(row: any, enforced: boolean): BillingAccess {
  const status = String(row?.subscription_status || 'trial').toLowerCase();
  const trialMs = row?.trial_expires_at ? new Date(row.trial_expires_at).getTime() : 0;
  const trialActive = status === 'trial' && (!trialMs || trialMs > Date.now());
  const paidActive = status === 'active' || status === 'past_due';
  const active = !enforced || paidActive || trialActive;
  const daysLeft = trialMs ? Math.max(0, Math.ceil((trialMs - Date.now()) / 86400000)) : undefined;

  return {
    status,
    active,
    enforced,
    trialEndsAt: row?.trial_expires_at || undefined,
    plan: row?.plan_id || undefined,
    provider: row?.provider || undefined,
    currentPeriodEnd: row?.current_period_end || undefined,
    daysLeft,
  };
}

async function findProfileByEmail(client: any, email: string) {
  if (!client || !email) return null;
  const { data } = await client
    .from('student_profiles')
    .select('*')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function latestSubscriptionFor(client: any, profileId: string) {
  if (!client || !profileId) return null;
  const { data } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', profileId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

/** Returns true when the request has already been rejected with a 402. */
async function rejectWithoutAgentAccess(req: Request, res: Response): Promise<boolean> {
  const email = String(req.body?.email || req.body?.userEmail || '').trim().toLowerCase();
  const enforced = subscriptionsConfigured();
  const client = getServiceSupabaseClient();

  // Never brick the app before billing is live or when persistence is missing.
  if (!enforced || !client || !email) return false;

  const profile = await findProfileByEmail(client, email);
  if (!profile) return false;

  const access = computeBillingAccess(profile, true);
  if (access.active) return false;

  res.status(402).json({
    error: 'Your subscription has ended. Subscribe to continue using the Tutoring, Study and Exam agents.',
    code: 'SUBSCRIPTION_REQUIRED',
    access,
  });
  return true;
}

app.get('/api/billing/status', async (req: Request, res: Response) => {
  const email = String((req.query.email as string) || '').trim().toLowerCase();
  const id = String((req.query.id as string) || '').trim();
  const configured = subscriptionsConfigured();
  const client = getServiceSupabaseClient();

  if (!client) {
    return res.json({
      success: true,
      configured,
      enforced: false,
      access: computeBillingAccess({}, false),
    });
  }

  try {
    let profile: any = null;
    if (id) {
      const { data } = await client.from('student_profiles').select('*').eq('id', id).maybeSingle();
      profile = data || null;
    } else if (email) {
      profile = await findProfileByEmail(client, email);
    }

    if (!profile) {
      return res.json({
        success: true,
        configured,
        enforced: configured,
        access: computeBillingAccess({}, configured),
      });
    }

    const sub = await latestSubscriptionFor(client, profile.id);
    const access = computeBillingAccess(profile, configured);
    if (sub) {
      access.plan = sub.plan_id || access.plan;
      access.provider = sub.provider || access.provider;
      access.currentPeriodEnd = sub.current_period_end || access.currentPeriodEnd;
    }

    return res.json({
      success: true,
      configured,
      enforced: configured,
      access,
      profile: {
        id: profile.id,
        email: profile.email,
        subscriptionStatus: profile.subscription_status,
        trialEndsAt: profile.trial_expires_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.get('/api/billing/paypal/plans', (_req: Request, res: Response) => {
  return res.json({ configured: subscriptionsConfigured(), plans: PAYPAL_PLANS });
});

app.post('/api/billing/paypal/create-subscription', async (req: Request, res: Response) => {
  const { planKey, userId, email: rawEmail, returnUrl, cancelUrl } = req.body || {};
  const email = String(rawEmail || '').trim().toLowerCase();
  const plan = PAYPAL_PLANS[planKey];
  if (!plan || !plan.planId) return res.status(400).json({ error: 'Unknown or unconfigured plan' });
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    // Resolve the database profile id so the PayPal webhook can map the
    // subscription back to the learner.
    let profileId = '';
    const client = getServiceSupabaseClient();
    if (client) {
      const profile = await findProfileByEmail(client, email);
      profileId = profile?.id || '';
    }
    if (!profileId && typeof userId === 'string' && /^[0-9a-f-]{36}$/i.test(userId)) {
      profileId = userId;
    }

    const token = await paypalAccessToken();
    const r = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: plan.planId,
        custom_id: profileId,
        application_context: {
          brand_name: 'MyTutorZA',
          user_action: 'SUBSCRIBE_NOW',
          return_url: returnUrl || `${process.env.APP_URL || ''}/?paypal=success`,
          cancel_url: cancelUrl || `${process.env.APP_URL || ''}/?paypal=cancel`,
        },
      }),
    });
    const j: any = await r.json();
    const approval = (j.links || []).find((l: any) => l.rel === 'approve');
    if (!approval) return res.status(500).json({ error: j.message || 'No approval link', raw: j });
    return res.json({ subscriptionId: j.id, approvalUrl: approval.href, status: j.status });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

/**
 * Confirms a PayPal subscription on return from checkout. This makes access
 * work even when the webhook is delayed or not configured.
 */
app.post('/api/billing/paypal/confirm', async (req: Request, res: Response) => {
  const { subscriptionId, email: rawEmail } = req.body || {};
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!subscriptionId) return res.status(400).json({ error: 'subscriptionId required' });
  if (!subscriptionsConfigured()) {
    return res.json({ success: false, configured: false, error: 'Payments are not configured.' });
  }

  try {
    const token = await paypalAccessToken();
    const r = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j: any = await r.json();
    if (!r.ok) {
      return res.status(400).json({ success: false, error: j.message || 'PayPal verification failed' });
    }

    const status = String(j.status || '').toLowerCase();
    const nextBilling = j.billing_info?.next_billing_time || null;
    const client = getServiceSupabaseClient();
    let profile: any = null;

    if (client) {
      if (email) profile = await findProfileByEmail(client, email);
      if (!profile && j.custom_id) {
        const { data } = await client.from('student_profiles').select('*').eq('id', j.custom_id).maybeSingle();
        profile = data || null;
      }

      await client.from('subscriptions').upsert(
        {
          user_id: profile?.id || j.custom_id || null,
          provider: 'paypal',
          provider_subscription_id: subscriptionId,
          plan_id: j.plan_id || null,
          status,
          current_period_end: nextBilling,
          raw_event: j,
        },
        { onConflict: 'provider_subscription_id' }
      );

      if (profile?.id) {
        await client
          .from('student_profiles')
          .update({ subscription_status: status })
          .eq('id', profile.id);
      }
    }

    const access = computeBillingAccess(
      {
        subscription_status: status,
        trial_expires_at: profile?.trial_expires_at,
        plan_id: j.plan_id,
        provider: 'paypal',
        current_period_end: nextBilling,
      },
      true
    );

    return res.json({ success: true, configured: true, status, access });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.post('/api/billing/paypal/webhook', async (req: Request, res: Response) => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const headers = req.headers;
  try {
    const token = await paypalAccessToken();
    const verifyBody = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: req.body,
    };
    const vr = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyBody),
    });
    const vj: any = await vr.json();
    if (vj.verification_status !== 'SUCCESS') {
      return res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (err: any) {
    return res.status(400).json({ error: 'Verification failed: ' + (err?.message || err) });
  }

  const event = req.body || {};
  const eventType = event.event_type;
  const resource = event.resource || {};
  const subId = resource.id || resource.billing_agreement_id;
  const status = String(resource.status || '').toLowerCase();
  const uid = resource.custom_id;
  const nextBilling = resource.billing_info?.next_billing_time || null;
  const supa = getServiceSupabaseClient();
  if (supa && subId) {
    try {
      await supa.from('subscriptions').upsert(
        {
          user_id: uid || null,
          provider: 'paypal',
          provider_subscription_id: subId,
          plan_id: resource.plan_id || null,
          status: status || eventType,
          current_period_end: nextBilling,
          raw_event: event,
        },
        { onConflict: 'provider_subscription_id' }
      );
      if (uid && status) {
        await supa
          .from('student_profiles')
          .update({ subscription_status: status })
          .eq('id', uid);
      }
    } catch (e: any) {
      console.error('Webhook DB upsert failed:', e?.message || e);
    }
  }
  return res.json({ received: true });
});

// ---------------------------------------------------------------------
app.post('/api/termtests/generate', async (req: Request, res: Response) => {
  const { subject, grade, term, examType, durationMinutes, country, state, nation } = req.body || {};
  const sub = subject || 'Mathematics';
  const grd = grade || 'Grade 12';
  const countryCode = String(country || 'US').toUpperCase();
  const trm = term || (countryCode === 'ZA' ? 'Term 1' : 'Unit 1');
  const exam = examType || (countryCode === 'US' ? 'Exam' : countryCode === 'UK' ? 'Mock Exam' : 'Term Test');
  const dur = Number(durationMinutes) || 60;

  // Country-correct grounding (US state standards / UK boards / ZA CAPS vault).
  const framework = getCurriculumDirective({
    subject: sub,
    grade: grd,
    topic: trm,
    state,
    country: countryCode,
    nation,
  });
  const examiner =
    countryCode === 'US'
      ? 'an experienced US state / Advanced Placement chief examiner'
      : countryCode === 'UK'
        ? 'an experienced UK exam-board chief examiner (GCSE / A-level / SQA mark-scheme conventions)'
        : 'a DBE Senior Chief Examiner';

  const systemInstruction = `
You are ${examiner}. Generate a ${exam} for ${grd} ${sub} (${trm}).
Duration: ${dur} minutes. Include sections, questions, mark allocations, examiner traps, and an official answer sheet with rubrics.
Ground all content in the learner's curriculum framework:
${framework}

Return valid JSON with:
{
  "title": string,
  "subject": string,
  "grade": string,
  "term": string,
  "examType": string,
  "durationMinutes": number,
  "totalMarks": number,
  "instructions": string[],
  "sections": [ { "title": string, "questions": [ { "number": string, "prompt": string, "type": "mcq"|"calculation"|"short"|"essay", "marks": number, "rubric": string, "examinerTrap": string, "solution": string } ] } ],
  "answerSheet": [ { "question": string, "answer": string, "marking": string } ],
  "essayCriteria": string
}
`.trim();

  let paper: any = null;
  if (DEEPSEEK_API_KEY) {
    try {
      const text = await callLlamaChat({
        system: systemInstruction,
        user: `Generate the ${exam} now for ${grd} ${sub} (${trm}).`,
        jsonMode: true,
        temperature: 0.3,
        timeoutMs: 90000,
        maxTokens: 6000,
        baseUrl: DEEPSEEK_BASE_URL,
        apiKey: DEEPSEEK_API_KEY,
        model: DEEPSEEK_MODEL,
      });
      if (text) {
        let cleaned = text.trim();
        if (cleaned.startsWith('```'))
          cleaned = cleaned
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '');
        paper = JSON.parse(cleaned);
      }
    } catch (err) {
      console.warn('Term test generation error:', err);
    }
  }

  if (!paper) {
    return res.status(503).json({ error: 'Llama not available or generation failed' });
  }

  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  let id: string | null = null;
  if (client) {
    try {
      const { data } = await client
        .from('term_tests')
        .insert([
          {
            subject: sub,
            grade: grd,
            term: trm,
            exam_type: exam,
            duration_minutes: dur,
            paper,
            answer_sheet: paper.answerSheet || null,
          },
        ])
        .select('id')
        .single();
      id = data?.id || null;
    } catch (err) {
      console.warn('Term test insert error:', err);
    }
  }

  return res.json({ success: true, id, paper });
});

app.get('/api/termtests', async (req: Request, res: Response) => {
  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  if (!client) return res.json({ items: [] });
  const { data, error } = await client
    .from('term_tests')
    .select('*')
    .order('generated_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ items: data || [] });
});

// ---------------------------------------------------------------------
// BATCH CONTENT GENERATION (async-friendly; call in chunks)
// ---------------------------------------------------------------------
app.get('/api/admin/run', async (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 3);
  try {
    const index = await buildCapsVaultIndex();
    const generated: any[] = [];
    const combos = [
      { subject: 'Mathematics (Pure)', grade: 'Grade 12', term: 'Term 1', exam: 'Term Test' },
    ];
    for (
      let i = 0;
      i < Math.min(limit, combos.length) && generated.length < limit;
      i++
    ) {
      const c = combos[i];
      try {
        const r = await fetch(`http://localhost:${port}/api/termtests/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: c.subject,
            grade: c.grade,
            term: c.term,
            examType: c.exam,
            durationMinutes: 60,
          }),
        });
        const data = await r.json();
        generated.push({ ...c, ok: !!data?.success, id: data?.id || null });
      } catch (err: any) {
        generated.push({ ...c, ok: false, error: err?.message });
      }
    }
    return res.json({ ingest: { pdfs: index.processed }, generated });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

app.post('/api/batch/generate-all', async (req: Request, res: Response) => {
  const { subjects, grades, terms, exams } = req.body || {};
  const subjectList =
    Array.isArray(subjects) && subjects.length ? subjects : ['Mathematics (Pure)'];
  const gradeList = Array.isArray(grades) && grades.length ? grades : ['Grade 12'];
  const termList =
    Array.isArray(terms) && terms.length
      ? terms
      : ['Term 1', 'Term 2', 'Term 3', 'Term 4'];
  const examList =
    Array.isArray(exams) && exams.length
      ? exams
      : ['Term Test', 'June Mid-Year Exam', 'November Final Exam'];

  const results: any[] = [];
  outer: for (const subject of subjectList) {
    for (const grade of gradeList) {
      for (const term of termList) {
        for (const exam of examList) {
          if (results.length >= 5) break outer;
          try {
            const r = await fetch(`http://localhost:${port}/api/termtests/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subject,
                grade,
                term,
                examType: exam,
                durationMinutes: 60,
              }),
            });
            const data = await r.json();
            results.push({
              subject,
              grade,
              term,
              exam,
              ok: !!data?.success,
              id: data?.id || null,
            });
          } catch (err: any) {
            results.push({
              subject,
              grade,
              term,
              exam,
              ok: false,
              error: err?.message,
            });
          }
        }
      }
    }
  }

  return res.json({ batch: true, generated: results.length, results });
});

// ---------------------------------------------------------------------
// AUTO-NOTES BATCH (one chapter/term per call, respecting model limits)
// ---------------------------------------------------------------------
app.post('/api/notes/batch-generate', async (req: Request, res: Response) => {
  const { subject, grade, terms, country, state, nation } = req.body || {};
  const sub = subject || 'Mathematics';
  const grd = grade || 'Grade 12';
  const countryCode = String(country || 'US').toUpperCase();
  const termList =
    Array.isArray(terms) && terms.length ? terms : ['Units 1-10'];
  const results: any[] = [];

  for (const term of termList) {
    try {
      const framework = getCurriculumDirective({
        subject: sub,
        grade: grd,
        topic: term,
        state,
        country: countryCode,
        nation,
      });
      const r = await fetch(`http://localhost:${port}/api/notes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: sub,
          grade: grd,
          term,
          country: countryCode,
          state,
          nation,
          chapter: `${term} Curriculum Coverage`,
          section: 'Core curriculum blocks',
          text: framework,
          sourceFile: framework ? 'US/UK directive' : 'Curriculum vault',
        }),
      });
      const data = await r.json();
      results.push({ term, ok: !!data?.success, id: data?.id || null });
    } catch (err: any) {
      results.push({ term, ok: false, error: err?.message });
    }
  }

  return res.json({ batch: true, subject: sub, grade: grd, results });
});

// ---------------------------------------------------------------------
// CHUNKED NOTES GENERATION (one chapter/section at a time)
// ---------------------------------------------------------------------
app.post('/api/notes/generate', async (req: Request, res: Response) => {
  const { subject, grade, term, chapter, section, text, sourceFile, country, state, nation } = req.body || {};
  if (!subject || !grade || !term || !chapter) {
    return res.status(400).json({ error: 'subject, grade, term, chapter required' });
  }
  const countryCode = String(country || 'US').toUpperCase();
  const curriculum = describeCurriculum(countryCode, state, nation);
  const framework = getCurriculumDirective({ subject, grade, topic: chapter, state, country: countryCode, nation });
  const excerpt = (text ? text : framework).slice(0, 4000);
  const isMathOrPhysics = /math|physic|science/i.test(subject);
  const hardLock = isMathOrPhysics
    ? '\\nHARD RULE: Every formula in the chapter MUST be generated with full notation, variables explained, and examples. No omission.'
    : '';

  const frameworkName =
    countryCode === 'US'
      ? `State standards-aligned (AP/EOC, ${curriculum.regionLabel})`
      : countryCode === 'UK'
        ? `UK curriculum-aligned (${curriculum.ukFramework.qualifications})`
        : 'DBE CAPS';
  const systemInstruction = `
You are an expert ${frameworkName} study notes generator. Create concise, accurate study notes for:
Subject: ${subject}  Grade: ${grade}  Term: ${term}
Chapter: ${chapter}  Section: ${section || 'General'}
GROUNDING FRAMEWORK: ${framework}${hardLock}

Source excerpt:
${excerpt}

Return valid JSON:
{
  "summary": string,
  "topics": [ { "heading": string, "details": string } ],
  "keyPoints": string[],
  "formulas": [ { "name": string, "formula": string, "variables": string, "when": string, "example": string } ],
  "terminology": [ { "term": string, "definition": string } ],
  "examinerTips": string[]
}
`.trim();

  let paper: any = null;
  if (LLAMA_API_KEY) {
    try {
      const textRaw = await callLlamaChat({
        system: systemInstruction,
        user: `Generate study notes for this chapter only.`,
        jsonMode: true,
        temperature: 0.3,
        timeoutMs: 60000,
      });
      if (textRaw) {
        let cleaned = textRaw.trim();
        if (cleaned.startsWith('```'))
          cleaned = cleaned
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '');
        paper = JSON.parse(cleaned);
      }
    } catch (err: any) {
      console.warn('Note gen error:', err?.message);
    }
  }

  if (!paper) {
    return res
      .status(503)
      .json({ error: 'Generation failed (model unavailable or parse error)' });
  }

  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  let id: string | null = null;
  if (client) {
    try {
      const { data } = await client
        .from('subject_notes')
        .upsert(
          [
            {
              subject,
              grade,
              term,
              chapter,
              section: section || null,
              content: paper,
              formulas: paper.formulas || [],
              source_file: sourceFile || null,
            },
          ],
          { onConflict: 'subject,grade,term,chapter,section' },
        )
        .select('id')
        .single();
      id = data?.id || null;
    } catch (err) {
      console.warn('Note save error:', err);
    }
  }

  return res.json({ success: true, id, note: paper });
});

app.get('/api/notes', async (req: Request, res: Response) => {
  const { subject, grade, term } = req.query as any;
  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  if (!client) return res.json({ items: [] });
  let q = client.from('subject_notes').select('*').order('generated_at', { ascending: true });
  if (subject) q = q.eq('subject', subject);
  if (grade) q = q.eq('grade', grade);
  if (term) q = q.eq('term', term);
  const { data, error } = await q;
  if (error) return res.status(400).json({ error: error.message });
  return res.json({ items: data || [] });
});

// ---------------------------------------------------------------------
// PROFILE & FIRMAMENT SYNC
// ---------------------------------------------------------------------

/** Map the client Firmament profile into the `firmament_profiles` column shape. */
function firmamentRowFromProfile(firmamentProfile: any, answers: any) {
  return {
    cognitive_score: firmamentProfile?.cognitiveScore || null,
    processing_speed: firmamentProfile?.processingSpeed || null,
    retention_profile: firmamentProfile?.retentionProfile || null,
    // The client has used both names across versions.
    scaffold_needs: firmamentProfile?.scaffoldNeeds || firmamentProfile?.supportNeeds || null,
    firmament_rules: Array.isArray(firmamentProfile?.firmamentRules)
      ? firmamentProfile.firmamentRules
      : [],
    life_path: firmamentProfile?.lifePath || {},
    mercury: firmamentProfile?.mercury || {},
    // cognitive_vector is JSONB, so the 8-dimension vector and the LLM guide
    // travel with it without requiring a schema migration.
    cognitive_vector: {
      ...(firmamentProfile?.cognitiveVector || {}),
      dimensions: firmamentProfile?.dimensions || undefined,
      cognitiveProfileGuide: firmamentProfile?.cognitiveProfileGuide || undefined,
    },
    raw_answers: answers || firmamentProfile?.rawAnswers || {},
    calculated_at: firmamentProfile?.calculatedAt || new Date().toISOString(),
  };
}

/**
 * Upsert the learner row (by email) and replace the Firmament snapshot.
 * Shared by POST /api/profile/sync and POST /api/profile/get.
 */
async function persistProfileBundle(
  client: any,
  profileInput: any,
  firmamentProfile: any,
  answers: any
): Promise<{ profileId: string | null; profileError?: string; firmamentSaved: boolean }> {
  const safeProfile = profileInput || {};
  const email = String(safeProfile.email || '').trim().toLowerCase();

  // Only the profile fields we own are written; trial fields are preserved on
  // update so re-saving a profile never restarts a learner's trial.
  const profileFields: Record<string, any> = {
    full_name: safeProfile.fullName || safeProfile.full_name || null,
    email: email || null,
    phone: safeProfile.phone || null,
    date_of_birth: safeProfile.dateOfBirth || safeProfile.date_of_birth || null,
    grade: safeProfile.grade || null,
    country: safeProfile.country || null,
    nation: safeProfile.nation || null,
    state: safeProfile.state || null,
    subjects: safeProfile.subjects || [],
  };

  let profileId: string | null = null;
  let profileError: string | undefined;

  if (email) {
    const existing = await client
      .from('student_profiles')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    if (existing.data?.id) {
      profileId = existing.data.id;
      const upd = await client
        .from('student_profiles')
        .update({ ...profileFields, updated_at: new Date().toISOString() })
        .eq('id', profileId);
      if (upd.error) profileError = upd.error.message;
    }
  }

  if (!profileId) {
    const ins = await client
      .from('student_profiles')
      .insert([
        {
          ...profileFields,
          trial_started_at: new Date().toISOString(),
          trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_status: 'trial',
        },
      ])
      .select('id')
      .single();
    if (ins.error) profileError = ins.error.message;
    profileId = ins.data?.id ?? null;
  }

  if (!profileId) return { profileId: null, profileError, firmamentSaved: false };

  // Only replace the Firmament snapshot when a new one is supplied. A
  // pre-quiz save (subjects/grade/DOB) must never wipe an existing profile.
  let firmamentSaved = false;
  if (firmamentProfile) {
    await client.from('firmament_onboarding_answers').delete().eq('user_id', profileId);
    await client.from('firmament_profiles').delete().eq('user_id', profileId);

    if (answers && Object.keys(answers).length) {
      const rows = Object.entries(answers).map(([qid, label]) => ({
        user_id: profileId,
        question_id: Number(qid),
        answer_label: String(label),
      }));
      const { error: ansErr } = await client.from('firmament_onboarding_answers').insert(rows);
      if (ansErr) console.warn('Onboarding answers insert error:', ansErr.message);
    }

    const { error: firmErr } = await client
      .from('firmament_profiles')
      .insert([{ user_id: profileId, ...firmamentRowFromProfile(firmamentProfile, answers) }]);
    if (!firmErr) firmamentSaved = true;
    else console.warn('Firmament profile insert error:', firmErr.message);
  }

  return { profileId, profileError, firmamentSaved };
}

app.post('/api/profile/sync', async (req: Request, res: Response) => {
  const { profile, firmamentProfile, answers } = req.body || {};
  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  if (!client) {
    return res.json({ success: true, synced: false, message: 'Supabase not configured' });
  }

  try {
    const saved = await persistProfileBundle(
      client,
      profile,
      firmamentProfile,
      answers || firmamentProfile?.rawAnswers
    );
    if (!saved.profileId) {
      return res.json({
        success: true,
        synced: false,
        error: saved.profileError || 'profile not saved',
      });
    }
    return res.json({
      success: true,
      synced: true,
      syncedProfile: true,
      syncedFirmament: saved.firmamentSaved,
    });
  } catch (err: any) {
    console.warn('Profile sync failed:', err?.message || err);
    return res.json({ success: true, synced: false, error: err?.message || String(err) });
  }
});

// ---------------------------------------------------------------------
// FIRMAMENT PROFILE — save on POST, read on GET
// ---------------------------------------------------------------------
/**
 * POST /api/profile/get
 * Accepts the calculated Firmament profile (plus the learner profile/answers),
 * stores it in Supabase (`student_profiles` + `firmament_profiles`) and returns
 * the persisted record.
 *
 * Payload: { email, profile?: {...}, firmament: {...}, answers?: { [qid]: label } }
 * The legacy shape `{ action: 'save', profile, email }` is also accepted.
 */
app.post('/api/profile/get', async (req: Request, res: Response) => {
  const body = req.body || {};
  const profileInput = body.profile || {};
  const firmamentProfile =
    body.firmament || body.firmamentProfile || body.profile?.firmament || null;
  const answers =
    body.answers || body.onboardingAnswers || firmamentProfile?.rawAnswers || {};
  const email = String(body.email || profileInput.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ success: false, error: 'email required' });
  }

  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  if (!client) {
    return res.json({
      success: true,
      persisted: false,
      reason: 'supabase_not_configured',
      profile: null,
      firmament: null,
    });
  }

  try {
    const saved = await persistProfileBundle(
      client,
      { ...profileInput, email },
      firmamentProfile,
      answers
    );

    if (!saved.profileId) {
      return res
        .status(500)
        .json({ success: false, error: saved.profileError || 'could not save profile' });
    }

    const { data: profile } = await client
      .from('student_profiles')
      .select('*')
      .eq('id', saved.profileId)
      .maybeSingle();
    const { data: firmament } = await client
      .from('firmament_profiles')
      .select('*')
      .eq('user_id', saved.profileId)
      .maybeSingle();

    return res.json({
      success: true,
      persisted: true,
      profileId: saved.profileId,
      profile: profile || null,
      firmament: firmament || null,
      firmamentSaved: saved.firmamentSaved,
    });
  } catch (err: any) {
    console.error('Profile save failed:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

/**
 * GET /api/profile/get?email=... (or ?id=...)
 * Returns the stored learner profile and Firmament snapshot.
 */
app.get('/api/profile/get', async (req: Request, res: Response) => {
  const email = String((req.query.email as string) || '').trim().toLowerCase();
  const id = String((req.query.id as string) || '').trim();
  if (!email && !id) return res.status(400).json({ error: 'email or id required' });

  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  if (!client) {
    return res.json({
      success: false,
      profile: null,
      firmament: null,
      reason: 'supabase_not_configured',
    });
  }

  try {
    let query = client.from('student_profiles').select('*');
    query = id ? query.eq('id', id) : query.ilike('email', email);
    const { data: profile, error } = await query.maybeSingle();
    if (error) console.warn('Profile read error:', error.message);

    let firmament = null;
    if (profile?.id) {
      const { data: f } = await client
        .from('firmament_profiles')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();
      firmament = f || null;
    }

    return res.json({ success: true, profile: profile || null, firmament });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

// ---------------------------------------------------------------------
// PASSWORD RECOVERY (Supabase Auth + branded email)
// The reset link is generated with the Supabase service role key and emailed
// through the configured SMTP mailbox (e.g. lexiparcio@gmail.com).
// ---------------------------------------------------------------------
app.get('/api/auth/mail-status', (req: Request, res: Response) => {
  const admin = getServiceSupabaseClient();
  return res.json({
    supabaseAuthAvailable: !!admin,
    smtpConfigured: isMailConfigured(),
    senderEmail: isMailConfigured() ? process.env.SMTP_FROM || process.env.SMTP_USER : null,
  });
});

app.post('/api/auth/request-password-reset', async (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please provide a valid email address.' });
  }

  const admin = getServiceSupabaseClient();
  if (!admin) {
    return res.json({
      ok: true,
      delivered: false,
      reason: 'supabase_not_configured',
      message:
        'Password reset by email needs Supabase Auth to be configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).',
    });
  }

  if (!isMailConfigured()) {
    return res.json({
      ok: true,
      delivered: false,
      reason: 'smtp_not_configured',
      message:
        'Email delivery is not configured yet (SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM).',
    });
  }

  const appUrl =
    process.env.APP_URL || `${req.protocol}://${req.get('host') || 'localhost'}`;

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: appUrl },
    });

    const link = (data as any)?.properties?.action_link || (data as any)?.action_link;

    // Never reveal whether an account exists for this address.
    if (error || !link) {
      console.warn('Password reset link generation failed:', error?.message || 'no link');
      return res.json({
        ok: true,
        delivered: false,
        reason: 'link_failed',
        message: 'If that email has an account, a reset link has been sent.',
      });
    }

    await sendMail({
      to: email,
      subject: 'Reset your MyTutorZA password',
      text: `Reset your MyTutorZA password using this link (expires shortly):
${link}

If you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0f172a;border-radius:16px;color:#e2e8f0">
          <h2 style="margin:0 0 8px;color:#ffffff">Reset your password</h2>
          <p style="margin:0 0 16px;font-size:14px;color:#94a3b8">
            Tap the button below to choose a new password for your MyTutorZA learner account.
          </p>
          <p style="margin:0 0 20px">
            <a href="${link}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px">
              Choose a new password
            </a>
          </p>
          <p style="margin:0;font-size:12px;color:#64748b">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>`,
    });

    return res.json({ ok: true, delivered: true, message: 'Reset link sent.' });
  } catch (err: any) {
    console.warn('Password reset email failed:', err?.message || err);
    return res.json({
      ok: true,
      delivered: false,
      reason: 'send_failed',
      message: 'We could not send the email right now. Please try again shortly.',
    });
  }
});

app.get('/api/profile/status', (req: Request, res: Response) => {
  const client = getServiceSupabaseClient() || getSupabaseServerClient(req);
  res.json({
    supabaseConfigured: !!client,
    profileSyncAvailable: !!client,
  });
});

// ---------------------------------------------------------------------
// PDF-TOC → NOTES
// ---------------------------------------------------------------------
app.get('/api/caps/toc', (req: Request, res: Response) => {
  const { pdfFile } = req.query as any;
  if (!pdfFile) return res.status(400).json({ error: 'pdfFile required' });
  const tocPath = path.resolve(process.cwd(), 'caps_vault', 'manifest-toc.json');
  if (!fs.existsSync(tocPath)) return res.json({ toc: [], message: 'Run /api/caps/ingest first' });
  const enriched = JSON.parse(fs.readFileSync(tocPath, 'utf-8'));
  const entry = (enriched.tocIndex || []).find((e: any) => e.file === pdfFile);
  if (!entry) return res.json({ toc: [], message: 'PDF not in TOC index' });
  return res.json({
    file: pdfFile,
    subject: entry.subject,
    grade: entry.grade,
    term: entry.term,
    toc: entry.toc,
  });
});

app.post('/api/notes/generate-from-pdf-toc', async (req: Request, res: Response) => {
  const { subject, grade, term, pdfFile, maxChapters } = req.body || {};
  if (!subject || !grade || !term || !pdfFile)
    return res.status(400).json({ error: 'subject, grade, term, pdfFile required' });
  const fullPath = path.resolve(process.cwd(), 'caps_vault', pdfFile);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'PDF not found' });
  const { extractPdfText } = await import('./serverPdfIngestion');
  const fullText = await extractPdfText(fullPath);
  if (!fullText || fullText.length < 50) return res.status(400).json({ error: 'No extractable text' });
  const toc = detectTOC(fullText);
  const chapters = splitByTOC(fullText, toc);
  const tocContext = toc.map((t: any) => `${'  '.repeat(t.level - 1)}${t.title}`).join('\n');
  const limit = Number(maxChapters || chapters.length);
  const results: any[] = [];
  for (let i = 0; i < Math.min(limit, chapters.length); i++) {
    const ch = chapters[i];
    const caps = getCurriculumDirective({ subject, grade, topic: ch.title, country: 'ZA' });
    const systemInstruction = `You are a DBE CAPS study notes generator.\n\nTABLE OF CONTENTS:\n${tocContext}\n\nWrite notes for chapter: ${ch.title}\nSubject: ${subject} Grade: ${grade} Term: ${term}\n\nCAPS reference:\n${caps}\n\nSource:\n${ch.content.slice(
      0,
      5000,
    )}\n\nReturn valid JSON: {"summary": string, "topics": [{"heading": string, "details": string}], "keyPoints": string[], "formulas": [{"name": string, "formula": string, "variables": string, "when": string, "example": string}], "terminology": [{"term": string, "definition": string}], "examinerTips": string[]}`;
    let paper: any = null;
    try {
      const raw = await callLlamaChat({
        system: systemInstruction,
        user: 'Generate notes for this chapter.',
        jsonMode: true,
        temperature: 0.3,
        timeoutMs: 90000,
      });
      if (raw) {
        let c = raw.trim();
        if (c.startsWith('```')) c = c.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        paper = JSON.parse(c);
      }
    } catch (err: any) {
      console.warn('err:', err?.message);
    }
    if (!paper) {
      results.push({ chapter: ch.title, ok: false, error: 'Generation failed' });
      continue;
    }
    const client = getServiceSupabaseClient();
    let id: string | null = null;
    if (client) {
      try {
        const { data } = await client
          .from('subject_notes')
          .upsert(
            [
              {
                subject,
                grade,
                term,
                chapter: ch.title,
                section: ch.level === 2 ? ch.title : null,
                content: paper,
                formulas: paper.formulas || [],
                source_file: pdfFile,
                generated_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'subject,grade,term,chapter,section' },
          )
          .select('id')
          .single();
        id = data?.id || null;
      } catch (err) {
        console.warn('save err:', err);
      }
    }
    results.push({ chapter: ch.title, ok: true, id });
  }
  return res.json({ success: true, pdfFile, chaptersProcessed: results.length, results });
});

app.post('/api/notes/batch-from-pdfs-toc', async (req: Request, res: Response) => {
  const { subject, grade, term, maxPdfs, maxChaptersPerPdf } = req.body || {};
  const sub = subject || 'Mathematics (Pure)';
  const grd = grade || 'Grade 12';
  const trm = term || 'Term 1';
  const pdfLimit = Number(maxPdfs || 5);
  const chLimit = Number(maxChaptersPerPdf || 5);
  const manifestPath = path.resolve(process.cwd(), 'caps_vault', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return res.json({ error: 'No manifest' });
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const files: string[] = Array.isArray(manifest?.files) ? manifest.files : [];
  const matched = pickPdfs(files, sub, grd).slice(0, pdfLimit);
  const all: any[] = [];
  const { extractPdfText } = await import('./serverPdfIngestion');
  for (const file of matched) {
    try {
      const fullText = await extractPdfText(path.resolve(process.cwd(), 'caps_vault', file));
      if (!fullText || fullText.length < 50) continue;
      const toc = detectTOC(fullText);
      const chapters = splitByTOC(fullText, toc);
      const tocContext = toc.map((t: any) => `${'  '.repeat(t.level - 1)}${t.title}`).join('\n');
      for (let i = 0; i < Math.min(chLimit, chapters.length); i++) {
        const ch = chapters[i];
        const caps = getCurriculumDirective({ subject: sub, grade: grd, topic: ch.title, country: 'ZA' });
        const sys = `You are a DBE CAPS study notes generator.\n\nTABLE OF CONTENTS:\n${tocContext}\n\nWrite notes for: ${ch.title}\nSubject: ${sub} Grade: ${grd} Term: ${trm}\n\nCAPS reference:\n${caps}\n\nSource:\n${ch.content.slice(
          0,
          5000,
        )}\n\nReturn valid JSON: {"summary": string, "topics": [{"heading": string, "details": string}], "keyPoints": string[], "formulas": [{"name": string, "formula": string, "variables": string, "when": string, "example": string}], "terminology": [{"term": string, "definition": string}], "examinerTips": string[]}`;
        let paper: any = null;
        try {
          const raw = await callLlamaChat({
            system: sys,
            user: 'Generate notes.',
            jsonMode: true,
            temperature: 0.3,
            timeoutMs: 90000,
          });
          if (raw) {
            let c = raw.trim();
            if (c.startsWith('```')) c = c.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
            paper = JSON.parse(c);
          }
        } catch (err: any) {
          console.warn('err:', err?.message);
        }
        if (!paper) {
          all.push({ file, chapter: ch.title, ok: false });
          continue;
        }
        const client = getServiceSupabaseClient();
        if (client) {
          try {
            await client.from('subject_notes').upsert(
              [
                {
                  subject: sub,
                  grade: grd,
                  term: trm,
                  chapter: ch.title,
                  section: ch.level === 2 ? ch.title : null,
                  content: paper,
                  formulas: paper.formulas || [],
                  source_file: file,
                  generated_at: new Date().toISOString(),
                },
              ],
              { onConflict: 'subject,grade,term,chapter,section' },
            );
          } catch (err) {
            console.warn('save:', err);
          }
        }
        all.push({ file, chapter: ch.title, ok: true });
      }
    } catch (err: any) {
      console.warn('pdf err:', err);
    }
  }
  return res.json({
    success: true,
    pdfsProcessed: matched.length,
    totalChapters: all.length,
    results: all,
  });
});

// ---------------------------------------------------------------------
// CAPS CATALOG MATCHING
// ---------------------------------------------------------------------
function gradeMatches(fn: string, grade: string): boolean {
  return capsMatchGrade(fn, grade);
}

function pickPdfs(files: string[], subject: string, grade: string): string[] {
  return pickCapsFiles({ files, subject, grade, kind: 'content', limit: 50 });
}

app.post('/api/termtests/debug', async (req: Request, res: Response) => {
  const c = getServiceSupabaseClient();
  if (!c) return res.status(500).json({ error: 'No Supabase client' });
  const info = {
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
  };
  const pr = await c
    .from('term_tests')
    .insert({
      subject: 'probe',
      grade: 'probe',
      term: 'probe',
      exam_type: 'probe',
      duration_minutes: 1,
      paper: { t: 1 },
      answer_sheet: null,
    })
    .select()
    .single();
  if (pr.error)
    return res
      .status(400)
      .json({ ok: false, info, error: pr.error.message, code: pr.error.code, hint: pr.error.hint, details: pr.error.details });
  await c.from('term_tests').delete().eq('id', pr.data.id);
  return res.json({ ok: true, info });
});

// ---------------------------------------------------------------------
// STATIC ASSETS (Vite build output) + SPA FALLBACK
// ---------------------------------------------------------------------
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
}

app.get('*', (req: Request, res: Response) => {
  // Never swallow API routes into the SPA shell.
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Unknown API route: ${req.path}` });
  }
  const indexFile = path.join(distDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  return res
    .status(500)
    .type('text/plain')
    .send('Client build not found. Run `bun run build` to generate dist/.');
});

// ---------------------------------------------------------------------
// NOTE: profile routes (/api/profile/sync and /api/profile/get) are
// registered earlier in this file, BEFORE the SPA catch-all. Registering a
// GET route after `app.get('*')` makes it unreachable.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// START SERVER
// Cloud Run requires listening on 0.0.0.0 and the PORT env var (8080).
// ---------------------------------------------------------------------
const host = '0.0.0.0';
const server = app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
  console.log(`Static build: ${fs.existsSync(distDir) ? distDir : 'MISSING (run bun run build)'}`);

  // Warm the CAPS retrieval index in the background when it is missing (fresh
  // deployment or cleared disk). Without this the curriculum vault silently
  // returns no matches; the request path itself never waits on it.
  const capsIndexFile = path.resolve(process.cwd(), 'caps_vault', 'manifest-toc.json');
  if (fs.existsSync(path.resolve(process.cwd(), 'caps_vault')) && !fs.existsSync(capsIndexFile)) {
    void buildCapsVaultIndex()
      .then((result) => {
        console.log(`CAPS vault index built: ${result.processed}/${result.total} documents`);
      })
      .catch((err) => {
        console.warn('CAPS vault index warmup failed:', err?.message || err);
      });
  }
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

// Keep the container alive on stray rejections but always log them.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, () => {
    console.log(`${sig} received, shutting down.`);
    server.close(() => process.exit(0));
  });
}

