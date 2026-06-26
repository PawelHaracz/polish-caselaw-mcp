/** list_courts — static reference of SAOS court types. */
import { wrap, type ToolResponse } from '../utils/metadata.js';
export interface CourtInfo { code: string; label: string; description: string; }
export interface CourtsResult { courts: CourtInfo[]; }

export function listCourts(): ToolResponse<CourtsResult> {
  return wrap({
    courts: [
      { code: 'COMMON', label: 'Sądy powszechne', description: 'Common courts (rejonowe, okręgowe, apelacyjne).' },
      { code: 'SUPREME', label: 'Sąd Najwyższy', description: 'Supreme Court.' },
      { code: 'ADMINISTRATIVE', label: 'Sądy administracyjne', description: 'Administrative courts (NSA, WSA).' },
      { code: 'CONSTITUTIONAL_TRIBUNAL', label: 'Trybunał Konstytucyjny', description: 'Constitutional Tribunal.' },
      { code: 'NATIONAL_APPEAL_CHAMBER', label: 'Krajowa Izba Odwoławcza', description: 'National Appeal Chamber (public procurement).' },
    ],
  });
}
