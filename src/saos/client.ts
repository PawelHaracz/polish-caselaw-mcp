import { SAOS_BASE_URL, HTTP_TIMEOUT_MS, RETRY_BACKOFF_MS } from '../constants.js';
import type { SaosSearchResponse, SaosJudgmentResponse } from './types.js';

export type SaosErrorCode = 'timeout' | 'network' | 'http' | 'notfound' | 'ratelimited';

export class SaosError extends Error {
  code: SaosErrorCode;
  status?: number;
  constructor(code: SaosErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'SaosError';
    this.code = code;
    this.status = status;
  }
}

type FetchFn = typeof fetch;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, String(v));
  }
  const q = usp.toString();
  return q ? `?${q}` : '';
}

async function fetchJson<T>(path: string, fetchFn: FetchFn): Promise<T> {
  const url = `${SAOS_BASE_URL}${path}`;
  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    try {
      return await fetchFn(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const backoff = () => new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));

  let res: Response;
  try {
    res = await attempt();
  } catch (err) {
    // One retry on network/abort error, after a short backoff so a slow
    // upstream is not hit again immediately.
    if (err instanceof Error && err.name === 'AbortError') {
      try {
        await backoff();
        res = await attempt();
      } catch (err2) {
        if (err2 instanceof Error && err2.name === 'AbortError') {
          throw new SaosError('timeout', `SAOS request timed out: ${url}`);
        }
        throw new SaosError('network', `SAOS network error: ${url}`);
      }
    } else {
      try {
        await backoff();
        res = await attempt();
      } catch {
        throw new SaosError('network', `SAOS network error: ${url}`);
      }
    }
  }

  if (res.status === 404) throw new SaosError('notfound', `Not found: ${url}`, 404);
  if (res.status === 429) throw new SaosError('ratelimited', `SAOS rate-limited: ${url}`, 429);
  if (!res.ok) throw new SaosError('http', `SAOS HTTP ${res.status}: ${url}`, res.status);

  return (await res.json()) as T;
}

export function searchJudgments(
  params: Record<string, string | number | undefined>,
  fetchFn: FetchFn = fetch,
): Promise<SaosSearchResponse> {
  return fetchJson<SaosSearchResponse>(`/search/judgments${buildQuery(params)}`, fetchFn);
}

export function getJudgmentById(
  id: string | number,
  fetchFn: FetchFn = fetch,
): Promise<SaosJudgmentResponse> {
  return fetchJson<SaosJudgmentResponse>(`/judgments/${encodeURIComponent(String(id))}`, fetchFn);
}
