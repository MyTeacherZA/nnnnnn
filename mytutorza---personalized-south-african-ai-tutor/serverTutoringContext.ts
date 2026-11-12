/**
 * Tutoring context utilities: lightweight RAG retrieval and the zero-cost
 * off-topic scope heuristic.
 *
 * Kept dependency-free so they can be unit-tested without booting the server.
 */

const SCOPE_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'these', 'those', 'from', 'about', 'into',
  'what', 'when', 'where', 'which', 'while', 'your', 'you', 'are', 'was', 'were', 'have',
  'has', 'had', 'can', 'could', 'would', 'should', 'please', 'explain', 'help', 'understand',
  'question', 'answer', 'work', 'show', 'tell', 'give', 'need', 'want', 'know', 'think',
  'again', 'more', 'some', 'then', 'than', 'them', 'they', 'does', 'did', 'how', 'why',
  'topic', 'lesson', 'chapter', 'section', 'case', 'study', 'evidence', 'example',
  'argument', 'typical', 'common', 'inside', 'outside',
]);

/** Field-of-knowledge terms so an on-topic question passes even when it does
 * not share vocabulary with the specific locked topic. */
const DOMAIN_TERMS: Array<{ pattern: RegExp; terms: string[] }> = [
  {
    pattern: /math|algebra|calculus|geometry|trig|statist|pre[- ]?calculus|number theory/i,
    terms: [
      'equation', 'solve', 'factor', 'algebra', 'calculus', 'derivative', 'integral', 'limit',
      'function', 'graph', 'parabola', 'quadratic', 'polynomial', 'linear', 'exponential',
      'trigonometric', 'sine', 'cosine', 'tangent', 'vector', 'matrix', 'probability',
      'statistics', 'circle', 'angle', 'theorem', 'proof', 'slope', 'sequence',
    ],
  },
  {
    pattern: /physic|kinetic|mechanic|electrodynamics|wave|thermodynam/i,
    terms: [
      'velocity', 'acceleration', 'force', 'mass', 'energy', 'momentum', 'newton', 'circuit',
      'electric', 'voltage', 'current', 'resistance', 'friction', 'motion', 'projectile',
      'kinematics', 'dynamics', 'thermodynamics', 'wave', 'frequency', 'optics', 'gravity',
      'torque', 'work', 'power', 'field', 'charge', 'potential', 'capacitor', 'inductor',
    ],
  },
  {
    pattern: /chem/i,
    terms: [
      'acid', 'base', 'ph', 'mole', 'reaction', 'compound', 'element', 'atom', 'ion',
      'organic', 'bonding', 'enthalpy', 'equilibrium', 'isotope', 'stoichiometry',
      'electrolyte', 'oxidation', 'reduction', 'titration', 'concentration',
    ],
  },
  {
    pattern: /bio|life science/i,
    terms: [
      'cell', 'dna', 'gene', 'protein', 'photosynthesis', 'respiration', 'organism',
      'ecosystem', 'evolution', 'species', 'membrane', 'mitosis', 'meiosis', 'nucleus',
      'enzyme', 'amino', 'chromosome', 'inheritance', 'mutation', 'homeostasis',
    ],
  },
  {
    pattern: /english|literatur|lang|language arts|grammar|composition/i,
    terms: [
      'metaphor', 'simile', 'theme', 'character', 'plot', 'structure', 'writer',
      'poet', 'analysis', 'essay', 'quotation', 'perspective', 'genre', 'imagery',
      'language', 'poem', 'novel', 'drama', 'narrator',
    ],
  },
  {
    pattern: /historic|history/i,
    terms: [
      'cause', 'effect', 'war', 'treaty', 'empire', 'revolution', 'century',
      'government', 'dynasty', 'cold', 'colonial', 'independence', 'constitution',
      'civil', 'conflict', 'movement', 'reform',
    ],
  },
  {
    pattern: /geograph/i,
    terms: [
      'river', 'landscape', 'management', 'erosion', 'flood', 'drainage', 'basin',
      'waterfall', 'meander', 'delta', 'plate', 'tectonic', 'climate', 'weathering',
      'relief', 'coast', 'population', 'urban', 'migration', 'settlement',
    ],
  },
  {
    pattern: /account|business|econom|finance/i,
    terms: [
      'marketing', 'finance', 'profit', 'cost', 'market', 'consumer', 'organisation',
      'strategy', 'stakeholder', 'business', 'revenue', 'expense', 'asset', 'liability',
      'ledger', 'depreciation', 'cash', 'budget', 'supply', 'demand',
    ],
  },
  {
    pattern: /comput|programming|it|informat/i,
    terms: [
      'variable', 'loop', 'function', 'array', 'algorithm', 'boolean', 'index',
      'string', 'integer', 'class', 'object', 'logic', 'debug', 'compile', 'syntax',
      'method', 'parameter', 'return', 'condition', 'iteration',
    ],
  },
];

function normalise(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * RAG retrieval with coverage scoring.
 *
 * `bestScore` is how many times the strongest chunk matches the query terms;
 * 0 means nothing in the source covers the request — the router then knows
 * the uploaded source cannot answer and falls back to the web (or training
 * knowledge strictly on the locked topic).
 */
export function selectSourceChunksWithScore(
  text: string,
  query: string,
  maxChars: number = 12000,
): { text: string; bestScore: number; coverageCount: number } {
  const clean = String(text || '').trim();
  if (!clean) return { text: '', bestScore: 0, coverageCount: 0 };
  if (clean.length <= maxChars) {
    const lower = clean.toLowerCase();
    const terms = String(query || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 2);
    const hits = terms.length ? terms.reduce((sum, t) => sum + (lower.includes(t) ? 1 : 0), 0) : 1;
    return { text: clean, bestScore: hits, coverageCount: hits > 0 ? 1 : 0 };
  }

  const chunkSize = 1800;
  const overlap = 200;
  const chunks: { index: number; content: string }[] = [];
  for (let start = 0; start < clean.length; start += chunkSize - overlap) {
    chunks.push({ index: chunks.length, content: clean.slice(start, start + chunkSize) });
    if (start + chunkSize >= clean.length) break;
  }

  const terms = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);

  const scored = chunks.map((chunk) => {
    const lower = chunk.content.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
    return { ...chunk, score };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const bestScore = scored[0]?.score ?? 0;
  const picked: { index: number; content: string }[] = [];
  let total = 0;
  for (const chunk of scored) {
    if (chunk.score === 0) break;
    if (total + chunk.content.length > maxChars) continue;
    picked.push(chunk);
    total += chunk.content.length;
    if (total >= maxChars - chunkSize) break;
  }
  if (picked.length === 0) {
    // Nothing matched: return the head of the source so the prompt still
    // references it, but report zero coverage for the router.
    return { text: clean.slice(0, maxChars), bestScore, coverageCount: 0 };
  }
  picked.sort((a, b) => a.index - b.index);
  return { text: picked.map((chunk) => chunk.content).join('\n\n[...]\n\n'), bestScore, coverageCount: picked.length };
}

/** Backwards-compatible wrapper: returns the chunk string only. */
export function selectSourceChunks(text: string, query: string, maxChars: number = 12000): string {
  return selectSourceChunksWithScore(text, query, maxChars).text;
}

/**
 * Cheap, zero-LLM signal that a tutoring exchange is worth extracting
 * learning data from. Runs before we spend a single DeepSeek query on
 * extraction.
 */
const STRUGGLE_SIGNAL =
  /\b(don'?t understand|doesn'?t (make sense|add up)|confused|confus(?:ion|ing)|wrong|incorrect|nope|no sense|stuck|lost|unclear|explain again|how (do|does|can) (i|we|you)|what (do|does|is) .* for|mark|failing|flunk|impossible|impossible|hard|difficult)\b/i;
const ASSESS_SIGNAL =
  /\b(solve|answer|work out|find|calculate|evaluate|prove|show|identify|state|derive|explain|why)\b/i;

export function detectStruggleSignal(message: string): boolean {
  const raw = String(message || '').trim();
  if (raw.length < 10) return false;
  return STRUGGLE_SIGNAL.test(raw) || ASSESS_SIGNAL.test(raw);
}

export function isPossiblyOffTopic(
  message: string,
  lockedTopic: string,
  tocTitles: string[] = [],
  subject: string = '',
): boolean {
  const raw = String(message || '').trim();
  if (raw.length < 12) return false;

  // Conversational continuations are always in-scope. Note: we deliberately
  // do NOT treat "can you help me..." or "how do I..." openers as in-scope —
  // those are exactly how off-topic requests are phrased. Lexical overlap
  // below decides those.
  if (
    /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|help|i (do not|don't) (understand|get it)|what do you mean|repeat|again|next|continue|go on)\b/i.test(
      raw,
    )
  ) {
    return false;
  }

  // Scope haystack = locked topic + source sections + a field-of-knowledge
  // vocabulary for the subject, so genuinely on-topic asks pass.
  const domainTerms: string[] = [];
  for (const { pattern, terms } of DOMAIN_TERMS) {
    if (pattern.test(subject) || pattern.test(lockedTopic)) {
      domainTerms.push(...terms);
    }
  }

  const scopeHaystack = normalise([lockedTopic, ...tocTitles, ...domainTerms].join(' '));
  if (!scopeHaystack) return false;

  const messageTerms = normalise(raw)
    .split(' ')
    .filter((term) => term.length > 3 && !SCOPE_STOPWORDS.has(term));
  if (messageTerms.length < 3) return false;

  const scopeTerms = [...new Set(scopeHaystack.split(' ').filter((term) => term.length > 3))];
  const overlaps = messageTerms.some((term) =>
    scopeTerms.some(
      (scopeTerm) =>
        term === scopeTerm ||
        term.startsWith(scopeTerm.slice(0, 4)) ||
        scopeTerm.startsWith(term.slice(0, 4)),
    ),
  );

  return !overlaps;
}
