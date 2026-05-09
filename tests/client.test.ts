import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RadarClient, isApiError } from "../src/client.js";

describe("RadarClient", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function ok(body: unknown, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  }

  function err(status: number, body: unknown) {
    return {
      ok: false,
      status,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  }

  it("throws when token is missing", () => {
    expect(() => new RadarClient({ token: "" })).toThrow(/token is required/);
  });

  it("attaches Bearer auth + JSON content-type on POST", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    const c = new RadarClient({ token: "tok-abc" });
    await c.query({ name: "Patrick Vogt" });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-abc");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ name: "Patrick Vogt" });
  });

  it("uses baseUrl override when supplied", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    const c = new RadarClient({ token: "t", baseUrl: "https://staging.relradar.ai" });
    await c.health();
    expect(fetchSpy.mock.calls[0][0]).toBe("https://staging.relradar.ai/health/detail");
  });

  it("strips trailing slash on baseUrl", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    const c = new RadarClient({ token: "t", baseUrl: "https://relradar.ai/" });
    await c.health();
    expect(fetchSpy.mock.calls[0][0]).toBe("https://relradar.ai/health/detail");
  });

  it("returns RadarApiError on non-2xx", async () => {
    fetchSpy.mockResolvedValueOnce(err(401, { message: "Please sign in to continue." }));
    const c = new RadarClient({ token: "tok" });
    const result = await c.query({ name: "x" });
    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(401);
      expect(result.message).toMatch(/POST \/query → 401/);
    }
  });

  it("returns RadarApiError on network failure", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const c = new RadarClient({ token: "tok" });
    const result = await c.suggest({ name: "x" });
    expect(isApiError(result)).toBe(true);
    if (isApiError(result)) {
      expect(result.status).toBe(0);
      expect(result.message).toMatch(/network error.*ECONNREFUSED/);
    }
  });

  it("uses GET for /health/detail and /admin/source-health", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    fetchSpy.mockResolvedValueOnce(ok({ sources: [] }));
    const c = new RadarClient({ token: "tok" });
    await c.health();
    await c.sourceHealth();
    expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe("GET");
    expect((fetchSpy.mock.calls[1][1] as RequestInit).method).toBe("GET");
    // GET requests don't have a body
    expect((fetchSpy.mock.calls[0][1] as RequestInit).body).toBeUndefined();
  });

  it("forwards optional fields on /query (company, email, refresh_sources)", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    const c = new RadarClient({ token: "tok" });
    await c.query({
      name: "Sarah Chen",
      company: "Acme",
      email: "sarah@acme.com",
      refresh_sources: ["gmail", "hubspot"],
    });
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({
      name: "Sarah Chen",
      company: "Acme",
      email: "sarah@acme.com",
      refresh_sources: ["gmail", "hubspot"],
    });
  });

  // ---- Phase A.5 multi-tenant: optional org_id query param ----

  const ORG_UUID = "11111111-2222-3333-4444-555555555555";

  it("appends ?org_id=<uuid> on POST /query when org_id is provided", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    const c = new RadarClient({ token: "tok" });
    await c.query({ name: "Sarah Chen", org_id: ORG_UUID });
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe(`https://relradar.ai/query?org_id=${ORG_UUID}`);
    // org_id stays out of the body — it's a query param, not a body field
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ name: "Sarah Chen" });
    expect(body.org_id).toBeUndefined();
  });

  it("does NOT append org_id when omitted from /query input", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    const c = new RadarClient({ token: "tok" });
    await c.query({ name: "Sarah Chen" });
    expect(fetchSpy.mock.calls[0][0]).toBe("https://relradar.ai/query");
  });

  it("appends ?org_id=<uuid> on POST /suggest when org_id is provided", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ candidates: [] }));
    const c = new RadarClient({ token: "tok" });
    await c.suggest({ name: "Sarah", org_id: ORG_UUID });
    expect(fetchSpy.mock.calls[0][0]).toBe(`https://relradar.ai/suggest?org_id=${ORG_UUID}`);
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.org_id).toBeUndefined();
  });

  it("appends ?org_id=<uuid> on POST /api/investigate when org_id is provided", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    const c = new RadarClient({ token: "tok" });
    await c.investigate({ name: "Sarah Chen", depth: "standard", org_id: ORG_UUID });
    expect(fetchSpy.mock.calls[0][0]).toBe(
      `https://relradar.ai/api/investigate?org_id=${ORG_UUID}`,
    );
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ name: "Sarah Chen", depth: "standard" });
  });

  it("appends ?org_id=<uuid> on GET /health/detail when org_id is provided", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    const c = new RadarClient({ token: "tok" });
    await c.health({ org_id: ORG_UUID });
    expect(fetchSpy.mock.calls[0][0]).toBe(
      `https://relradar.ai/health/detail?org_id=${ORG_UUID}`,
    );
    expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe("GET");
  });

  it("appends ?org_id=<uuid> on GET /admin/source-health when org_id is provided", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ sources: [] }));
    const c = new RadarClient({ token: "tok" });
    await c.sourceHealth({ org_id: ORG_UUID });
    expect(fetchSpy.mock.calls[0][0]).toBe(
      `https://relradar.ai/admin/source-health?org_id=${ORG_UUID}`,
    );
  });

  it("URL-encodes org_id values to be safe", async () => {
    fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
    const c = new RadarClient({ token: "tok" });
    // Even though uuids don't need encoding, the client should still call encodeURIComponent.
    // Smoke-test with a value that would get mangled if not encoded.
    await c.query({ name: "x", org_id: "weird value" });
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe("https://relradar.ai/query?org_id=weird%20value");
  });

  // ---- 0.3.0: radar_org_prep / radar_mint_api_key client surface ----

  describe("getOrgPrep", () => {
    it("issues GET /admin/orgs/<uuid> with Bearer auth", async () => {
      fetchSpy.mockResolvedValueOnce(ok({ status: "ok", org: { org_id: ORG_UUID } }));
      const c = new RadarClient({ token: "tok-xyz" });
      await c.getOrgPrep(ORG_UUID);
      const url = fetchSpy.mock.calls[0][0] as string;
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(url).toBe(`https://relradar.ai/admin/orgs/${ORG_UUID}`);
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-xyz");
    });

    it("URL-encodes the orgId path segment defensively", async () => {
      fetchSpy.mockResolvedValueOnce(ok({ status: "ok" }));
      const c = new RadarClient({ token: "tok" });
      // Pretend we got a malformed input — the client should still encode it
      // rather than blindly inject into the path.
      await c.getOrgPrep("weird/value");
      expect(fetchSpy.mock.calls[0][0]).toBe(
        "https://relradar.ai/admin/orgs/weird%2Fvalue",
      );
    });

    it("returns RadarApiError on 404 org_not_found", async () => {
      fetchSpy.mockResolvedValueOnce(
        err(404, { status: "error", code: "org_not_found", message: "Org not found." }),
      );
      const c = new RadarClient({ token: "tok" });
      const result = await c.getOrgPrep(ORG_UUID);
      expect(isApiError(result)).toBe(true);
      if (isApiError(result)) {
        expect(result.status).toBe(404);
        expect(result.message).toMatch(/GET \/admin\/orgs\/.* → 404/);
        expect((result.body as { code?: string }).code).toBe("org_not_found");
      }
    });

    it("returns RadarApiError on 403 non-super-admin", async () => {
      fetchSpy.mockResolvedValueOnce(
        err(403, { status: "error", message: "Super-admin access required." }),
      );
      const c = new RadarClient({ token: "tok" });
      const result = await c.getOrgPrep(ORG_UUID);
      expect(isApiError(result)).toBe(true);
      if (isApiError(result)) expect(result.status).toBe(403);
    });
  });

  describe("mintApiKey", () => {
    it("issues POST /account/api-keys with body + bearer auth", async () => {
      fetchSpy.mockResolvedValueOnce(
        ok({ status: "ok", id: "key-1", token: "rk_abc", expires_at: null, warning: "..." }, 201),
      );
      const c = new RadarClient({ token: "tok-xyz" });
      await c.mintApiKey(ORG_UUID, { label: "mikey-bot" });
      const url = fetchSpy.mock.calls[0][0] as string;
      const init = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(url).toBe(`https://relradar.ai/account/api-keys?org_id=${ORG_UUID}`);
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-xyz");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
      expect(JSON.parse(init.body as string)).toEqual({ label: "mikey-bot" });
    });

    it("forwards expires_at when provided, never leaks org_id into body", async () => {
      fetchSpy.mockResolvedValueOnce(ok({ status: "ok", id: "k", token: "rk_y" }, 201));
      const c = new RadarClient({ token: "tok" });
      await c.mintApiKey(ORG_UUID, {
        label: "recruiter-worker",
        expires_at: "2026-12-31T23:59:59.000Z",
      });
      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body).toEqual({
        label: "recruiter-worker",
        expires_at: "2026-12-31T23:59:59.000Z",
      });
      expect((body as { org_id?: unknown }).org_id).toBeUndefined();
    });

    it("sends an empty body object when called with no fields", async () => {
      fetchSpy.mockResolvedValueOnce(ok({ status: "ok", id: "k", token: "rk_z" }, 201));
      const c = new RadarClient({ token: "tok" });
      await c.mintApiKey(ORG_UUID);
      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body).toEqual({});
    });

    it("returns RadarApiError on 401 anonymous", async () => {
      fetchSpy.mockResolvedValueOnce(
        err(401, { status: "error", message: "Please sign in to continue." }),
      );
      const c = new RadarClient({ token: "tok" });
      const result = await c.mintApiKey(ORG_UUID, { label: "x" });
      expect(isApiError(result)).toBe(true);
      if (isApiError(result)) {
        expect(result.status).toBe(401);
        expect(result.message).toMatch(/POST \/account\/api-keys → 401/);
      }
    });

    it("returns RadarApiError on 400 invalid expires_at", async () => {
      fetchSpy.mockResolvedValueOnce(
        err(400, { status: "error", message: "Invalid expires_at — must be ISO 8601." }),
      );
      const c = new RadarClient({ token: "tok" });
      const result = await c.mintApiKey(ORG_UUID, { expires_at: "not-a-date" });
      expect(isApiError(result)).toBe(true);
      if (isApiError(result)) expect(result.status).toBe(400);
    });
  });
});
