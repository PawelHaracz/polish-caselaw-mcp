import { describe, it, expect } from 'vitest';
import { listCourts } from '../src/tools/list-courts.js';
import { getAbout } from '../src/tools/about.js';
import { listSources } from '../src/tools/list-sources.js';

describe('listCourts', () => {
  it('returns the five SAOS court types', () => {
    const out = listCourts();
    const codes = out.results.courts.map((c) => c.code);
    expect(codes).toContain('SUPREME');
    expect(codes).toContain('CONSTITUTIONAL_TRIBUNAL');
    expect(out.results.courts).toHaveLength(5);
  });
});

describe('getAbout', () => {
  it('reports SAOS as the live source and is not legal advice', () => {
    const out = getAbout();
    expect(out.results.name).toBe('Polish Case Law MCP');
    expect(out.results.data_sources[0].name).toContain('SAOS');
    expect(out.results.freshness.mode).toBe('live');
    expect(out.results.disclaimer.toLowerCase()).toContain('not legal advice');
  });
});

describe('listSources', () => {
  it('returns correct SAOS provenance (no Australian placeholder)', () => {
    const out = listSources();
    const joined = JSON.stringify(out.results).toLowerCase();
    expect(joined).toContain('saos');
    expect(joined).not.toContain('australia');
    expect(joined).not.toContain('legislation.gov.au');
  });
});
