import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RadarClient, isApiError } from "../client.js";

export function registerHealthTools(server: McpServer, client: RadarClient): void {
  server.registerTool(
    "get_health",
    {
      title: "Get Radar Health",
      description:
        "Detailed health snapshot of the Relationship Radar workers — cron last-run timestamps, module_health for each scheduled job (meeting-prep, cache-warm, edge-sync, cron-health, replay-rerank, mighty-rsvp-refresh), and the state_summary aggregate. Use to verify the radar is healthy before relying on its output for a high-stakes query.",
      inputSchema: z.object({
        org_id: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Optional tenant org id (Phase A multi-tenant). Omit to use the bearer's default org.",
          ),
      }),
    },
    async ({ org_id }) => {
      const result = await client.health({ org_id });
      if (isApiError(result)) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );

  server.registerTool(
    "get_source_health",
    {
      title: "Get Source Health",
      description:
        "Per-source last-status snapshot from /admin/source-health. Returns each of the ~70 data sources with status (success | no_data | error | skipped), timestamp, and last_success. Use to interpret a query_person response that came back partial — sources missing from the dossier will be flagged here as 'error' or 'skipped'. NOTE: 'no_data' is a HEALTHY outcome (source ran cleanly, just no matches for this person). Only sources with status='error' AND stale last_success are real outages.",
      inputSchema: z.object({
        org_id: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Optional tenant org id (Phase A multi-tenant). Omit to use the bearer's default org.",
          ),
      }),
    },
    async ({ org_id }) => {
      const result = await client.sourceHealth({ org_id });
      if (isApiError(result)) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );
}
