import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RadarClient, isApiError } from "../client.js";

export function registerQueryTools(server: McpServer, client: RadarClient): void {
  server.registerTool(
    "query_person",
    {
      title: "Query Person",
      description:
        "Run a full Relationship Radar dossier on a person. Synthesizes ~70 data sources (Gmail, Calendar, HubSpot, Asana, Airtable, Crunchbase, court records, social, etc.) into a meeting-prep brief: relationship snapshot, recent context, network connections, suggested replies. Use BEFORE meetings or whenever you need to understand a person's history with Capital Factory.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Person's full name (e.g. 'Patrick Vogt')."),
        company: z.string().optional().describe("Company name to disambiguate common names."),
        email: z.string().email().optional().describe("Email address — bypasses identity resolution and pins the query to this exact contact."),
        refresh_sources: z
          .array(z.string())
          .optional()
          .describe(
            "Per-source cache invalidation: pass a list of source names (e.g. ['gmail', 'hubspot']) to force a fresh fetch instead of using the 10-minute KV cache.",
          ),
        org_id: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Optional tenant org id (Phase A multi-tenant). Omit to use the bearer's default org (Capital Factory for the legacy DASHBOARD_TOKEN). When provided, the worker scopes the query to that tenant's credentials + plan-tier source set. See https://relradar.ai/AGENTS.md § Multi-tenant authentication & tenancy.",
          ),
      }),
    },
    async ({ name, company, email, refresh_sources, org_id }) => {
      const result = await client.query({ name, company, email, refresh_sources, org_id });
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
    "suggest_identities",
    {
      title: "Suggest Identities",
      description:
        "Cheap identity-disambiguation pre-flight before query_person. Returns a small set of candidate emails+companies for a name, with confidence scores. Use this when you have a name like 'John' or 'Sarah Chen' and need to pick the right person before running a full dossier. Faster and cheaper than query_person.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Person's name. Can be partial (e.g. 'Sarah') — the response will rank candidates."),
        company: z.string().optional().describe("Company hint to narrow the candidate set."),
        org_id: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Optional tenant org id (Phase A multi-tenant). Omit to use the bearer's default org. See https://relradar.ai/AGENTS.md § Multi-tenant authentication & tenancy.",
          ),
      }),
    },
    async ({ name, company, org_id }) => {
      const result = await client.suggest({ name, company, org_id });
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
