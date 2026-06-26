import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  cleanSnippet,
  regulationToEliId,
  saosUrl,
  mapSearchResponse,
  mapJudgment,
} from '../src/saos/map.js';
import type { SaosSearchResponse, SaosJudgmentResponse } from '../src/saos/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (f: string) =>
  JSON.parse(readFileSync(join(__dirname, 'fixtures', f), 'utf-8'));

describe('cleanSnippet', () => {
  it('converts <em> markup to >>> <<< and strips other tags', () => {
    expect(cleanSnippet('a <em>foo</em> b')).toBe('a >>>foo<<< b');
    expect(cleanSnippet('<p>x</p>')).toBe('x');
    expect(cleanSnippet('plain')).toBe('plain');
  });

  it('merges adjacent <em> highlights into a single >>> <<< region', () => {
    // SAOS returns many separate <em> tags; naive replace produced
    // unreadable runs like ">>>dane>>osobowe<<<". Adjacent (whitespace-only
    // separated) highlights should collapse into one region.
    expect(cleanSnippet('<em>dane</em><em>osobowe</em>')).toBe('>>>dane osobowe<<<');
    expect(cleanSnippet('x <em>dane</em> <em>osobowe</em> y')).toBe('x >>>dane osobowe<<< y');
  });

  it('keeps separate highlights separated by real text distinct', () => {
    expect(cleanSnippet('<em>a</em> real text <em>b</em>')).toBe('>>>a<<< real text >>>b<<<');
  });
});

describe('regulationToEliId', () => {
  it('maps journalYear + journalEntry to pl-du id', () => {
    expect(regulationToEliId({ journalYear: 1964, journalEntry: 296 })).toBe('pl-du-1964-296');
  });
});

describe('saosUrl', () => {
  it('builds the public judgment URL', () => {
    expect(saosUrl(2)).toBe('https://www.saos.org.pl/judgments/2');
  });
});

describe('mapSearchResponse', () => {
  it('maps the real search fixture', () => {
    const resp = load('search-ochrona-danych.json') as SaosSearchResponse;
    const out = mapSearchResponse(resp);
    expect(out.total_results).toBe(128349);
    expect(out.items.length).toBeGreaterThan(0);
    const first = out.items[0];
    expect(typeof first.id).toBe('number');
    expect(first.snippet.includes('<em>')).toBe(false);
    expect(first.saos_url).toBe(`https://www.saos.org.pl/judgments/${first.id}`);
  });
});

describe('mapJudgment', () => {
  it('maps the real full-judgment fixture', () => {
    const resp = load('judgment-2.json') as SaosJudgmentResponse;
    const out = mapJudgment(resp);
    expect(out.id).toBe(2);
    expect(out.court_type).toBe('COMMON');
    expect(out.court_name).toBe('Sąd Apelacyjny w Krakowie');
    expect(out.case_numbers).toContain('I ACa 1105/12');
    expect(out.judgment_date).toBe('2012-10-16');
    expect(out.judges).toContain('Anna Kowacz-Braun');
    expect(out.full_text.length).toBeGreaterThan(1000);
    expect(out.referenced_regulations[0].eli_id).toBe('pl-du-1964-296');
    expect(out.saos_url).toBe('https://www.saos.org.pl/judgments/2');
  });
});
