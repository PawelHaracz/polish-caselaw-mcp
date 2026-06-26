/**
 * Shared core: find judgments that cite a given statutory provision.
 *
 * SAOS has no server-side "cited regulation" filter, so we text-search (SAOS
 * relevance order), fetch the top-N full documents, and confirm via
 * referencedRegulations. Optionally pin a courtType (e.g. the Constitutional
 * Tribunal). Used by find_judgments_for_provision and check_constitutional_status.
 */
import { searchJudgments, getJudgmentById } from './client.js';
import { mapSearchResponse, mapJudgment, type CaseLawSummary } from './map.js';
import { MAX_PROVISION_FETCHES, FETCH_THROTTLE_MS } from '../constants.js';

export interface ProvisionSearchInput {
  document_id?: string;
  journal_year?: number;
  journal_entry?: number;
  article?: string;
  title_hint?: string;
  limit?: number;
}

export interface ProvisionMatch extends CaseLawSummary {
  confirmed_reference: boolean;
}

export interface ProvisionSearchResult {
  target_eli_id: string;
  query_used: string;
  confirmed_count: number;
  note?: string;
  items: ProvisionMatch[];
}

function resolveEliId(input: ProvisionSearchInput): string {
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

export async function findJudgmentsCitingProvision(
  input: ProvisionSearchInput,
  deps: { search?: typeof searchJudgments; fetchById?: typeof getJudgmentById } = {},
  opts: { courtType?: string } = {},
): Promise<ProvisionSearchResult> {
  const search = deps.search ?? searchJudgments;
  const fetchById = deps.fetchById ?? getJudgmentById;

  const targetEliId = resolveEliId(input);
  const { year, entry } = parseEli(targetEliId);

  const queryParts = [input.title_hint?.trim(), input.article?.trim()].filter(Boolean);
  const queryUsed = queryParts.length ? queryParts.join(' ') : `Dz.U. ${year} poz. ${entry}`;

  const limit = Math.min(Math.max(1, input.limit ?? 10), MAX_PROVISION_FETCHES);

  // SAOS relevance ordering (no sortingField). courtType only when provided.
  const searchParams: Record<string, string | number | undefined> = {
    all: queryUsed,
    pageSize: MAX_PROVISION_FETCHES,
    pageNumber: 0,
  };
  if (opts.courtType !== undefined) {
    searchParams.courtType = opts.courtType;
  }

  const searchResp = await search(searchParams);
  const summaries = mapSearchResponse(searchResp).items.slice(0, MAX_PROVISION_FETCHES);

  const items: ProvisionMatch[] = [];
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
  if (confirmed.length > 0) {
    return {
      target_eli_id: targetEliId,
      query_used: queryUsed,
      // Count of ALL confirmed matches found (may exceed items shown when limit < confirmed.length).
      confirmed_count: confirmed.length,
      items: confirmed.slice(0, limit),
    };
  }
  return {
    target_eli_id: targetEliId,
    query_used: queryUsed,
    confirmed_count: 0,
    note:
      'No judgment in the search results was verified to cite this provision. ' +
      'The items below are text matches only (confirmed_reference=false). ' +
      'Try adding an article and/or a title_hint to sharpen the search.',
    items: items.slice(0, limit),
  };
}
