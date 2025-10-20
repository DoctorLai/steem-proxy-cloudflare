import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import worker from "../src/index.js";

describe("Cloudflare Worker", () => {
  let globalFetch;

  beforeEach(() => {
    // Save original fetch
    globalFetch = global.fetch;

    // Mock Cloudflare cache API
    global.caches = {
      default: {
        store: new Map(),
        async match(request) {
          return this.store.get(request.url);
        },
        async put(request, response) {
          this.store.set(request.url, response);
        },
      },
    };
  });

  afterEach(() => {
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

  it("successfully forwards GET request to first available node", async () => {
    // Mock fetch to simulate version check and then forwarding
    global.fetch = vi.fn(async (url, opts) => {
      if (opts?.method === "POST" && opts.body?.includes("get_version")) {
        return new Response(JSON.stringify({ result: { blockchain_version: "0.25.0" } }), {
          status: 200,
        });
      }

      // GET forwarding
      return new Response(
        JSON.stringify({
          __server__: "node1",
          __version__: "0.25.0",
          __serverless_version__: "1.2.3",
          __country__: "US",
          data: "success",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const req = new Request("https://example.com", { method: "GET" });
    const res = await worker.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.__server__).toBeDefined();
    expect(json.__version__).toBe("0.25.0");
    expect(json.__serverless_version__).toBeDefined();
    expect(json.__country__).toBeDefined();
    expect(json.data).toBe("success");
  });
});
