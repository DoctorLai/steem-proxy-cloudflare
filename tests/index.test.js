import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import worker from "../src/index.js";

describe("Cloudflare Worker", () => {
  let globalFetch;

  beforeEach(() => {
    // Save original fetch
    globalFetch = global.fetch;
  });

  afterEach(() => {
    // Restore fetch
    global.fetch = globalFetch;
    vi.restoreAllMocks();
  });

  it("responds to OPTIONS with CORS headers", async () => {
    const req = new Request("https://example.com", { method: "OPTIONS" });
    const res = await worker.fetch(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });

  it("returns 405 for unsupported methods", async () => {
    const req = new Request("https://example.com", { method: "DELETE" });
    const res = await worker.fetch(req);
    const json = await res.json();
    expect(res.status).toBe(405);
    expect(json.error).toMatch(/Method Not Allowed/);
  });

  it("handles all RPC node failures gracefully", async () => {
    // Mock fetch to always fail
    global.fetch = vi.fn(() => Promise.reject(new Error("Network Error")));
    const req = new Request("https://example.com", { method: "POST" });
    const res = await worker.fetch(req);
    const json = await res.json();
    expect(res.status).toBe(502);
    expect(json.error).toMatch(/All RPC nodes failed/);
  });

  // ✅ Happy path test
  it("successfully forwards GET request to first available node", async () => {
    // Mock fetch to simulate a working node
    // eslint-disable-next-line no-unused-vars
    global.fetch = vi.fn(async (url, opts) => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          result: { blockchain_version: "0.25.0" },
        }),
        text: async () => JSON.stringify({ result: { blockchain_version: "0.25.0" } }),
      };
    });

    const req = new Request("https://example.com", { method: "GET" });
    const res = await worker.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.__server__).toBeDefined();
    expect(json.__version__).toBe("0.25.0");
    expect(json.__serverless_version__).toBeDefined();
    expect(json.__country__).toBeDefined();
  });
});
