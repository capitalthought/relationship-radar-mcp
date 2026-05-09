import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RadarClient, isApiError } from "../client.js";

export function registerOrgPrepTool(server: McpServer, client: RadarClient): void {
  server.registerTool(
    "radar_org_prep",
    {
      title: "Radar Org Prep",
      description:
        "Pre-flight org snapshot for an agent acting on behalf of a tenant. Returns the org's plan, subscription status, member roster, connected sources, today's usage, and any active alerts (e.g. `trial_ends_in_2d`, `payment_past_due`, `<source>_token_expires_in_<n>d`, `using_without_active_sub`). Super-admin auth required (DASHBOARD_TOKEN bearer or Josh's cookie). Call before any other org-scoped action so the agent has fresh context. Wraps `GET /admin/orgs/<id>`.",
      inputSchema: z.object({
        org_id: z
          .string()
          .uuid()
          .describe(
            "Org UUID. The endpoint reads any org regardless of the bearer's tenancy (super-admin only).",
          ),
      }),
    },
    async ({ org_id }) => {
      const result = await client.getOrgPrep(org_id);
      if (isApiError(result)) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
