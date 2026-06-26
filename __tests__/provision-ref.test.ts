import { describe, it, expect } from 'vitest';
import { parseArticleRefs } from '../src/saos/provision-ref.js';

describe('parseArticleRefs', () => {
  it('parses a bare article', () => {
    expect(parseArticleRefs('art. 267')).toEqual(['art267']);
  });

  it('parses paragraph (§), ustęp, punkt, litera', () => {
    expect(parseArticleRefs('art. 267 § 1')).toEqual(['art267par1']);
    expect(parseArticleRefs('art. 1 ust. 2')).toEqual(['art1u2']);
    expect(parseArticleRefs('art. 4 pkt 1')).toEqual(['art4p1']);
    expect(parseArticleRefs('art. 87 § 2 lit. a')).toEqual(['art87par2la']);
  });

  it('parses the real SAOS fixture text into deduped ordered refs', () => {
    const text =
      'Ustawa z dnia 17 listopada 1964 r. - Kodeks postępowania cywilnego ' +
      '(Dz. U. z 1964 r. Nr 43, poz. 296 - art. 370; art. 373; art. 61; ' +
      'art. 62; art. 87; art. 87 § 1; art. 87 § 2; art. 87 § 2 zd. 2)';
    expect(parseArticleRefs(text)).toEqual([
      'art370', 'art373', 'art61', 'art62', 'art87', 'art87par1', 'art87par2',
    ]);
  });

  it('returns [] for text with no article references', () => {
    expect(parseArticleRefs('Some title with no articles')).toEqual([]);
    expect(parseArticleRefs('')).toEqual([]);
  });
});
