export const SERVER_NAME = 'polish-caselaw-mcp';
export const SERVER_VERSION = '1.0.0';
export const SERVER_LABEL = 'Polish Case Law MCP';

export const SAOS_BASE_URL = 'https://www.saos.org.pl/api';

// SAOS /search/judgments regularly takes 20s+ under load; 8s aborted valid requests.
export const HTTP_TIMEOUT_MS = Number(process.env.SAOS_TIMEOUT_MS ?? 45000);
export const RETRY_BACKOFF_MS = Number(process.env.SAOS_RETRY_BACKOFF_MS ?? 500);
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;
export const MAX_PROVISION_FETCHES = 10;
export const FETCH_THROTTLE_MS = 150;
