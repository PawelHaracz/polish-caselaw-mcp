/**
 * Regresja: SAOS podczas przerwy technicznej zwraca stronę HTML z kodem 200.
 *
 * Zaobserwowane na żywo 2026-08-15: `GET /api/search/judgments` odpowiadał
 * `<!DOCTYPE html><title>Przerwa techniczna</title>` ze statusem 200.
 * Ponieważ `res.ok` przechodzi, kod trafiał prosto do `res.json()` i wywalał
 * się na `SyntaxError: Unexpected token '<'`. To NIE jest SaosError, więc
 * omijało mapowanie w registry.errorMessage — agent zamiast informacji
 * "źródło niedostępne" dostawał surowy komunikat parsera JSON.
 */
import { describe, it, expect } from 'vitest';
import { searchJudgments, SaosError } from '../src/saos/client.js';
import { errorMessage } from '../src/tools/registry.js';

const STRONA_PRZERWY = `<!DOCTYPE html>
<html><head><title>Przerwa techniczna</title></head>
<body>Trwa przerwa techniczna. Zapraszamy później.</body></html>`;

function fakeFetch(body: string, contentType: string, status = 200) {
  return async () =>
    new Response(body, {
      status,
      headers: { 'content-type': contentType },
    }) as unknown as Response;
}

describe('SAOS podczas przerwy technicznej', () => {
  it('zwraca SaosError o kodzie maintenance zamiast SyntaxError', async () => {
    const err = await searchJudgments({ pageSize: 1 }, fakeFetch(STRONA_PRZERWY, 'text/html')).catch(
      (e) => e,
    );

    expect(err).toBeInstanceOf(SaosError);
    expect((err as SaosError).code).toBe('maintenance');
    // Sedno regresji: bez poprawki byłby to SyntaxError z parsera.
    expect(err).not.toBeInstanceOf(SyntaxError);
  });

  it('daje agentowi czytelny komunikat, nie tekst parsera JSON', async () => {
    const err = await searchJudgments({ pageSize: 1 }, fakeFetch(STRONA_PRZERWY, 'text/html')).catch(
      (e) => e,
    );

    const msg = errorMessage(err);
    expect(msg).toContain('[maintenance]');
    expect(msg).toMatch(/maintenance/i);
    // Agent nie ma ponawiać: przerwa trwa godzinami, nie sekundami.
    expect(msg).toMatch(/say so instead of retrying/i);
    expect(msg).not.toMatch(/Unexpected token/);
  });

  it('HTML bez słowa "przerwa" to zwykły błąd http, nie maintenance', async () => {
    // Strona błędu proxy albo captcha — też nie JSON, ale to inna awaria
    // i nie ma powodu twierdzić, że to planowana przerwa.
    const err = await searchJudgments(
      { pageSize: 1 },
      fakeFetch('<html><body>502 Bad Gateway</body></html>', 'text/html'),
    ).catch((e) => e);

    expect(err).toBeInstanceOf(SaosError);
    expect((err as SaosError).code).toBe('http');
  });

  it('poprawny content-type z zepsutym ciałem to błąd http, nie SyntaxError', async () => {
    const err = await searchJudgments(
      { pageSize: 1 },
      fakeFetch('{"items": [', 'application/json'),
    ).catch((e) => e);

    expect(err).toBeInstanceOf(SaosError);
    expect((err as SaosError).code).toBe('http');
    expect((err as SaosError).message).toMatch(/malformed JSON/i);
  });

  it('poprawny JSON nadal przechodzi bez zmian', async () => {
    const wynik = await searchJudgments(
      { pageSize: 1 },
      fakeFetch('{"items":[],"info":{"totalResults":0}}', 'application/json'),
    );

    expect(wynik).toEqual({ items: [], info: { totalResults: 0 } });
  });
});
