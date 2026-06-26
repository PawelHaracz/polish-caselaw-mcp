/** about — server metadata and provenance. */
import { SERVER_LABEL, SERVER_VERSION } from '../constants.js';

export interface AboutResult {
  name: string;
  version: string;
  jurisdiction: string;
  description: string;
  data_sources: { name: string; url: string; authority: string }[];
  freshness: { mode: string; note: string };
  disclaimer: string;
}

export function getAbout(): AboutResult {
  return {
    name: SERVER_LABEL,
    version: SERVER_VERSION,
    jurisdiction: 'PL',
    description: 'Polish court case law (orzecznictwo) served live from the SAOS API.',
    data_sources: [
      { name: 'SAOS — System Analizy Orzeczeń Sądowych', url: 'https://www.saos.org.pl', authority: 'SAOS (saos.org.pl), judgment aggregator' },
    ],
    freshness: { mode: 'live', note: 'Results are fetched from SAOS at request time; there is no local snapshot.' },
    disclaimer: 'This is a research tool, not legal advice. Court decisions are aggregated by SAOS; verify against official court portals.',
  };
}
