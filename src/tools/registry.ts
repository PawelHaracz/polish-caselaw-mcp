/**
 * Tool registry for Polish Case Law MCP Server.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { searchCaseLaw, type SearchCaseLawInput } from './search-case-law.js';
import { getJudgment, type GetJudgmentInput } from './get-judgment.js';
import { findJudgmentsForProvision, type FindInput } from './find-judgments-for-provision.js';
import { listCourts } from './list-courts.js';
import { getAbout } from './about.js';
import { listSources } from './list-sources.js';
import { checkConstitutionalStatus, type ConstitutionalInput } from './check-constitutional-status.js';
import { SaosError } from '../saos/client.js';

const COURT_TYPES = ['COMMON', 'SUPREME', 'ADMINISTRATIVE', 'CONSTITUTIONAL_TRIBUNAL', 'NATIONAL_APPEAL_CHAMBER'];

export const TOOLS: Tool[] = [
  {
    name: 'search_case_law',
    description:
      'Search Polish court judgments (orzecznictwo) live from the SAOS API (saos.org.pl). ' +
      'Returns matching judgments with snippets (>>> <<< around matches), court, case number, and date. ' +
      'Use get_judgment to fetch the full text of a result. Data is sourced live from SAOS, ' +
      'separate from statutory law. Not legal advice; verify against official court portals.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Full-text query (Polish).' },
        court_type: { type: 'string', enum: COURT_TYPES, description: 'Optional court type filter.' },
        date_from: { type: 'string', description: 'Optional start date YYYY-MM-DD.' },
        date_to: { type: 'string', description: 'Optional end date YYYY-MM-DD.' },
        sort: { type: 'string', enum: ['date', 'relevance', 'most_cited'], description: 'Sort order (default relevance).' },
        limit: { type: 'number', description: 'Max results, 1-100 (default 10).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_judgment',
    description:
      'Fetch the full text and metadata of a single Polish court judgment by its SAOS id ' +
      '(use the id returned by search_case_law). Includes full text, judges, decision, summary, ' +
      'legal bases, and referenced_regulations mapped to ELI ids (pl-du-YYYY-NNN) plus articles_refs in the artNNNparN scheme. Live from SAOS; not legal advice.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: ['string', 'number'], description: 'SAOS judgment id.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'find_judgments_for_provision',
    description:
      'Find Polish judgments that cite a given statutory provision. Provide either document_id ' +
      '(pl-du-YYYY-NNN, e.g. pl-du-1997-553 for the Criminal Code) or journal_year + journal_entry, ' +
      'optionally an article (e.g. "art. 267") and title_hint to sharpen the text search. ' +
      'Each result has confirmed_reference=true when the full judgment actually cites the provision ' +
      '(verified via referenced regulations), false when it is only a text match. Live from SAOS; not legal advice.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'ELI id pl-du-YYYY-NNN.' },
        journal_year: { type: 'number', description: 'Dziennik Ustaw year.' },
        journal_entry: { type: 'number', description: 'Dziennik Ustaw entry (pozycja).' },
        article: { type: 'string', description: 'Optional article, e.g. "art. 267".' },
        title_hint: { type: 'string', description: 'Optional act title to sharpen search, e.g. "Kodeks karny".' },
        limit: { type: 'number', description: 'Max results, 1-10 (default 10).' },
      },
    },
  },
  {
    name: 'check_constitutional_status',
    description:
      'Find Polish Constitutional Tribunal (TK) judgments that cite a given statutory ' +
      'provision. Provide document_id (pl-du-YYYY-NNN) or journal_year + journal_entry, ' +
      'optionally an article and title_hint. Returns TK judgments with confirmed_reference ' +
      '(verified via referenced regulations). IMPORTANT: a citing TK judgment does NOT by ' +
      'itself mean the provision was struck down — read the operative part. Live from SAOS; not legal advice.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'ELI id pl-du-YYYY-NNN.' },
        journal_year: { type: 'number', description: 'Dziennik Ustaw year.' },
        journal_entry: { type: 'number', description: 'Dziennik Ustaw entry (pozycja).' },
        article: { type: 'string', description: 'Optional article, e.g. "art. 267".' },
        title_hint: { type: 'string', description: 'Optional act title to sharpen search.' },
        limit: { type: 'number', description: 'Max results, 1-10 (default 10).' },
      },
    },
  },
  {
    name: 'list_courts',
    description: 'List the Polish court types available for the court_type filter in search_case_law.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'caselaw_about',
    description: 'Case-law server metadata, provenance, and freshness (live SAOS). Call to understand coverage and basis before relying on results.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'caselaw_list_sources',
    description: 'Provenance and legal-basis metadata for the case-law source (SAOS). Call FIRST to understand what this case-law server covers.',
    inputSchema: { type: 'object', properties: {} },
  },
];

export function errorMessage(err: unknown): string {
  if (err instanceof SaosError) {
    switch (err.code) {
      case 'timeout': return 'SAOS timed out. Try again.';
      case 'network': return 'SAOS unavailable (network error). The gateway may have network access disabled.';
      case 'ratelimited': return 'SAOS is rate-limited. Try again shortly.';
      case 'notfound': return 'Not found.';
      default: return `SAOS error (HTTP ${err.status ?? '?'}).`;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      let result: unknown;
      switch (name) {
        case 'search_case_law':
          result = await searchCaseLaw(args as unknown as SearchCaseLawInput);
          break;
        case 'get_judgment':
          result = await getJudgment(args as unknown as GetJudgmentInput);
          break;
        case 'find_judgments_for_provision':
          result = await findJudgmentsForProvision(args as unknown as FindInput);
          break;
        case 'check_constitutional_status':
          result = await checkConstitutionalStatus(args as unknown as ConstitutionalInput);
          break;
        case 'list_courts':
          result = listCourts();
          break;
        case 'caselaw_about':
          result = getAbout();
          break;
        case 'caselaw_list_sources':
          result = listSources();
          break;
        default:
          return {
            content: [{ type: 'text' as const, text: `Error: Unknown tool "${name}".` }],
            isError: true,
          };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: ${errorMessage(err)}` }],
        isError: true,
      };
    }
  });
}
