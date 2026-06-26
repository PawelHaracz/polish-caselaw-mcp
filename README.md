# Polish Case Law MCP (`polish-caselaw-mcp`)

An MCP server exposing Polish court case law (orzecznictwo) **live** from the
[SAOS API](https://www.saos.org.pl/api). Sibling to `polish-law-mcp` (statutes
from ISAP); this server has **no local database** — it queries SAOS per request.

## Tools

- `search_case_law` — search judgments (query, court type, dates, sort, limit)
- `get_judgment` — full judgment by SAOS id (text, judges, referenced regulations as ELI ids)
- `find_judgments_for_provision` — judgments citing a statute provision (pl-du-YYYY-NNN), verified against referenced regulations
- `list_courts` — court types for filtering
- `about` / `list_sources` — provenance and legal basis

## Run

```bash
npm install
npm run build
npm start            # stdio MCP server
```

## Docker MCP Gateway

```bash
docker build -t polish-caselaw-mcp:local .
docker mcp profile server add default --server file://"$PWD/mcp-gateway-server.yaml"
```

Requires network access (SAOS). The gateway `--block-network` flag disables it;
tools then return a clear network-error message.

## Legal

Court decisions are not statutes. See `sources.yml` for the legal basis.
Research tool, **not legal advice** — verify against official court portals.

## License

Apache-2.0
