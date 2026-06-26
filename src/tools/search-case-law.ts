/**
 * search_case_law — search Polish court judgments via the SAOS API.
 */
import { searchJudgments } from '../saos/client.js';
import { mapSearchResponse, type CaseLawSummary } from '../saos/map.js';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';

export interface SearchCaseLawInput {
  query: string;
  court_type?: string;
  date_from?: string;
  date_to?: string;
  sort?: 'date' | 'relevance' | 'most_cited';
  limit?: number;
}

export interface SearchCaseLawResult {
  total_results: number;
  items: CaseLawSummary[];
}

const SORT_MAP: Record<string, string> = {
  date: 'JUDGMENT_DATE',
  relevance: 'DATABASE_ID',
  most_cited: 'REFERENCING_JUDGMENTS_COUNT',
};

export async function searchCaseLaw(
  input: SearchCaseLawInput,
  deps: { search?: typeof searchJudgments } = {},
): Promise<SearchCaseLawResult> {
  const search = deps.search ?? searchJudgments;
  if (!input.query || input.query.trim().length === 0) {
    throw new Error('query is required');
  }
  const limit = Math.min(Math.max(1, input.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
  const sortingField = SORT_MAP[input.sort ?? 'relevance'] ?? 'DATABASE_ID';

  const resp = await search({
    all: input.query.trim(),
    pageSize: limit,
    pageNumber: 0,
    sortingField,
    sortingDirection: 'DESC',
    courtType: input.court_type,
    judgmentDateFrom: input.date_from,
    judgmentDateTo: input.date_to,
  });

  return mapSearchResponse(resp);
}
