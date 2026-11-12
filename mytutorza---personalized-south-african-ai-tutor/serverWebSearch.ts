/**
 * Bounded web search for the tutoring Knowledge Router.
 *
 * Provider-agnostic: prefers Tavily, falls back to Brave Search, and silently
 * disables itself (returns null) when no key is configured — the tutor then
 * works exactly as before (uploaded source + training knowledge).
 *
 * Cost: search results are capped at 3 snippets and cached in Upstash by query
 * hash, so identical questions are free.
 */

export interface WebSnippet {
  title: string;
  url: string;
  snippet: string;
}

/** Freshness / "live world" intent detection (zero LLM cost). */
const FRESHNESS_PATTERN =
  /\b(recent|recently|current|currently|latest|today|this (year|week|month)|now|news|2024|2025|2026|new(ly)?|up[- ]?to[- ]?date|breaking|release|update)\b/i;

export function detectNeedsWeb(message: string): boolean {
  return FRESHNESS_PATTERN.test(String(message || ''));
}

export async function searchWeb(query: string, maxResults: number = 3): Promise<WebSnippet[] | null> {
  const clean = String(query || '').trim().slice(0, 500);
  if (!clean) return null;

  const tavilyKey = process.env.TAVILY_API_KEY || '';
  const braveKey = process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY || '';

  // --- Tavily (default) ---------------------------------------------------
  if (tavilyKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: clean,
          search_depth: 'basic',
          max_results: Math.min(5, Math.max(1, maxResults)),
          include_answer: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        console.warn('Tavily search failed:', res.status, (await res.text()).slice(0, 200));
        // Fall through to Brave if configured.
      } else {
        const data: any = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        return results
          .slice(0, maxResults)
          .map((r: any) => ({
            title: String(r?.title || '').slice(0, 200),
            url: String(r?.url || '').slice(0, 500),
            snippet: String(r?.content || '').slice(0, 500),
          }))
          .filter((s: WebSnippet) => s.title || s.snippet);
      }
    } catch (err: any) {
      console.warn('Tavily search error:', err?.message || err);
      // Fall through to Brave if configured.
    }
  }

  // --- Brave Search (alternative) ------------------------------------------
  if (braveKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
        clean,
      )}&count=${Math.min(5, Math.max(1, maxResults))}&safesearch=strict`;
      const res = await fetch(url, {
        headers: {
          'X-Subscription-Token': braveKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        console.warn('Brave search failed:', res.status, (await res.text()).slice(0, 200));
        return null;
      }
      const data: any = await res.json();
      const results = Array.isArray(data?.web?.results) ? data.web.results : [];
      return results
        .slice(0, maxResults)
        .map((r: any) => ({
          title: String(r?.title || '').slice(0, 200),
          url: String(r?.url || '').slice(0, 500),
          snippet: String(r?.description || '').slice(0, 500),
        }))
        .filter((s: WebSnippet) => s.title || s.snippet);
    } catch (err: any) {
      console.warn('Brave search error:', err?.message || err);
      return null;
    }
  }

  return null;
}

/** Web provider configured? Used to report status without leaking keys. */
export function webSearchConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY || process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_API_KEY);
}
