# Polish Case Law MCP (`polish-caselaw-mcp`)

An MCP server exposing Polish court case law (orzecznictwo) **live** from the
[SAOS API](https://www.saos.org.pl/api). It has **no local database** — every
tool call queries SAOS at request time.

The response envelope and the `artNNNparN` article-reference scheme mirror
`polish-law-mcp` (Polish statutes from ISAP), so a client can compose both
servers and follow a judgment straight to the provision it cites. This is an
independent implementation that shares those conventions for interoperability;
it is not derived from that server's code.

## Tools

- `search_case_law` — search judgments (query, court type, dates, sort, limit)
- `get_judgment` — full judgment by SAOS id (text, judges, referenced regulations as ELI ids + article refs)
- `find_judgments_for_provision` — judgments citing a statute provision (pl-du-YYYY-NNN), verified against referenced regulations
- `check_constitutional_status` — Constitutional Tribunal (TK) judgments citing a provision (does NOT assert the provision was struck down — read the operative part)
- `list_courts` — court types for filtering
- `caselaw_about` / `caselaw_list_sources` — provenance and legal basis (prefixed to avoid name clashes with sibling MCP servers in a gateway)

All tools return `{ results, _metadata }` (ToolResponse). `get_judgment` exposes
`referenced_regulations[].articles_refs` for cross-server linking.

## Run

```bash
npm install
npm run build
npm start            # stdio MCP server
```

## Docker

Pull the published image:

```bash
docker pull pawelharacz/polish-caselaw-mcp:latest
```

Or build locally:

```bash
docker build -t polish-caselaw-mcp:local .
```

### Docker MCP Gateway

```bash
docker mcp profile server add default --server file://"$PWD/mcp-gateway-server.yaml"
```

Requires network access (SAOS). The gateway `--block-network` flag disables it;
tools then return a clear network-error message.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `SAOS_TIMEOUT_MS` | `45000` | HTTP timeout per SAOS request. `/search/judgments` regularly takes 20–35s under load, so short timeouts abort requests that would have succeeded. |
| `SAOS_RETRY_BACKOFF_MS` | `500` | Delay before the single retry, so a slow upstream is not hit again immediately. |

## Legal

Court decisions are not statutes. See `sources.yml` for the legal basis.
Research tool, **not legal advice** — verify against official court portals.

## License

Apache-2.0
