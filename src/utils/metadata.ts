/**
 * Response metadata utilities, mirroring polish-law-mcp's ToolResponse shape so
 * a client can compose both servers uniformly.
 */

export interface ResponseMetadata {
  data_source: string;
  jurisdiction: string;
  disclaimer: string;
  freshness?: string;
  note?: string;
  query_strategy?: string;
}

export interface ToolResponse<T> {
  results: T;
  _metadata: ResponseMetadata;
}

export function caselawMetadata(extra?: Partial<ResponseMetadata>): ResponseMetadata {
  return {
    data_source: 'SAOS — System Analizy Orzeczeń Sądowych (saos.org.pl)',
    jurisdiction: 'PL',
    disclaimer:
      'This is a research tool, not legal advice. Court decisions are aggregated ' +
      'by SAOS; verify against official court portals.',
    freshness: 'live',
    ...extra,
  };
}

export function wrap<T>(results: T, extra?: Partial<ResponseMetadata>): ToolResponse<T> {
  return { results, _metadata: caselawMetadata(extra) };
}
