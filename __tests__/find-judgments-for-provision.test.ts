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
  it('wraps result in ToolResponse with SAOS metadata; confirms references', async () => {
    const search = vi.fn(async () => ({
      items: [{ id: 2, courtType: 'COMMON', textContent: 'x' }],
      info: { totalResults: 1 },
    }));
    const fetchById = vi.fn(async () => judgment2);
    const out = await findJudgmentsForProvision(
      { journal_year: 1964, journal_entry: 296, limit: 5 },
      { search: search as never, fetchById: fetchById as never },
    );
    expect(out._metadata.jurisdiction).toBe('PL');
    expect(out.results.target_eli_id).toBe('pl-du-1964-296');
    expect(out.results.confirmed_count).toBe(1);
    expect(out.results.items[0].confirmed_reference).toBe(true);
  });

  it('falls back with a note (in metadata) when nothing is confirmed', async () => {
    const search = vi.fn(async () => ({
      items: [{ id: 2, courtType: 'COMMON', textContent: 'x' }],
      info: { totalResults: 1 },
    }));
    const fetchById = vi.fn(async () => judgment2); // cites 1964/296, not 1997/553
    const out = await findJudgmentsForProvision(
      { document_id: 'pl-du-1997-553', article: 'art. 267', limit: 5 },
      { search: search as never, fetchById: fetchById as never },
    );
    expect(out.results.confirmed_count).toBe(0);
    expect(out.results.note).toBeTruthy();
    expect(out._metadata.note).toBeTruthy();
    expect(out.results.items[0].confirmed_reference).toBe(false);
  });

  it('throws when neither document_id nor journal year/entry provided', async () => {
    await expect(findJudgmentsForProvision({})).rejects.toThrow();
  });
});
