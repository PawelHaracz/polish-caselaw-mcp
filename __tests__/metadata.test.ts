import { describe, it, expect } from 'vitest';
import { caselawMetadata, wrap } from '../src/utils/metadata.js';

describe('caselawMetadata', () => {
  it('returns SAOS provenance constants', () => {
    const m = caselawMetadata();
    expect(m.jurisdiction).toBe('PL');
    expect(m.data_source.toLowerCase()).toContain('saos');
    expect(m.freshness).toBe('live');
    expect(m.disclaimer.toLowerCase()).toContain('not legal advice');
  });

  it('merges extra fields', () => {
    const m = caselawMetadata({ note: 'hello', query_strategy: 'relevance' });
    expect(m.note).toBe('hello');
    expect(m.query_strategy).toBe('relevance');
    expect(m.jurisdiction).toBe('PL'); // constants still present
  });
});

describe('wrap', () => {
  it('wraps results with metadata', () => {
    const r = wrap({ a: 1 }, { note: 'n' });
    expect(r.results).toEqual({ a: 1 });
    expect(r._metadata.note).toBe('n');
    expect(r._metadata.jurisdiction).toBe('PL');
  });
});
