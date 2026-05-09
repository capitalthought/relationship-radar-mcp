/**
 * Thin HTTP client for the Relationship Radar API at https://relradar.ai.
 *
 * Auth model — see https://relradar.ai/AGENTS.md#authentication for the
 * full contract. This client uses the service-token Bearer flow:
 *
 *   Authorization: Bearer <RADAR_TOKEN>
 *
 * The token is rotated atomically via `scripts/rotate-dashboard-token` in
 * the relationship-radar repo. Treat callers of this client as `role:
 * "owner"` — full source access, full role-gated endpoint set.
 */

const DEFAULT_BASE_URL = "https://relradar.ai";

export interface RadarClientOptions {
  /** Bearer token. Required. */
  token: string;
  /** Optional override (e.g. for staging). Defaults to https://relradar.ai. */
  baseUrl?: string;
  /** Per-request timeout in ms. Defaults to 60s — /query commonly takes 25–35s. */
  timeoutMs?: number;
}

export interface RadarApiError {
  __error: true;
  status: number;
  message: string;
  body: unknown;
}

export function isApiError(value: unknown): value is RadarApiError {
  return typeof value === "object" && value !== null && (value as RadarApiError).__error === true;
}

export class RadarClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(opts: RadarClientOptions) {
    if (!opts.token) {
      throw new Error("RadarClient: token is required");
    }
    this.token = opts.token;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? 60000;
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "@capitalthought/relationship-radar-mcp",
      ...(extra ?? {}),
    };
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    orgId?: string,
  ): Promise<T | RadarApiError> {
    const url = this.baseUrl + path + (orgId ? (path.includes("?") ? "&" : "?") + "org_id=" + encodeURIComponent(orgId) : "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const resp = await fetch(url, {
        method,
        headers: this.buildHeaders(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await resp.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }
      if (!resp.ok) {
        return {
          __error: true,
          status: resp.status,
          message: `Radar API ${method} ${path} → ${resp.status}`,
          body: parsed,
        };
      }
      return parsed as T;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        __error: true,
        status: 0,
        message: `Radar API ${method} ${path} → network error: ${msg}`,
        body: null,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // ---- Public surface ----

  /** POST /query — full dossier on a person. */
  async query(input: {
    name: string;
    company?: string;
    email?: string;
    refresh_sources?: string[];
    org_id?: string;
  }): Promise<unknown | RadarApiError> {
    const { org_id, ...body } = input;
    return this.request("POST", "/query", body, org_id);
  }

  /** POST /suggest — identity disambiguation candidates. */
  async suggest(input: {
    name: string;
    company?: string;
    org_id?: string;
  }): Promise<unknown | RadarApiError> {
    const { org_id, ...body } = input;
    return this.request("POST", "/suggest", body, org_id);
  }

  /** POST /api/investigate — deep PI agent investigation. */
  async investigate(input: {
    name: string;
    company?: string;
    email?: string;
    depth?: "quick" | "standard" | "thorough";
    org_id?: string;
  }): Promise<unknown | RadarApiError> {
    const { org_id, ...body } = input;
    return this.request("POST", "/api/investigate", body, org_id);
  }

  /** GET /health/detail — module_health snapshot (cron last-run, errors). */
  async health(input?: { org_id?: string }): Promise<unknown | RadarApiError> {
    return this.request("GET", "/health/detail", undefined, input?.org_id);
  }

  /** GET /admin/source-health — per-source last-status snapshot. */
  async sourceHealth(input?: { org_id?: string }): Promise<unknown | RadarApiError> {
    return this.request("GET", "/admin/source-health", undefined, input?.org_id);
  }
}
