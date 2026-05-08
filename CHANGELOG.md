# Changelog

All notable changes to `@capitalthought/relationship-radar-mcp` will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-07

### Added

Initial release. MCP server wrapping the [Relationship Radar](https://relradar.ai) HTTP API as 5 verb-first tools:

- `query_person` — full dossier across ~70 data sources (Gmail, Calendar, HubSpot, Asana, Airtable, Crunchbase, court records, social, etc.). Wraps `POST /query`.
- `suggest_identities` — cheap identity-disambiguation pre-flight before `query_person`. Returns ranked candidates with confidence scores. Wraps `POST /suggest`.
- `investigate_person` — deep iterative PI agent (verified identity profile with evidence chain). Wraps `POST /api/investigate`.
- `get_health` — worker + cron health snapshot. Wraps `GET /health/detail`.
- `get_source_health` — per-source last-status snapshot. Wraps `GET /admin/source-health`.

### Configuration

- `RADAR_TOKEN` (required) — Bearer token for relradar.ai. Treated as `role: "owner"` (full source access).
- `RADAR_BASE_URL` (optional, default `https://relradar.ai`) — override for staging or self-hosted.

### Tests

8 unit tests covering Bearer auth, baseUrl override (with trailing-slash normalization), HTTP error → `RadarApiError` conversion, network-failure handling, GET vs POST shape, and request-body forwarding (including optional fields like `email` and `refresh_sources`).

### Discovery

- npm: `@capitalthought/relationship-radar-mcp`
- Worker-side discovery card: <https://relradar.ai/.well-known/mcp/server.json>
- Agent contract: <https://relradar.ai/AGENTS.md>

[0.1.0]: https://github.com/capitalthought/relationship-radar-mcp/releases/tag/v0.1.0
