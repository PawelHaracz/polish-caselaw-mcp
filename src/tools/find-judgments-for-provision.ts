/**
 * find_judgments_for_provision — judgments that cite a given statutory provision.
 *
 * SAOS has no server-side "cited regulation" filter, so we: text-search,
 * then fetch the top-N full documents and confirm via referencedRegulations.
 */
import { searchJudgments, getJudgmentById } from '../saos/client.js';
import { mapSearchResponse, mapJudgment, type CaseLawSummary } from '../saos/map.js';
import { MAX_PROVISION_FETCHES, FETCH_THROTTLE_MS } from '../constants.js';

export interface FindInput {
  document_id?: string;
  journal_year?: number;
  journal_entry?: number;
  article?: string;
  title_hint?: string;
  limit?: number;
}

export interface FindResultItem extends CaseLawSummary {
  confirmed_reference: boolean;
}

export interface FindResult {
  query_used: string;
  target_eli_id: string;
  confirmed_count: number;
  note?: string;
  items: FindResultItem[];
}

function resolveEliId(input: FindInput): string {
  if (input.document_id && /^pl-du-\d+-\d+$/.test(input.document_id.trim())) {
    return input.document_id.trim();
  }
  if (input.journal_year != null && input.journal_entry != null) {
    return `pl-du-${input.journal_year}-${input.journal_entry}`;
  }
  throw new Error('Provide document_id (pl-du-YYYY-NNN) or journal_year + journal_entry.');
}

function parseEli(eliId: string): { year: number; entry: number } {
  const m = eliId.match(/^pl-du-(\d+)-(\d+)$/);
  if (!m) throw new Error(`Invalid ELI id: ${eliId}`);
  return { year: Number(m[1]), entry: Number(m[2]) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function findJudgmentsForProvision(
  input: FindInput,
  deps: { search?: typeof searchJudgments; fetchById?: typeof getJudgmentById } = {},
): Promise<FindResult> {
  const search = deps.search ?? searchJudgments;
  const fetchById = deps.fetchById ?? getJudgmentById;

  const targetEliId = resolveEliId(input);
  const { year, entry } = parseEli(targetEliId);

  const queryParts = [input.title_hint?.trim(), input.article?.trim()].filter(Boolean);
  const queryUsed = queryParts.length ? queryParts.join(' ') : `Dz.U. ${year} poz. ${entry}`;

  const limit = Math.min(Math.max(1, input.limit ?? 10), MAX_PROVISION_FETCHES);

  // Use SAOS's own relevance ordering for the text search (no sortingField):
  // sorting by citation count surfaced old, famous-but-irrelevant judgments
  // (e.g. pre-2018 cases for a 2018 act). Relevance keeps results on-topic.
  const searchResp = await search({
    all: queryUsed,
    pageSize: MAX_PROVISION_FETCHES,
    pageNumber: 0,
  });
  const summaries = mapSearchResponse(searchResp).items.slice(0, MAX_PROVISION_FETCHES);

  const items: FindResultItem[] = [];
  for (const s of summaries) {
    let confirmed = false;
    try {
      const full = mapJudgment(await fetchById(s.id));
      confirmed = full.referenced_regulations.some(
        (r) => r.journal_year === year && r.journal_entry === entry,
      );
    } catch {
      confirmed = false; // a single fetch failure shouldn't drop the whole result
    }
    items.push({ ...s, confirmed_reference: confirmed });
    if (FETCH_THROTTLE_MS > 0) await sleep(FETCH_THROTTLE_MS);
  }

  const confirmed = items.filter((i) => i.confirmed_reference);
  // If any judgment actually cites the provision, return ONLY those — padding
  // with unconfirmed text matches just adds noise. If none are confirmed, fall
  // back to the text matches but say so, so the caller knows they're unverified.
  if (confirmed.length > 0) {
    return {
      query_used: queryUsed,
      target_eli_id: targetEliId,
      confirmed_count: confirmed.length,
      items: confirmed.slice(0, limit),
    };
  }
  return {
    query_used: queryUsed,
    target_eli_id: targetEliId,
    confirmed_count: 0,
    note:
      'No judgment in the search results was verified to cite this provision. ' +
      'The items below are text matches only (confirmed_reference=false). ' +
      'Try adding an article and/or a title_hint to sharpen the search.',
    items: items.slice(0, limit),
  };
}
