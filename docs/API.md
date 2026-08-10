# API Reference

The Worker exposes a small HTTP proxy for Steem JSON-RPC requests. The public instance is
`https://api2.steemyy.com`.

## Request Methods

- `POST`: forwards a JSON request body to the first healthy configured RPC node.
- `GET`: forwards a request to the selected node root.
- `OPTIONS`: returns a CORS preflight response.
- Other methods return `405 Method Not Allowed`.

Before forwarding, the Worker asks each candidate node for its blockchain version and accepts the
first response at or above the configured minimum. Health checks and forwarded requests have a
five-second timeout.

## Example

```bash
curl --request POST https://api2.steemyy.com \
  --header "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"condenser_api.get_dynamic_global_properties","params":[],"id":1}'
```

## Response Metadata

Successful upstream JSON object responses include these additional fields:

- `__server__`: selected upstream RPC URL.
- `__version__`: selected node blockchain version.
- `__country__`: Cloudflare country code or `UNKNOWN`.
- `__serverless_version__`: deployed proxy version.
- `__steem_servers__`: configured candidate nodes.

The Worker preserves JSON arrays and primitive values without adding body fields. It adds
`X-Origin-Server`, `X-Serverless-Version`, and `X-Country` response headers and marks successful
responses as private. If the upstream response is not JSON, the Worker returns a JSON error wrapper
containing at most the first 200 characters of that response.

Malformed client JSON returns HTTP `400` with code `INVALID_JSON`. When every candidate fails, the
Worker returns HTTP `502` with code `UPSTREAM_UNAVAILABLE`.
