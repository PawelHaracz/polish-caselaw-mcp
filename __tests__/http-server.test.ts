/**
 * Testy transportu HTTP.
 *
 * Serwer startuje na losowym porcie w podprocesie, bo http-server.ts wywołuje
 * main() przy imporcie. Sprawdzamy kontrakt: /health dla probes Container Apps
 * i /mcp jako Streamable HTTP.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 39411;
const BASE = `http://127.0.0.1:${PORT}`;

let proc: ChildProcess;

async function waitForHealth(timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch { /* jeszcze nie wstał */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Serwer HTTP nie wstał w wyznaczonym czasie');
}

beforeAll(async () => {
  proc = spawn(
    'node',
    ['--import', 'tsx', join(__dirname, '..', 'src', 'http-server.ts')],
    { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' },
  );
  await waitForHealth();
}, 30000);

afterAll(() => {
  proc?.kill('SIGTERM');
});

describe('GET /health', () => {
  it('zwraca status ok z nazwą i wersją serwera', async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.server).toBe('polish-caselaw-mcp');
    expect(typeof body.version).toBe('string');
    expect(typeof body.uptime_seconds).toBe('number');
  });
});

describe('GET /mcp bez sesji', () => {
  it('zwraca metadane transportu', async () => {
    const res = await fetch(`${BASE}/mcp`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.name).toBe('polish-caselaw-mcp');
    expect(body.protocol).toBe('mcp');
    expect(body.transport).toBe('streamable-http');
  });
});

describe('POST /mcp — inicjalizacja sesji', () => {
  it('odpowiada na initialize i zwraca mcp-session-id', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '0.0.0' },
        },
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('mcp-session-id')).toBeTruthy();
  });
});

describe('nieznana trasa', () => {
  it('zwraca 404', async () => {
    const res = await fetch(`${BASE}/nie-ma-takiej`);
    expect(res.status).toBe(404);
  });
});
