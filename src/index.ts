#!/usr/bin/env node
/**
 * @capitalthought/relationship-radar-mcp — MCP server for Relationship Radar.
 *
 * Wraps the relradar.ai HTTP API (https://relradar.ai/AGENTS.md) as 5 verb-
 * first MCP tools:
 *
 *   - query_person          full dossier (POST /query)
 *   - suggest_identities    cheap disambiguation (POST /suggest)
 *   - investigate_person    deep PI agent (POST /api/investigate)
 *   - get_health            cron + module_health (GET /health/detail)
 *   - get_source_health     per-source last-status (GET /admin/source-health)
 *
 * Configuration via environment variable:
 *
 *   RADAR_TOKEN  required  Bearer token for relradar.ai. Treated as
 *                          role: "owner" — full source access.
 *   RADAR_BASE_URL optional Override base URL. Defaults to https://relradar.ai.
 *
 * Stdio-only transport — install via:
 *
 *   claude mcp add relationship-radar npx -y @capitalthought/relationship-radar-mcp \
 *     --env RADAR_TOKEN=<token>
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RadarClient } from "./client.js";
import { registerQueryTools } from "./tools/query.js";
import { registerInvestigateTool } from "./tools/investigate.js";
import { registerHealthTools } from "./tools/health.js";

const token = process.env.RADAR_TOKEN;
const baseUrl = process.env.RADAR_BASE_URL;

if (!token) {
  process.stderr.write(
    "Error: RADAR_TOKEN environment variable is required. " +
      "Get a token via the relationship-radar `scripts/rotate-dashboard-token` " +
      "or read CLAUDE.md § DASHBOARD_TOKEN in the relationship-radar repo.\n",
  );
  process.exit(1);
}

const client = new RadarClient({ token, baseUrl });
const server = new McpServer({
  name: "relationship-radar",
  version: "0.1.0",
});

registerQueryTools(server, client);
registerInvestigateTool(server, client);
registerHealthTools(server, client);

// Graceful shutdown — match the pattern used by sibling @capitalthought MCP
// servers (bizzabo-mcp, multipov-mcp-server) so a SIGTERM from the host
// agent doesn't leak open fetches.
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});
process.on("uncaughtException", (err) => {
  process.stderr.write(`[relationship-radar-mcp] Uncaught exception: ${err.message}\n`);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  process.stderr.write(`[relationship-radar-mcp] Unhandled rejection: ${err}\n`);
  process.exit(1);
});

const transport = new StdioServerTransport();
await server.connect(transport);
