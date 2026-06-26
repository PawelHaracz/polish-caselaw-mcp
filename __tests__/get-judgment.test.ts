import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getJudgment } from '../src/tools/get-judgment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'judgment-2.json'), 'utf-8'),
);

describe('getJudgment', () => {
  it('fetches by id and returns mapped detail', async () => {
    const fetchById = vi.fn(async (id: string | number) => {
      expect(String(id)).toBe('2');
      return fixture;
    });
    const out = await getJudgment({ id: 2 }, { fetchById: fetchById as never });
    expect(out.results.id).toBe(2);
    expect(out.results.referenced_regulations[0].eli_id).toBe('pl-du-1964-296');
    expect(out.results.full_text.length).toBeGreaterThan(1000);
  });

  it('throws when id is missing', async () => {
    await expect(getJudgment({ id: '' as unknown as string })).rejects.toThrow();
  });
});
