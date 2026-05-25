/**
 * Talks to the GitHub Releases API to pull the changelog body for a
 * given tag. Cached in memory + sessionStorage so flipping between
 * states doesn't re-fetch on every render. No auth required: public
 * repo, ~60 req/hour anon limit which we won't get near.
 */

const REPO = 'Gstxxx/Financas-pwa';
const CACHE_KEY_PREFIX = 'finance_changelog:';

const memoryCache = new Map<string, string>();

export async function fetchChangelog(version: string): Promise<string | null> {
  const tag = version.startsWith('v') ? version : `v${version}`;
  if (memoryCache.has(tag)) return memoryCache.get(tag)!;
  try {
    const cached = sessionStorage.getItem(CACHE_KEY_PREFIX + tag);
    if (cached) {
      memoryCache.set(tag, cached);
      return cached;
    }
  } catch {
    /* ignore session storage failures */
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases/tags/${tag}`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { body?: string | null };
    const body = (data.body ?? '').trim();
    memoryCache.set(tag, body);
    try {
      sessionStorage.setItem(CACHE_KEY_PREFIX + tag, body);
    } catch {
      /* storage full / disabled — fine */
    }
    return body;
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}
