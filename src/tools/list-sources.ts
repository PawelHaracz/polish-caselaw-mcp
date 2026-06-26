/** list_sources — provenance metadata for the case-law source. */
export interface SourceInfo {
  name: string;
  authority: string;
  url: string;
  license: string;
  legal_basis: string;
  coverage: string;
  languages: string[];
}
export interface SourcesResult {
  sources: SourceInfo[];
  mode: string;
  disclaimer: string;
}

export function listSources(): SourcesResult {
  return {
    sources: [
      {
        name: 'SAOS — System Analizy Orzeczeń Sądowych',
        authority: 'saos.org.pl (open judgment aggregator); judgments originate from Polish courts',
        url: 'https://www.saos.org.pl',
        license: 'Court judgments as official materials (materiały urzędowe), Art. 4 pkt 2 prawa autorskiego',
        legal_basis:
          'Case law is not covered by the statutory-PD carve-out for normative acts (Art. 4 pkt 1). ' +
          'Publication basis: K.p.c. Art. 9 (civil), K.p.k. Art. 100 (criminal); judgments treated as official materials.',
        coverage: 'Polish court judgments: Supreme Court, common courts, administrative courts, Constitutional Tribunal, National Appeal Chamber.',
        languages: ['pl'],
      },
    ],
    mode: 'live (SAOS REST API, fetched at request time)',
    disclaimer: 'Research tool, not legal advice. Authoritative judgment texts are maintained by the issuing courts.',
  };
}
