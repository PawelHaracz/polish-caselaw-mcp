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
      'legal bases, and referenced_regulations mapped to ELI ids (pl-du-YYYY-NNN). Live from SAOS; not legal advice.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: ['string', 'number'], description: 'SAOS judgment id.' },
      },
      required: ['id'],
    },
  },
];

function errorMessage(err: unknown): string {
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
