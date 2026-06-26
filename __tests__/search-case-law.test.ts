import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { searchCaseLaw } from '../src/tools/search-case-law.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'search-ochrona-danych.json'), 'utf-8'),
);

describe('searchCaseLaw', () => {
  it('maps query/sort/limit to SAOS params and returns mapped results', async () => {
    const search = vi.fn(async (params: Record<string, unknown>) => {
      expect(params.all).toBe('ochrona danych');
      expect(params.pageSize).toBe(5);
      expect(params.sortingField).toBe('JUDGMENT_DATE');
      expect(params.courtType).toBe('SUPREME');
      return fixture;
    });
    const out = await searchCaseLaw(
      { query: 'ochrona danych', sort: 'date', limit: 5, court_type: 'SUPREME' },
      { search: search as never },
    );
    expect(out.total_results).toBe(128349);
    expect(out.items[0].snippet.includes('<em>')).toBe(false);
  });

  it('clamps limit to MAX_LIMIT and defaults sort to relevance', async () => {
    const search = vi.fn(async (params: Record<string, unknown>) => {
      expect(params.pageSize).toBe(100);
      expect(params.sortingField).toBe('DATABASE_ID');
      return { items: [], info: { totalResults: 0 } };
    });
    await searchCaseLaw({ query: 'x', limit: 999 }, { search: search as never });
    expect(search).toHaveBeenCalledOnce();
  });

  it('throws on empty query', async () => {
    await expect(searchCaseLaw({ query: '   ' })).rejects.toThrow();
  });
});
