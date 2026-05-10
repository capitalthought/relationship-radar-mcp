import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RadarClient, isApiError } from "../client.js";

/**
 * Phase Co.2 company-mode tools — mirror the person-mode trio
 * (query_person / suggest_identities / investigate_person) for the
 * `kind: "company"` discriminator on the relradar.ai HTTP API.
 *
 * Same auth (RADAR_TOKEN bearer), same response shape (RadarReport),
 * same multi-tenant `org_id` plumbing as the person tools.
 */
export function registerCompanyTools(server: McpServer, client: RadarClient): void {
  server.registerTool(
    "query_company",
    {
      title: "Query Company",
      description:
        "Get a relationship-intel dossier for a company. Synthesizes Capital Factory's data sources (Crunchbase, OpenCorporates, SOS/business registrations, news, web, HubSpot, Airtable, Asana, Gmail mentions, etc.) into a company brief: corporate identity, jurisdictions, key people, recent context, and CF history. Use when you have a company name and optionally a domain or jurisdiction hint.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Company name (e.g. 'Acme Robotics, Inc.')."),
        domain: z
          .string()
          .optional()
          .describe(
            "Primary web domain (e.g. 'acme.com'). Strongest disambiguator when multiple companies share a name.",
          ),
        jurisdictions: z
          .array(z.string())
          .optional()
          .describe(
            "Optional list of US state codes or country codes to scope SOS / business-registration lookups (e.g. ['TX', 'DE']). Helps disambiguate common names across registrations.",
          ),
        refresh_sources: z
          .array(z.string())
          .optional()
          .describe(
            "Per-source cache invalidation: pass a list of source names to force a fresh fetch instead of using the 10-minute KV cache.",
          ),
        org_id: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Optional tenant org id (Phase A multi-tenant). Omit to use the bearer's default org. See https://relradar.ai/AGENTS.md § Multi-tenant authentication & tenancy.",
          ),
      }),
    },
    async ({ name, domain, jurisdictions, refresh_sources, org_id }) => {
      const result = await client.queryCompany({ name, domain, jurisdictions, refresh_sources, org_id });
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
    "suggest_companies",
    {
      title: "Suggest Companies",
      description:
        "Cheap company-disambiguation pre-flight before query_company. Returns a small set of candidate companies for a name (with domains, jurisdictions, and confidence scores). Use this when you have a partial or common company name (e.g. 'Apex' or 'Acme Robotics') and need to pick the right entity before running a full dossier. Faster and cheaper than query_company. Note: response may include mixed-kind candidates per Phase Co.2 spec — check each candidate's `kind` field.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Company name. Can be partial — the response will rank candidates."),
        org_id: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Optional tenant org id (Phase A multi-tenant). Omit to use the bearer's default org. See https://relradar.ai/AGENTS.md § Multi-tenant authentication & tenancy.",
          ),
      }),
    },
    async ({ name, org_id }) => {
      const result = await client.suggestCompanies({ name, org_id });
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
    "investigate_company",
    {
      title: "Investigate Company",
      description:
        "Deep PI-agent investigation of a company. Unlike query_company (parallel fan-out across a fixed source set), investigate_company runs an iterative tool-use loop that decides which sources to query next based on findings, returning a verified corporate profile with an evidence chain (jurisdictional footprint, officers, ownership, regulatory hits, litigation). Slower and more expensive than query_company — only use for high-stakes due diligence (investment, M&A, partnerships) where the dossier alone isn't enough.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Company name."),
        domain: z
          .string()
          .optional()
          .describe("Primary web domain (e.g. 'acme.com') — strongest disambiguator."),
        depth: z
          .enum(["quick", "standard", "thorough"])
          .optional()
          .describe(
            "Investigation depth — quick (2-3 iterations, ~$0.10), standard (4-5 iterations, ~$0.30, default), thorough (6+ iterations, ~$0.75). Higher depth = more cross-source evidence but linearly higher cost.",
          ),
        org_id: z
          .string()
          .uuid()
          .optional()
          .describe(
            "Optional tenant org id (Phase A multi-tenant). Omit to use the bearer's default org. See https://relradar.ai/AGENTS.md § Multi-tenant authentication & tenancy.",
          ),
      }),
    },
    async ({ name, domain, depth, org_id }) => {
      const result = await client.investigateCompany({ name, domain, depth, org_id });
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
