import { SAOS_BASE_URL } from '../constants.js';
import type {
  SaosSearchItem,
  SaosSearchResponse,
  SaosJudgmentResponse,
  SaosReferencedRegulation,
} from './types.js';

export interface CaseLawSummary {
  id: number;
  court_type: string | null;
  court_name: string | null;
  case_number: string | null;
  judgment_date: string | null;
  judgment_type: string | null;
  keywords: string[];
  snippet: string;
  saos_url: string;
}

export interface ReferencedRegulationOut {
  eli_id: string | null;
  journal_year: number | null;
  journal_entry: number | null;
  title: string | null;
  text: string | null;
}

export interface JudgmentDetail {
  id: number;
  court_type: string | null;
  court_name: string | null;
  case_numbers: string[];
  judgment_date: string | null;
  judges: string[];
  judgment_type: string | null;
  decision: string | null;
  summary: string | null;
  full_text: string;
  legal_bases: string[];
  referenced_regulations: ReferencedRegulationOut[];
  referenced_court_cases: string[];
  keywords: string[];
  saos_url: string;
}

export function cleanSnippet(text: string): string {
  if (!text) return '';
  // SAOS wraps each matched term in its own <em>…</em>, often many in a row.
  // A naive <em>->>>>/</em>-><<< replace produces unreadable runs like
  // ">>>dane>>osobowe<<<" and mis-pairs adjacent tags. First collapse runs of
  // adjacent highlights (separated only by whitespace) into one region, then
  // convert the surviving <em> pair to markers and strip every other tag.
  const s = text
    // Merge adjacent highlights ("</em><ws><em>") into one region with a single
    // space, so distinct matched words don't run together.
    .replace(/<\/em>\s*<em>/gi, ' ')
    // Strip every non-<em> tag FIRST, while real angle brackets are still tags —
    // doing this after inserting >>>/<<< markers would let the tag-stripper eat
    // the markers (e.g. "<<< text >>>" matches /<[^>]+>/).
    .replace(/<(?!\/?em>)[^>]+>/gi, '')
    .replace(/<em>/gi, '>>>')
    .replace(/<\/em>/gi, '<<<');
  return s.trim();
}

export function regulationToEliId(r: SaosReferencedRegulation): string | null {
  if (r.journalYear == null || r.journalEntry == null) return null;
  return `pl-du-${r.journalYear}-${r.journalEntry}`;
}

export function saosUrl(id: number | string): string {
  // Public site URL (not the /api path).
  const base = SAOS_BASE_URL.replace(/\/api$/, '');
  return `${base}/judgments/${id}`;
}

export function mapSearchItem(item: SaosSearchItem): CaseLawSummary {
  return {
    id: item.id,
    court_type: item.courtType ?? null,
    court_name: item.division?.court?.name ?? null,
    case_number: item.courtCases?.[0]?.caseNumber ?? null,
    judgment_date: item.judgmentDate ?? null,
    judgment_type: item.judgmentType ?? null,
    keywords: item.keywords ?? [],
    snippet: cleanSnippet(item.textContent ?? ''),
    saos_url: saosUrl(item.id),
  };
}

export function mapSearchResponse(resp: SaosSearchResponse): {
  total_results: number;
  items: CaseLawSummary[];
} {
  return {
    total_results: resp.info?.totalResults ?? 0,
    items: (resp.items ?? []).map(mapSearchItem),
  };
}

export function mapJudgment(resp: SaosJudgmentResponse): JudgmentDetail {
  const d = resp.data;
  return {
    id: d.id,
    court_type: d.courtType ?? null,
    court_name: d.division?.court?.name ?? null,
    case_numbers: (d.courtCases ?? []).map((c) => c.caseNumber),
    judgment_date: d.judgmentDate ?? null,
    judges: (d.judges ?? []).map((j) => j.name),
    judgment_type: d.judgmentType ?? null,
    decision: d.decision ?? null,
    summary: d.summary ?? null,
    full_text: cleanSnippet(d.textContent ?? ''),
    legal_bases: d.legalBases ?? [],
    referenced_regulations: (d.referencedRegulations ?? []).map((r) => ({
      eli_id: regulationToEliId(r),
      journal_year: r.journalYear ?? null,
      journal_entry: r.journalEntry ?? null,
      title: r.journalTitle ?? null,
      text: r.text ?? null,
    })),
    referenced_court_cases: (d.referencedCourtCases ?? [])
      .map((c) => c.caseNumber)
      .filter((x): x is string => !!x),
    keywords: d.keywords ?? [],
    saos_url: saosUrl(d.id),
  };
}
