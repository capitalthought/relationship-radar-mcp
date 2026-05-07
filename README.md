# @capitalthought/relationship-radar-mcp

MCP server for [Relationship Radar](https://relradar.ai) — query a person across ~70 data sources (Gmail, Calendar, HubSpot, Asana, Airtable, Crunchbase, court records, …) into a relationship-intelligence brief, suggest identity disambiguations, run a deep PI investigation, or check source health.

Wraps the public-but-auth-walled API documented at [relradar.ai/AGENTS.md](https://relradar.ai/AGENTS.md).

## Install

Via Claude Code:

```bash
claude mcp add relationship-radar npx -y @capitalthought/relationship-radar-mcp \
  --env RADAR_TOKEN=<your-token>
```

Or any MCP-compatible host (Claude Desktop, Cursor, etc.):

```jsonc
{
  "mcpServers": {
    "relationship-radar": {
      "command": "npx",
      "args": ["-y", "@capitalthought/relationship-radar-mcp"],
      "env": {
        "RADAR_TOKEN": "<your-token>"
      }
    }
  }
}
```

## Configuration

| Env var | Required | Default | Notes |
|---|---|---|---|
| `RADAR_TOKEN` | yes | — | Bearer token. Treated as `role: "owner"` (full source access). Rotate via the relationship-radar repo's `scripts/rotate-dashboard-token`. |
| `RADAR_BASE_URL` | no | `https://relradar.ai` | Override for staging or self-hosted. |

## Tools

| Tool | Wraps | Use when |
|---|---|---|
| `query_person` | `POST /query` | Full dossier on a known person. Default for "tell me about X" before a meeting. |
| `suggest_identities` | `POST /suggest` | Cheap pre-flight when the name is ambiguous (`Sarah`, `John Smith`). Returns ranked candidates with confidence scores. |
| `investigate_person` | `POST /api/investigate` | Deep iterative PI agent — picks sources adaptively based on findings, returns a verified identity profile with an evidence chain. Slower + more expensive than `query_person`. Reserve for high-stakes verification. |
| `get_health` | `GET /health/detail` | Cron + `module_health` snapshot. Use to verify radar is healthy before relying on output for high-stakes work. |
| `get_source_health` | `GET /admin/source-health` | Per-source last-status. Interpret a partial dossier — sources missing from output show up here as `error` or `skipped`. NOTE: `no_data` is healthy (source ran cleanly, just no matches). |

## Example

```
> Tell me what we know about Patrick Vogt at Capital Factory.

[agent calls query_person({name: "Patrick Vogt", company: "Capital Factory"})]
[returns dossier with relationship snapshot, recent contacts, action items]
```

## Development

```bash
npm install
npm run build
npm test
```

To test the MCP server end-to-end against your local stdio transport:

```bash
RADAR_TOKEN=<token> node dist/index.js
# Then connect a host (Claude Desktop, mcp-inspector, etc.) to the stdio.
```

## License

MIT — see [LICENSE](./LICENSE).

## Author

Joshua Baer ([@joshuabaer](https://github.com/joshuabaer)) · Capital Factory.
