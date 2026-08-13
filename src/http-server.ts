#!/usr/bin/env node

/**
 * HTTP entry point dla Polish Case Law MCP.
 *
 * Drugi transport obok stdio (src/index.ts) — potrzebny, żeby agent mógł się
 * podłączyć po sieci bez sidecara owijającego stdio, i żeby Container Apps
 * miało czym sprawdzać żywotność kontenera.
 *
 * Wzorowane na polish-law-mcp/src/http-server.ts, ale prostsze: ten serwer nie
 * ma bazy, więc odpadają resolveDbPath, ensureReadableDb i detectCapabilities.
 *
 * Trasy:
 *   GET  /health  → { status, server, version, uptime_seconds }
 *   POST /mcp     → MCP Streamable HTTP (nowa lub istniejąca sesja)
 *   GET  /mcp     → SSE (istniejąca sesja) albo metadane (bez sesji)
 *   DELETE /mcp   → zamknięcie sesji
 *   OPTIONS *     → preflight CORS
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import { registerTools } from './tools/registry.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const STARTED_AT = Date.now();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Odrzuca nagłówki sesji, które nie są UUID — nie ufamy wejściu z sieci. */
function validSessionId(raw: string | undefined): string | undefined {
  if (!raw || !UUID_RE.test(raw)) return undefined;
  return raw;
}

const sessions = new Map<string, StreamableHTTPServerTransport>();

async function main(): Promise<void> {
  /** Świeża instancja serwera MCP na każdą sesję. */
  function createMCPServer(): Server {
    const server = new Server(
      { name: SERVER_NAME, version: SERVER_VERSION },
      { capabilities: { tools: {} } },
    );
    registerTools(server);
    return server;
  }

  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');

    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          server: SERVER_NAME,
          version: SERVER_VERSION,
          uptime_seconds: Math.floor((Date.now() - STARTED_AT) / 1000),
        }));
        return;
      }

      if (url.pathname === '/mcp') {
        const sessionId = validSessionId(req.headers['mcp-session-id'] as string | undefined);

        // Istniejąca sesja — oddaj transportowi
        if (sessionId && sessions.has(sessionId)) {
          await sessions.get(sessionId)!.handleRequest(req, res);
          return;
        }

        if (req.method === 'DELETE') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not found' }));
          return;
        }

        // POST bez sesji — inicjalizacja.
        // sessionId generujemy z góry i zapisujemy przed handleRequest, żeby
        // klient wysyłający kolejne żądanie natychmiast trafił na istniejącą
        // sesję zamiast zakładać drugą.
        if (req.method === 'POST') {
          const newSessionId = randomUUID();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => newSessionId,
          });

          sessions.set(newSessionId, transport);
          transport.onclose = () => {
            sessions.delete(newSessionId);
          };

          const server = createMCPServer();
          await server.connect(transport);
          await transport.handleRequest(req, res);
          return;
        }

        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            name: SERVER_NAME,
            version: SERVER_VERSION,
            protocol: 'mcp',
            transport: 'streamable-http',
          }));
          return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request — missing or invalid session' }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      console.error(`[${SERVER_NAME}] Unhandled error:`, error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  });

  httpServer.listen(PORT, () => {
    console.error(`${SERVER_NAME} v${SERVER_VERSION} HTTP server listening on port ${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.error(`[${SERVER_NAME}] Shutting down (${signal})...`);
    for (const [, t] of sessions) t.close().catch(() => {});
    sessions.clear();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
