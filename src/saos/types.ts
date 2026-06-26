/** Subset of SAOS API response shapes that we consume. */

export interface SaosCourtCase {
  caseNumber: string;
}

export interface SaosJudge {
  name: string;
  function?: string;
  specialRoles?: string[];
}

export interface SaosCourt {
  id?: number;
  code?: string;
  name?: string;
}

export interface SaosDivision {
  court?: SaosCourt;
  name?: string;
}

export interface SaosSearchItem {
  id: number;
  href?: string;
  courtType?: string;
  courtCases?: SaosCourtCase[];
  judgmentType?: string;
  judges?: SaosJudge[];
  textContent?: string;
  keywords?: string[];
  division?: SaosDivision;
  judgmentDate?: string;
}

export interface SaosSearchResponse {
  items?: SaosSearchItem[];
  info?: { totalResults?: number };
}

export interface SaosReferencedRegulation {
  journalTitle?: string;
  journalNo?: number;
  journalYear?: number;
  journalEntry?: number;
  text?: string;
}

export interface SaosJudgment {
  id: number;
  courtType?: string;
  courtCases?: SaosCourtCase[];
  judgmentType?: string;
  judgmentDate?: string;
  judges?: SaosJudge[];
  decision?: string;
  summary?: string;
  textContent?: string;
  legalBases?: string[];
  referencedRegulations?: SaosReferencedRegulation[];
  referencedCourtCases?: { caseNumber?: string }[];
  keywords?: string[];
  division?: SaosDivision;
}

export interface SaosJudgmentResponse {
  data: SaosJudgment;
}
