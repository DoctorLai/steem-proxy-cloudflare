# Steem Proxy Cloudflare Worker

A lightweight Cloudflare Worker that automatically selects the healthiest Steem RPC node, ensuring stable, low-latency JSON-RPC access.

## Features
- Auto health-check and version validation
- CORS enabled
- Compatible with `fetch` API
- Instant failover using `Promise.any`

## Development
```bash
npm install
npm run dev

# steem-proxy-cloudflare
Steem Proxy Node via CloudFlare Snippet
```

## Testing
```bash
npm test
```

## Deploy
```bash
npm run deploy
```

## License
[MIT](./LICENSE)