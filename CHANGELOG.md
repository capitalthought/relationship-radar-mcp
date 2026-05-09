# Changelog

All notable changes to `@capitalthought/relationship-radar-mcp` will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-05-09

### Added

- Optional `org_id: string` (uuid) parameter on every existing tool — `query_person`, `suggest_identities`, `investigate_person`, `get_health`, `get_source_health`. When provided, the MCP client appends `?org_id=<uuid>` as a query param on the underlying HTTP call so the worker can scope the request to a specific tenant. When omitted, behavior is unchanged: the worker resolves the bearer's default org (Capital Factory for the legacy `DASHBOARD_TOKEN`).
- Aligns with Relationship Radar Phase A multi-tenant rollout. See the new "Multi-tenant authentication & tenancy" section of [https://relradar.ai/AGENTS.md](https://relradar.ai/AGENTS.md) for the full contract (org-scoped tokens, plan-tier source restrictions, daily spend caps).

### Tests

- 7 new tests covering the `org_id` query-param plumbing across all 5 tools — URL shape, body cleanliness (org_id never leaks into POST bodies), and URL-encoding. All 15 tests passing.

### Backwards compatibility

- 100% backwards-compatible. Existing 0.1.0 callers that omit `org_id` continue to work exactly as before — the underlying URL doesn't change when no org_id is passed.

### Deferred to 0.3.0

- Tools `radar_org_prep` and `radar_mint_api_key` deferred to 0.3.0 pending Phase A.4 (per-org API key mint endpoint) + Phase A.8 (`/admin/orgs/<id>` admin endpoints) backend work.

[0.2.0]: https://github.com/capitalthought/relationship-radar-mcp/releases/tag/v0.2.0

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
