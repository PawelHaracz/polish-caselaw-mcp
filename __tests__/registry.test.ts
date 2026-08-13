import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { SaosError } from '../src/saos/client.js';
import { errorMessage, registerTools } from '../src/tools/registry.js';

// ---------------------------------------------------------------------------
// Unit tests for errorMessage() – no network, no transport
// ---------------------------------------------------------------------------

describe('errorMessage', () => {
  it('maps timeout to the correct message', () => {
    const err = new SaosError('timeout', 'timed out');
    expect(errorMessage(err)).toBe('[timeout] SAOS timed out. Try again.');
  });

  it('maps network to the correct message', () => {
    const err = new SaosError('network', 'network down');
    expect(errorMessage(err)).toBe(
      '[network] SAOS unavailable (network error). The gateway may have network access disabled.',
    );
  });

  it('maps ratelimited to the correct message', () => {
    const err = new SaosError('ratelimited', 'too many requests', 429);
    expect(errorMessage(err)).toBe('[ratelimited] SAOS is rate-limited. Try again shortly.');
  });

  it('maps notfound to the correct message', () => {
    const err = new SaosError('notfound', 'not found', 404);
    expect(errorMessage(err)).toBe('[notfound] Not found.');
  });

  it('maps http (default) with status 500 to the correct message', () => {
    const err = new SaosError('http', 'server error', 500);
    expect(errorMessage(err)).toBe('[http] SAOS error (HTTP 500).');
  });

  it('maps http with undefined status to ? placeholder', () => {
    const err = new SaosError('http', 'server error');
    expect(errorMessage(err)).toBe('[http] SAOS error (HTTP ?).');
  });

  it('passes through a plain Error message', () => {
    const err = new Error('something went wrong');
    expect(errorMessage(err)).toBe('[unknown] something went wrong');
  });

  it('stringifies non-Error values', () => {
    expect(errorMessage('raw string')).toBe('[unknown] raw string');
    expect(errorMessage(42)).toBe('[unknown] 42');
  });
});

// ---------------------------------------------------------------------------
// Integration: unknown-tool path via InMemoryTransport + Client
// ---------------------------------------------------------------------------

async function buildConnectedPair(): Promise<{ client: Client; server: Server }> {
  const server = new Server(
    { name: 'test-server', version: '0.0.1' },
    { capabilities: { tools: {} } },
  );
  registerTools(server);

  const client = new Client({ name: 'test-client', version: '0.0.1' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return { client, server };
}

describe('registry unknown-tool fallback (integration)', () => {
  it('returns isError:true and text containing "Unknown tool" for an unrecognised tool name', async () => {
    const { client } = await buildConnectedPair();

    const result = await client.callTool({ name: 'does_not_exist', arguments: {} });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    const item = result.content[0] as { type: string; text: string };
    expect(item.type).toBe('text');
    expect(item.text).toContain('Unknown tool');
    expect(item.text).toContain('does_not_exist');
  });
});

// ---------------------------------------------------------------------------
// Kod błędu dla agenta — komunikaty są dla człowieka, prefiks dla maszyny
// ---------------------------------------------------------------------------

describe('errorMessage — maszynowy kod błędu', () => {
  it('poprzedza komunikat kodem, po którym agent rozpozna błąd przejściowy', () => {
    expect(errorMessage(new SaosError('timeout', 'timed out'))).toMatch(/^\[timeout\]/);
    expect(errorMessage(new SaosError('ratelimited', 'too many', 429))).toMatch(/^\[ratelimited\]/);
    expect(errorMessage(new SaosError('network', 'down'))).toMatch(/^\[network\]/);
  });

  it('poprzedza komunikat kodem przy błędzie trwałym, żeby agent nie ponawiał', () => {
    expect(errorMessage(new SaosError('notfound', 'not found', 404))).toMatch(/^\[notfound\]/);
    expect(errorMessage(new SaosError('http', 'server error', 500))).toMatch(/^\[http\]/);
  });

  it('zachowuje czytelny komunikat po kodzie', () => {
    expect(errorMessage(new SaosError('timeout', 'timed out')))
      .toBe('[timeout] SAOS timed out. Try again.');
  });

  it('błędy spoza SAOS dostają kod unknown', () => {
    expect(errorMessage(new Error('coś innego'))).toBe('[unknown] coś innego');
  });
});
