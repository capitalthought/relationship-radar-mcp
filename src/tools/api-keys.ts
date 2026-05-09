import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RadarClient, isApiError } from "../client.js";

export function registerMintApiKeyTool(server: McpServer, client: RadarClient): void {
  server.registerTool(
    "radar_mint_api_key",
    {
      title: "Mint Radar API Key",
      description:
        "Mint a new per-org API key (rk_<token>) for service-to-service calls. Token returned ONCE — caller must store it. Hash persisted in org_api_keys; plaintext never. Owner role required. Note: with the legacy DASHBOARD_TOKEN bearer, the org_id arg is cosmetic (server forces DEFAULT_ORG_ID); becomes meaningful once tenant rk_ tokens exist post-signup. Wraps `POST /account/api-keys`.",
      inputSchema: z.object({
        org_id: z
          .string()
          .uuid()
          .describe(
            "Org UUID the key should belong to. With the legacy DASHBOARD_TOKEN bearer the server overrides this to DEFAULT_ORG_ID; meaningful only once tenant rk_ tokens exist.",
          ),
        label: z
          .string()
          .optional()
          .describe(
            "Human-readable label for the key (e.g., 'mikey-bot', 'recruiter-worker').",
          ),
        expires_at: z
          .string()
          .datetime()
          .optional()
          .describe("ISO 8601 expiration; if omitted, key never expires."),
      }),
    },
    async ({ org_id, label, expires_at }) => {
      const result = await client.mintApiKey(org_id, { label, expires_at });
      const header = "⚠️ TOKEN SHOWN ONCE. SAVE IT NOW.\n\n";
      if (isApiError(result)) {
        return {
          content: [
            {
              type: "text" as const,
              text: header + JSON.stringify(result, null, 2),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: header + JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
