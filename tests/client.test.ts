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
});
