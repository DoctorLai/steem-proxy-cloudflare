// === CONFIGURATION ===
export const CONFIG = {
  USER_AGENT:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  MIN_VERSION: "0.23.0",
  SERVERLESS_VERSION: "2025-10-20",
  NODES: ["https://api.justyy.com", "https://api.steemit.com"],
  FETCH_TIMEOUT_MS: 5000,
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(t);
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

export async function forwardRequest(apiURL, body = null, method = "GET", _fetchWithTimeout) {
  const fetcher = _fetchWithTimeout || fetchWithTimeout;
  const res = await fetcher(apiURL, {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": CONFIG.USER_AGENT,
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

      const shuffled = CONFIG.NODES.sort(() => Math.random() - 0.5);
      let selected = await Promise.any(shuffled.map((s) => safeGetVersion(s, fetch))).catch(() => {
        throw new Error("All upstream nodes failed");
      });
      // === Forward the actual request ===
      let respObj;
      if (method === "POST") {
        const body = await request.json();
        respObj = await forwardRequest(selected.server, body, "POST");
      } else {
        respObj = await forwardRequest(selected.server);
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
