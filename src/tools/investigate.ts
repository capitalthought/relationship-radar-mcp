import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { RadarClient, isApiError } from "../client.js";

export function registerInvestigateTool(server: McpServer, client: RadarClient): void {
  server.registerTool(
    "investigate_person",
    {
      title: "Investigate Person",
      description:
        "Deep PI-agent investigation. Unlike query_person (which fans out a fixed source set in parallel), investigate_person runs an iterative tool-use loop that decides which sources to query next based on findings, and returns a verified identity profile with an evidence chain. Slower and more expensive than query_person — only use for high-stakes identity verification (background checks, due diligence, ambiguous-identity cases) where the dossier alone isn't enough.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Person's full name."),
        company: z.string().optional().describe("Company name."),
        email: z.string().email().optional().describe("Email address — strongest disambiguator."),
        depth: z
          .enum(["quick", "standard", "thorough"])
          .optional()
          .describe(
            "Investigation depth — quick (2-3 iterations, ~$0.10), standard (4-5 iterations, ~$0.30, default), thorough (6+ iterations, ~$0.75). Higher depth = more cross-source evidence but linearly higher cost.",
          ),
      }),
    },
    async ({ name, company, email, depth }) => {
      const result = await client.investigate({ name, company, email, depth });
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
