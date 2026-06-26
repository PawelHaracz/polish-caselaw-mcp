/**
 * Tool registry for Polish Case Law MCP Server.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

export const TOOLS: Tool[] = [];

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;
    return {
      content: [{ type: 'text' as const, text: `Error: Unknown tool "${name}".` }],
      isError: true,
    };
  });
}
