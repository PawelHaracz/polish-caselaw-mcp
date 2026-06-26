import { describe, it, expect, vi } from 'vitest';
import { searchJudgments, getJudgmentById, SaosError } from '../src/saos/client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('searchJudgments', () => {
  it('builds the query string and returns parsed JSON', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      expect(url).toContain('/search/judgments');
      expect(url).toContain('all=ochrona');
      expect(url).toContain('pageSize=5');
      return jsonResponse({ items: [], info: { totalResults: 0 } });
    });
    const out = await searchJudgments({ all: 'ochrona', pageSize: 5 }, fetchFn as unknown as typeof fetch);
    expect(out.info?.totalResults).toBe(0);
  });

  it('omits undefined params', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      expect(url).not.toContain('courtType');
      return jsonResponse({ items: [] });
    });
    await searchJudgments({ all: 'x', courtType: undefined }, fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledOnce();
  });
});

describe('getJudgmentById', () => {
  it('throws SaosError notfound on 404', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ error: 'no' }, 404));
    await expect(
      getJudgmentById(999999, fetchFn as unknown as typeof fetch),
    ).rejects.toMatchObject({ code: 'notfound' });
  });

  it('throws SaosError ratelimited on 429', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}, 429));
    await expect(
      getJudgmentById(1, fetchFn as unknown as typeof fetch),
    ).rejects.toMatchObject({ code: 'ratelimited' });
  });
});

describe('retry on network error', () => {
  it('retries once then succeeds', async () => {
    let calls = 0;
    const fetchFn = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('network down');
      return jsonResponse({ data: { id: 1 } });
    });
    const out = await getJudgmentById(1, fetchFn as unknown as typeof fetch);
    expect(calls).toBe(2);
    expect(out.data.id).toBe(1);
  });

  it('throws SaosError network after retry also fails', async () => {
    const fetchFn = vi.fn(async () => { throw new TypeError('still down'); });
    await expect(
      getJudgmentById(1, fetchFn as unknown as typeof fetch),
    ).rejects.toMatchObject({ code: 'network' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
