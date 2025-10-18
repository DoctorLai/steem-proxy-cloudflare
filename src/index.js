export default {
  async fetch(request) {
    const UserAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
    const min_blockchain_version = "0.23.0";
    const serverless_version = "2025-10-18";
    const nodes = ["https://api.justyy.com", "https://api.steemit.com"];

    const { method } = request;

    // ✅ Handle CORS preflight requests
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // ✅ Only allow GET and POST
    if (method !== "GET" && method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const compareVersion = (v1, v2) => {
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

    async function getVersion(server) {
      const res = await fetch(server, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": UserAgent,
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
      if (compareVersion(ver, min_blockchain_version) < 0)
        throw new Error(`Version too low: ${ver}`);
      return { server, version: ver };
    }

    const safeGetVersion = async (s) => {
      try {
        return await getVersion(s);
      } catch {
        return Promise.reject();
      }
    };

    async function forwardRequest(apiURL, body = null, method = "GET") {
      const res = await fetch(apiURL, {
        method,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": UserAgent,
        },
        body: body ? JSON.stringify(body) : null,
      });
      const text = await res.text();
      return { statusCode: res.status, text };
    }

    try {
      const country = request.headers.get("cf-ipcountry") || "UNKNOWN";
      const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

      const selected = await Promise.any(nodes.map(safeGetVersion)).catch(() => {
        throw new Error("All upstream nodes failed");
      });

      const target = selected.server;
      const method = request.method.toUpperCase();
      let respObj;

      if (method === "POST") {
        const body = await request.json();
        respObj = await forwardRequest(target, body, "POST");
      } else if (method === "GET") {
        respObj = await forwardRequest(target);
      } else {
        return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
          status: 405,
          headers: corsHeaders,
        });
      }

      let json;
      try {
        json = JSON.parse(respObj.text);
      } catch {
        json = { error: "Invalid JSON from upstream" };
      }

      json["__server__"] = selected.server;
      json["__version__"] = selected.version;
      json["__country__"] = country;
      json["__serverless_version__"] = serverless_version;
      json["__steem_servers__"] = nodes;

      return new Response(JSON.stringify(json), {
        status: respObj.statusCode,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "max-age=3",
          "Serverless-Version": serverless_version,
          Origin: selected.server,
          Country: country,
          IP: ip,
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "All RPC nodes failed", message: err.message }), {
        status: 502,
        headers: corsHeaders,
      });
    }
  },
};
