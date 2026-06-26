import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findJudgmentsForProvision } from '../src/tools/find-judgments-for-provision.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const judgment2 = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'judgment-2.json'), 'utf-8'),
);

describe('findJudgmentsForProvision', () => {
  it('resolves eli id from journal_year/entry and marks confirmed references', async () => {
    // search returns one item (id 2), full doc references pl-du-1964-296
    const search = vi.fn(async () => ({
      items: [{ id: 2, courtType: 'COMMON', judgmentDate: '2012-10-16', courtCases: [{ caseNumber: 'I ACa 1105/12' }], textContent: 'x' }],
      info: { totalResults: 1 },
    }));
    const fetchById = vi.fn(async () => judgment2);

    const out = await findJudgmentsForProvision(
      { journal_year: 1964, journal_entry: 296, limit: 5 },
      { search: search as never, fetchById: fetchById as never },
    );
    expect(out.target_eli_id).toBe('pl-du-1964-296');
    expect(out.items).toHaveLength(1);
    expect(out.items[0].confirmed_reference).toBe(true);
  });

  it('marks confirmed_reference false when full doc does not cite the provision', async () => {
    const search = vi.fn(async () => ({
      items: [{ id: 2, courtType: 'COMMON', textContent: 'x' }],
      info: { totalResults: 1 },
    }));
    const fetchById = vi.fn(async () => judgment2); // references 1964/296, not 1997/553
    const out = await findJudgmentsForProvision(
      { document_id: 'pl-du-1997-553', article: 'art. 267', limit: 5 },
      { search: search as never, fetchById: fetchById as never },
    );
    expect(out.target_eli_id).toBe('pl-du-1997-553');
    expect(out.items[0].confirmed_reference).toBe(false);
  });

  it('throws when neither document_id nor journal year/entry provided', async () => {
    await expect(findJudgmentsForProvision({})).rejects.toThrow();
  });

  it('caps full-document fetches at the configured maximum', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, textContent: 'x' }));
    const search = vi.fn(async () => ({ items: many, info: { totalResults: 50 } }));
    const fetchById = vi.fn(async () => judgment2);
    await findJudgmentsForProvision(
      { document_id: 'pl-du-1964-296', limit: 50 },
      { search: search as never, fetchById: fetchById as never },
    );
    expect(fetchById.mock.calls.length).toBeLessThanOrEqual(10);
  });
});
