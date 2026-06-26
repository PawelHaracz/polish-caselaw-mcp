/**
 * get_judgment — fetch the full text and metadata of a single judgment.
 */
import { getJudgmentById } from '../saos/client.js';
import { mapJudgment, type JudgmentDetail } from '../saos/map.js';
import { wrap, type ToolResponse } from '../utils/metadata.js';

export interface GetJudgmentInput {
  id: string | number;
}

export async function getJudgment(
  input: GetJudgmentInput,
  deps: { fetchById?: typeof getJudgmentById } = {},
): Promise<ToolResponse<JudgmentDetail>> {
  const fetchById = deps.fetchById ?? getJudgmentById;
  if (input.id === undefined || input.id === null || String(input.id).trim() === '') {
    throw new Error('id is required');
  }
  const resp = await fetchById(input.id);
  return wrap(mapJudgment(resp));
}
