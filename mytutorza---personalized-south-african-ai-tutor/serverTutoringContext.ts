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
]);

function normalise(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits a source into overlapping chunks and returns only the chunks most
 * relevant to the locked topic + learner message. This is the RAG step that
 * keeps prompt tokens (and therefore cost) small on large textbooks.
 */
export function selectSourceChunks(text: string, query: string, maxChars: number = 12000): string {
  const clean = String(text || '').trim();
  if (!clean) return '';
  if (clean.length <= maxChars) return clean;

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

  const picked: { index: number; content: string }[] = [];
  let total = 0;
  for (const chunk of scored) {
    if (total + chunk.content.length > maxChars) continue;
    picked.push(chunk);
    total += chunk.content.length;
    if (total >= maxChars - chunkSize) break;
  }
  if (picked.length === 0) return clean.slice(0, maxChars);
  picked.sort((a, b) => a.index - b.index);
  return picked.map((chunk) => chunk.content).join('\n\n[...]\n\n');
}

/**
 * Cheap, local heuristic (zero LLM cost) that flags messages with no lexical
 * overlap with the locked topic or the source's detected sections. It never
 * blocks a message: it only adds a soft "apply the off-topic test" directive.
 */
export function isPossiblyOffTopic(
  message: string,
  lockedTopic: string,
  tocTitles: string[] = [],
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

  const scopeHaystack = normalise([lockedTopic, ...tocTitles].join(' '));
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
