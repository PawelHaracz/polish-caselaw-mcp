import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkConstitutionalStatus } from '../src/tools/check-constitutional-status.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const judgment2 = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'judgment-2.json'), 'utf-8'),
);

describe('checkConstitutionalStatus', () => {
  it('pins court_type=CONSTITUTIONAL_TRIBUNAL and returns tribunal_judgments', async () => {
    const search = vi.fn(async (params: Record<string, unknown>) => {
      expect(params.courtType).toBe('CONSTITUTIONAL_TRIBUNAL');
      return {
        items: [{ id: 2, courtType: 'CONSTITUTIONAL_TRIBUNAL', textContent: 'x' }],
        info: { totalResults: 1 },
      };
    });
    const fetchById = vi.fn(async () => judgment2); // cites pl-du-1964-296
    const out = await checkConstitutionalStatus(
      { journal_year: 1964, journal_entry: 296, limit: 5 },
      { search: search as never, fetchById: fetchById as never },
    );
    expect(out._metadata.jurisdiction).toBe('PL');
    expect(out._metadata.note).toContain('does NOT mean the provision was struck down');
    expect(out.results.target_eli_id).toBe('pl-du-1964-296');
    expect(out.results.tribunal_judgments).toHaveLength(1);
    expect(out.results.tribunal_judgments[0].confirmed_reference).toBe(true);
  });

  it('throws when no provision identifier is given', async () => {
    await expect(checkConstitutionalStatus({})).rejects.toThrow();
  });
});
