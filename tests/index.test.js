import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import worker, { CONFIG } from "../src/index.js";

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
    vi.useRealTimers();
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

  it("returns 400 for malformed POST JSON without contacting an upstream", async () => {
    global.fetch = vi.fn();
    const req = new Request("https://example.com", { method: "POST", body: "{" });
    const res = await worker.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      code: "INVALID_JSON",
      error: "Request body must be valid JSON",
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("handles all RPC node failures gracefully", async () => {
    // Mock fetch to always fail
    global.fetch = vi.fn(() => Promise.reject(new Error("Network Error")));
    const req = new Request("https://example.com");
    const res = await worker.fetch(req);
    const json = await res.json();
    expect(res.status).toBe(502);
    expect(json.error).toMatch(/All RPC nodes failed/);
  });

  it("times out when every RPC node hangs", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, { signal }) => {
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    });

    const responsePromise = worker.fetch(new Request("https://example.com"));
    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(502);
    expect(global.fetch).toHaveBeenCalledTimes(CONFIG.NODES.length);
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
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=3");
    expect(res.headers.has("X-Client-IP")).toBe(false);
  });

  it("successfully forwards a POST body", async () => {
    const body = {
      jsonrpc: "2.0",
      method: "condenser_api.get_dynamic_global_properties",
      params: [],
      id: 1,
    };
    global.fetch = vi.fn(async (_url, opts) => {
      if (opts?.body?.includes("get_version")) {
        return new Response(JSON.stringify({ result: { blockchain_version: "0.25.0" } }), {
          status: 200,
        });
      }

      return new Response(JSON.stringify({ jsonrpc: "2.0", result: { ok: true }, id: 1 }), {
        status: 201,
      });
    });

    const req = new Request("https://example.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await worker.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.result).toEqual({ ok: true });
    expect(json.__server__).toBeDefined();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "POST", body: JSON.stringify(body) })
    );
  });

  it("wraps a non-JSON upstream response and limits its body", async () => {
    global.fetch = vi.fn(async (_url, opts) => {
      if (opts?.body?.includes("get_version")) {
        return new Response(JSON.stringify({ result: { blockchain_version: "0.25.0" } }));
      }

      return new Response("x".repeat(250), { status: 502 });
    });

    const res = await worker.fetch(new Request("https://example.com"));
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBe("Upstream returned non-JSON");
    expect(json.body).toHaveLength(200);
    expect(json.__server__).toBeDefined();
  });

  it("preserves a non-object JSON response without crashing", async () => {
    global.fetch = vi.fn(async (_url, opts) => {
      if (opts?.body?.includes("get_version")) {
        return new Response(JSON.stringify({ result: { blockchain_version: "0.25.0" } }));
      }

      return new Response("null", { status: 200 });
    });

    const res = await worker.fetch(new Request("https://example.com"));

    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
    expect(res.headers.get("X-Origin-Server")).toBeTruthy();
  });

  it("returns 502 when the selected node has no downstream headers", async () => {
    const originalNodes = [...CONFIG.NODES];
    CONFIG.NODES = ["https://api.unknown.com"];

    try {
      global.fetch = vi.fn(async (url, opts) => {
        if (opts?.method === "POST" && opts.body?.includes("get_version")) {
          return new Response(JSON.stringify({ result: { blockchain_version: "0.25.0" } }), {
            status: 200,
          });
        }
        return new Response(JSON.stringify({ error: "should not reach forward" }), { status: 200 });
      });

      const req = new Request("https://example.com", { method: "GET" });
      const res = await worker.fetch(req);
      const json = await res.json();

      expect(res.status).toBe(502);
      expect(json.message).toMatch(/No security headers defined/);
    } finally {
      CONFIG.NODES = originalNodes;
    }
  });

  it("forwards POST requests and preserves JSON metadata", async () => {
    global.fetch = vi.fn(async (url, opts) => {
      if (opts?.method === "POST" && opts.body?.includes("get_version")) {
        return new Response(JSON.stringify({ result: { blockchain_version: "0.25.0" } }), {
          status: 200,
        });
      }

      return new Response(JSON.stringify({ message: "posted" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const req = new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await worker.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe("posted");
    expect(json.__server__).toBeDefined();
    expect(json.__version__).toBe("0.25.0");
  });

  it("handles non-JSON upstream responses gracefully", async () => {
    global.fetch = vi.fn(async (url, opts) => {
      if (opts?.method === "POST" && opts.body?.includes("get_version")) {
        return new Response(JSON.stringify({ result: { blockchain_version: "0.25.0" } }), {
          status: 200,
        });
      }

      return new Response("not valid json", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    });

    const req = new Request("https://example.com", { method: "GET" });
    const res = await worker.fetch(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.error).toBe("Upstream returned non-JSON");
    expect(json.body).toBe("not valid json");
  });
});
