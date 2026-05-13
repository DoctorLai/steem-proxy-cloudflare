// === CONFIGURATION ===
export const CONFIG = {
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  MIN_VERSION: "0.23.0",
  SERVERLESS_VERSION: "2026-05-13",
  NODES: ["https://api.justyy.com", "https://api.steemit.com"],
  FETCH_TIMEOUT_MS: 5000,
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const DOWNSTREAM_HEADERS = Object.freeze({
  "https://api.steemit.com": {
    "X-Edge-Key": "static_secret_value_here",
  },
  "https://api.justyy.com": {
    "X-Edge-Key": "another_static_secret_value",
  },
});

// === Utilities ===
export const compareVersion = (v1, v2) => {
  const a = v1.split(".").map(Number);
  const b = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
};

export async function fetchWithTimeout(url, options = {}, timeout = 5000, timer = setTimeout) {
  const controller = new AbortController();
  const t = timer(() => controller.abort(), timeout);
  try {
    // Use redirect: "manual" to track redirect chains and avoid double-counting subrequests
    const res = await fetch(url, { ...options, signal: controller.signal, redirect: "manual" });
    clearTimeout(t);

    // Follow redirect chain to final URL (each redirect already counts as a subrequest)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const finalUrl = res.headers.get("location");
      if (!finalUrl) throw new Error(`Redirect status ${res.status} but no location header`);
      return fetchWithTimeout(finalUrl, { ...options, redirect: "manual" }, timeout, timer);
    }

    return res;
  } catch (err) {
    clearTimeout(t);
    throw err;
  }
}

export async function getVersion(server, _fetchWithTimeout) {
  const fetcher = _fetchWithTimeout || fetchWithTimeout;
  const res = await fetcher(server, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": CONFIG.USER_AGENT,
    },
    body: JSON.stringify({
      id: 0,
      jsonrpc: "2.0",
      method: "call",
      params: ["login_api", "get_version", []],
    }),
  });
  if (!res.ok) throw new Error(`${server} returned ${res.status}`);
  const json = await res.json();
  const ver = json?.result?.blockchain_version;
  if (!ver) throw new Error(`No version info from ${server}`);
  if (compareVersion(ver, CONFIG.MIN_VERSION) < 0) {
    throw new Error(`Version too low: ${ver}`);
  }
  return { server, version: ver };
}

export async function safeGetVersion(server, _fetchWithTimeout) {
  const fetcher = _fetchWithTimeout || fetchWithTimeout;
  try {
    return await getVersion(server, fetcher);
  } catch (err) {
    console.warn(`Version check failed for ${server}: ${err.message}`);
    throw err;
  }
}

export async function forwardRequest(
  apiURL,
  body = null,
  method = "GET",
  extraHeaders = {},
  _fetchWithTimeout
) {
  const fetcher = _fetchWithTimeout || fetchWithTimeout;
  const res = await fetcher(apiURL, {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": CONFIG.USER_AGENT,
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  return { statusCode: res.status, text };
}

export default {
  async fetch(request) {
    const { method } = request;

    // === CORS preflight ===
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // === Allow only GET and POST ===
    if (method !== "GET" && method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const country = request.headers.get("cf-ipcountry") || "UNKNOWN";
      const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

      // Try nodes sequentially to minimize subrequests (vs concurrent Promise.any which uses 1 subrequest per attempt)
      // Cloudflare snippet limits: Free=0, Pro=2, Business=3, Enterprise=5 subrequests
      // Sequential tries: 1 version check + 1 forward = 2 subrequests (Pro plan)
      const shuffled = CONFIG.NODES.sort(() => Math.random() - 0.5);
      let selected = null;
      let lastError = null;

      for (const node of shuffled) {
        try {
          selected = await safeGetVersion(node, fetch);
          break; // Success - use this node
        } catch (err) {
          lastError = err;
          // Try next node
        }
      }

      if (!selected) {
        throw lastError || new Error("All upstream nodes failed");
      }
      // === Forward the actual request ===
      let respObj;

      if (!DOWNSTREAM_HEADERS[selected.server]) {
        throw new Error(`No security headers defined for ${selected.server}`);
      }

      const nodeHeaders = DOWNSTREAM_HEADERS[selected.server];

      if (method === "POST") {
        const body = await request.json();
        respObj = await forwardRequest(selected.server, body, "POST", nodeHeaders);
      } else {
        respObj = await forwardRequest(selected.server, null, "GET", nodeHeaders);
      }

      // === Parse upstream response ===
      let json;
      try {
        json = JSON.parse(respObj.text);
      } catch {
        json = { error: "Upstream returned non-JSON", body: respObj.text.slice(0, 200) };
      }

      // === Add metadata ===
      json["__server__"] = selected.server;
      json["__version__"] = selected.version;
      json["__country__"] = country;
      json["__serverless_version__"] = CONFIG.SERVERLESS_VERSION;
      json["__steem_servers__"] = CONFIG.NODES;

      // === Response ===
      return new Response(JSON.stringify(json), {
        status: respObj.statusCode,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "max-age=3",
          "X-Serverless-Version": CONFIG.SERVERLESS_VERSION,
          "X-Origin-Server": selected.server,
          "X-Country": country,
          "X-Client-IP": ip,
        },
      });
    } catch (err) {
      console.error("Worker error:", err.message);
      return new Response(
        JSON.stringify({
          code: "UPSTREAM_UNAVAILABLE",
          error: "All RPC nodes failed",
          message: err.message,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};
