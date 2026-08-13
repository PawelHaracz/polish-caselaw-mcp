import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Wersja z package.json, nie z literału — literał rozjeżdża się przy bumpie,
// a caselaw_about raportuje ją użytkownikowi jako wersję serwera.
// Jedna ścieżka wystarcza: tsconfig ma outDir "dist" i include ["src"], więc
// dist/ jest płaski — constants.js leży tam tak samo głęboko jak constants.ts
// w src/, czyli o jeden poziom od package.json w obu wariantach uruchomienia.
const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
);

export const SERVER_NAME: string = pkg.name.replace(/^@[^/]+\//, '');
export const SERVER_VERSION: string = pkg.version;
export const SERVER_LABEL = 'Polish Case Law MCP';

export const SAOS_BASE_URL = 'https://www.saos.org.pl/api';

// SAOS /search/judgments regularly takes 20s+ under load; 8s aborted valid requests.
export const HTTP_TIMEOUT_MS = Number(process.env.SAOS_TIMEOUT_MS ?? 45000);
export const RETRY_BACKOFF_MS = Number(process.env.SAOS_RETRY_BACKOFF_MS ?? 500);
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;
export const MAX_PROVISION_FETCHES = 10;
export const FETCH_THROTTLE_MS = 150;
