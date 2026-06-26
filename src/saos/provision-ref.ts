/**
 * Parse the inline article list inside a SAOS referencedRegulations[].text
 * into polish-law-mcp's hierarchical ref scheme.
 *
 *   art. 267            -> art267
 *   art. 267 § 1        -> art267par1
 *   art. 1 ust. 2       -> art1u2
 *   art. 4 pkt 1        -> art4p1
 *   art. 87 § 2 lit. a  -> art87par2la
 *
 * Sub-levels we don't model (e.g. "zd." / "zdanie") are ignored; the ref
 * collapses to its nearest modelled ancestor. Deduplicates, preserves
 * first-seen order, never throws.
 */

// One article reference: "art. <num>" then optional §/ust./pkt/lit. segments.
// Numbers may carry a lowercase letter suffix (e.g. "art. 268a").
const ARTICLE_RE =
  /art\.?\s*(\d+[a-z]?)((?:\s*(?:§|ust\.?|pkt|lit\.?)\s*[0-9a-z]+)*)/gi;
const SEGMENT_RE = /(§|ust\.?|pkt|lit\.?)\s*([0-9a-z]+)/gi;

function tagFor(marker: string): string {
  const m = marker.toLowerCase();
  if (m === '§') return 'par';
  if (m.startsWith('ust')) return 'u';
  if (m === 'pkt') return 'p';
  if (m.startsWith('lit')) return 'l';
  return '';
}

export function parseArticleRefs(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();

  for (const m of text.matchAll(ARTICLE_RE)) {
    let ref = `art${m[1]}`;
    const tail = m[2] ?? '';
    for (const seg of tail.matchAll(SEGMENT_RE)) {
      const tag = tagFor(seg[1]);
      if (!tag) continue;
      ref += `${tag}${seg[2].toLowerCase()}`;
    }
    if (!seen.has(ref)) {
      seen.add(ref);
      out.push(ref);
    }
  }
  return out;
}
