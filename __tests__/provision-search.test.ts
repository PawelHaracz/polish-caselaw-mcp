import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findJudgmentsCitingProvision } from '../src/saos/provision-search.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const judgment2 = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'judgment-2.json'), 'utf-8'),
);

describe('findJudgmentsCitingProvision', () => {
  it('resolves eli and confirms references; returns confirmed-only', async () => {
    const search = vi.fn(async () => ({
      items: [{ id: 2, courtType: 'COMMON', textContent: 'x' }],
      info: { totalResults: 1 },
    }));
    const fetchById = vi.fn(async () => judgment2); // cites pl-du-1964-296
    const out = await findJudgmentsCitingProvision(
      { journal_year: 1964, journal_entry: 296, limit: 5 },
      { search: search as never, fetchById: fetchById as never },
    );
    expect(out.target_eli_id).toBe('pl-du-1964-296');
    expect(out.confirmed_count).toBe(1);
    expect(out.items[0].confirmed_reference).toBe(true);
  });

  it('forwards courtType to the SAOS search when provided', async () => {
    const search = vi.fn(async (params: Record<string, unknown>) => {
      expect(params.courtType).toBe('CONSTITUTIONAL_TRIBUNAL');
      return { items: [], info: { totalResults: 0 } };
    });
    const fetchById = vi.fn(async () => judgment2);
    await findJudgmentsCitingProvision(
      { document_id: 'pl-du-1997-553' },
      { search: search as never, fetchById: fetchById as never },
      { courtType: 'CONSTITUTIONAL_TRIBUNAL' },
    );
    expect(search).toHaveBeenCalledOnce();
  });

  it('omits courtType when not provided', async () => {
    const search = vi.fn(async (params: Record<string, unknown>) => {
      expect('courtType' in params).toBe(false);
      return { items: [], info: { totalResults: 0 } };
    });
    await findJudgmentsCitingProvision(
      { document_id: 'pl-du-1997-553' },
      { search: search as never, fetchById: (async () => judgment2) as never },
    );
    expect(search).toHaveBeenCalledOnce();
  });

  it('caps full-document fetches at the maximum', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, textContent: 'x' }));
    const search = vi.fn(async () => ({ items: many, info: { totalResults: 50 } }));
    const fetchById = vi.fn(async () => judgment2);
    await findJudgmentsCitingProvision(
      { document_id: 'pl-du-1964-296', limit: 50 },
      { search: search as never, fetchById: fetchById as never },
    );
    expect(fetchById.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it('throws when neither document_id nor journal year/entry provided', async () => {
    await expect(findJudgmentsCitingProvision({})).rejects.toThrow();
  });
});
