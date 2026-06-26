/**
 * check_constitutional_status — Constitutional Tribunal (TK) judgments that
 * cite a given statutory provision. CERTAIN DATA ONLY: this reports which TK
 * judgments concern the provision, NOT whether the provision was struck down
 * (SAOS has no such field; the operative part must be read). Thin adapter over
 * the shared provision-search core, pinned to the Constitutional Tribunal.
 */
import {
  findJudgmentsCitingProvision,
  type ProvisionSearchInput,
  type ProvisionMatch,
} from '../saos/provision-search.js';
import { searchJudgments, getJudgmentById } from '../saos/client.js';
import { wrap, type ToolResponse } from '../utils/metadata.js';

export type ConstitutionalInput = ProvisionSearchInput;

export interface ConstitutionalResult {
  target_eli_id: string;
  query_used: string;
  confirmed_count: number;
  note?: string;
  tribunal_judgments: ProvisionMatch[];
}

const TK_DISCLAIMER =
  'Presence of a Constitutional Tribunal judgment citing a provision does NOT ' +
  'mean the provision was struck down — read the operative part (sentencja). ' +
  'Not legal advice.';

export async function checkConstitutionalStatus(
  input: ConstitutionalInput,
  deps: { search?: typeof searchJudgments; fetchById?: typeof getJudgmentById } = {},
): Promise<ToolResponse<ConstitutionalResult>> {
  const core = await findJudgmentsCitingProvision(input, deps, {
    courtType: 'CONSTITUTIONAL_TRIBUNAL',
  });
  const result: ConstitutionalResult = {
    target_eli_id: core.target_eli_id,
    query_used: core.query_used,
    confirmed_count: core.confirmed_count,
    note: core.note,
    tribunal_judgments: core.items,
  };
  const metaNote = core.note ? `${TK_DISCLAIMER} ${core.note}` : TK_DISCLAIMER;
  return wrap(result, { note: metaNote });
}
