# Changelog

All notable changes to `@capitalthought/relationship-radar-mcp` will be documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] — 2026-05-09

### Added

Phase Co.2 company-mode tools — three new tools that mirror the existing person trio for the `kind: "company"` discriminator on the relradar.ai HTTP API. Same auth (`RADAR_TOKEN` bearer), same response shape (`RadarReport`), same `org_id` multi-tenant plumbing.

- `query_company({ name, domain?, jurisdictions?, refresh_sources?, org_id? })` — full company dossier. Wraps `POST /query` with body `{ kind: "company", query: { name, domain?, jurisdictions? } }`. Synthesizes Crunchbase, OpenCorporates, SOS / business registrations, news, web, HubSpot, Airtable, Asana, and Gmail mentions into a corporate intel brief.
- `suggest_companies({ name, org_id? })` — cheap company disambiguation pre-flight. Wraps `POST /suggest` with body `{ kind: "company", query: { name } }`. Returns ranked candidates (with domain + jurisdiction hints + confidence scores). Per the Phase Co.2 spec, the response may include mixed-kind candidates — agents should check each candidate's `kind` field.
- `investigate_company({ name, domain?, depth?, org_id? })` — deep PI-agent investigation. Wraps `POST /api/investigate` with body `{ kind: "company", query: { name, domain? }, depth? }`. Same depth options as person mode (`quick` / `standard` / `thorough`).

Backed by the relationship-radar Worker's Option C dispatch on `/query` (shipped 2026-05-09) — the backend auto-detects the `kind: "company"` discriminator and routes to the company-mode synthesis path.

### Tests

- 11 new tests covering the 3 new client methods — URL shape, body discriminator (`kind: "company"`), nested `query{}` envelope (name / domain / jurisdictions), top-level `refresh_sources` and `depth` placement, `org_id` query-param plumbing, body cleanliness (`org_id` never leaks into POST bodies), and HTTP error → `RadarApiError` conversion. All 34 tests passing.

### Backwards compatibility

- 100% backwards-compatible with 0.3.0. The 7 existing tools and their schemas are unchanged. No new env vars — `RADAR_TOKEN` continues to be the only required configuration.

[0.4.0]: https://github.com/capitalthought/relationship-radar-mcp/releases/tag/v0.4.0

## [0.3.0] — 2026-05-09

### Added

- `radar_org_prep({ org_id })` — pre-flight org snapshot for an agent acting on behalf of a tenant. Wraps `GET /admin/orgs/<id>` (Phase A.8 v2 super-admin endpoint). Returns org metadata, subscription state, member roster, connected sources, today's usage, and a synthesized `alerts[]` array (`payment_past_due`, `subscription_canceled`, `trial_ends_in_<n>d`, `<source>_token_expires_in_<n>d`, `using_without_active_sub`). Backed by worker commit `c291e2a`.
- `radar_mint_api_key({ org_id, label?, expires_at? })` — mint a new per-org `rk_<token>` for service-to-service calls. Wraps `POST /account/api-keys` (Phase A.4 owner-only endpoint). Token is returned ONCE in the response; SHA-256 hash is persisted to `org_api_keys`, plaintext never. The MCP tool prepends a `⚠️ TOKEN SHOWN ONCE. SAVE IT NOW.` header to the response. Backed by worker commit `b879ef6`.

### Caveats

- For the legacy `DASHBOARD_TOKEN` bearer, the worker locks `radar_mint_api_key` to `DEFAULT_ORG_ID` regardless of the `org_id` arg (see `src/radar/auth.ts:583-625`). The `org_id` parameter therefore becomes meaningful only once tenant `rk_` tokens exist post-signup. Documented in the tool description.

### Tests

- 10 new tests covering the two new client methods — URL shape, body shape, Bearer auth, GET vs POST, path encoding, 404/403/401/400 error paths, optional-field forwarding, and empty-body handling. All 25 tests passing.

### Backwards compatibility

- 100% backwards-compatible with 0.2.0. The existing 5 tools and their schemas are unchanged. No new env vars — `RADAR_TOKEN` continues to be the only required configuration.

[0.3.0]: https://github.com/capitalthought/relationship-radar-mcp/releases/tag/v0.3.0

## [0.2.0] — 2026-05-09

### Added

- Optional `org_id: string` (uuid) parameter on every existing tool — `query_person`, `suggest_identities`, `investigate_person`, `get_health`, `get_source_health`. When provided, the MCP client appends `?org_id=<uuid>` as a query param on the underlying HTTP call so the worker can scope the request to a specific tenant. When omitted, behavior is unchanged: the worker resolves the bearer's default org (Capital Factory for the legacy `DASHBOARD_TOKEN`).
- Aligns with Relationship Radar Phase A multi-tenant rollout. See the new "Multi-tenant authentication & tenancy" section of [https://relradar.ai/AGENTS.md](https://relradar.ai/AGENTS.md) for the full contract (org-scoped tokens, plan-tier source restrictions, daily spend caps).

### Tests

- 7 new tests covering the `org_id` query-param plumbing across all 5 tools — URL shape, body cleanliness (org_id never leaks into POST bodies), and URL-encoding. All 15 tests passing.

### Backwards compatibility

- 100% backwards-compatible. Existing 0.1.0 callers that omit `org_id` continue to work exactly as before — the underlying URL doesn't change when no org_id is passed.

### Deferred to 0.3.0

- Tools `radar_org_prep` and `radar_mint_api_key` deferred to 0.3.0 pending Phase A.4 (per-org API key mint endpoint) + Phase A.8 (`/admin/orgs/<id>` admin endpoints) backend work. **Shipped in 0.3.0 below.**

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
