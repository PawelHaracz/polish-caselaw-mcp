/**
 * find_judgments_for_provision — judgments that cite a given statutory
 * provision (any court). Thin adapter over the shared provision-search core.
 */
import {
  findJudgmentsCitingProvision,
  type ProvisionSearchInput,
  type ProvisionSearchResult,
} from '../saos/provision-search.js';
import { searchJudgments, getJudgmentById } from '../saos/client.js';
import { wrap, type ToolResponse } from '../utils/metadata.js';

export type FindInput = ProvisionSearchInput;

export async function findJudgmentsForProvision(
  input: FindInput,
  deps: { search?: typeof searchJudgments; fetchById?: typeof getJudgmentById } = {},
): Promise<ToolResponse<ProvisionSearchResult>> {
  const result = await findJudgmentsCitingProvision(input, deps);
  return wrap(result, result.note ? { note: result.note } : undefined);
}
