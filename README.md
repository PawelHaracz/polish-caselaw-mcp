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

## Install

The server speaks MCP over stdio. Pick whichever setup matches your client.

### Docker MCP Gateway

`mcp-gateway-server.yaml` already points at the published image, so no build is
needed:

```bash
docker mcp profile server add default --server file://"$PWD/mcp-gateway-server.yaml"
```

To run your own build instead, set `image:` in that file to a local tag and
build it first:

```bash
docker build -t polish-caselaw-mcp:local .
```

The gateway's `--block-network` flag cuts SAOS off; tools then return a clear
network error rather than hanging.

### Standalone — Docker

Any MCP client that launches a stdio command can run the image directly.
`--rm -i` matters: the server talks over stdin/stdout and should not outlive
the client.

```json
{
  "mcpServers": {
    "polish-caselaw": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "ghcr.io/pawelharacz/polish-caselaw-mcp:latest"]
    }
  }
}
```

Pass configuration through with `-e`:

```json
"args": ["run", "--rm", "-i", "-e", "SAOS_TIMEOUT_MS=60000",
         "ghcr.io/pawelharacz/polish-caselaw-mcp:latest"]
```

### Standalone — Node

Without Docker, point the client at the built entrypoint:

```json
{
  "mcpServers": {
    "polish-caselaw": {
      "command": "node",
      "args": ["/absolute/path/to/polish-caselaw-mcp/dist/index.js"],
      "env": { "SAOS_TIMEOUT_MS": "60000" }
    }
  }
}
```

Run `npm install && npm run build` first — `dist/` is not committed.

### Claude Code

```bash
claude mcp add polish-caselaw -- docker run --rm -i ghcr.io/pawelharacz/polish-caselaw-mcp:latest
```

Verify with `/mcp`, then call `caselaw_about` — it returns provenance without
touching SAOS, so it confirms the server is wired up even if the API is slow.

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
