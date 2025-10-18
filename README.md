# Steem Proxy Cloudflare Snippet
[![Steem Proxy CI](https://github.com/DoctorLai/steem-proxy-cloudflare/actions/workflows/ci.yaml/badge.svg)](https://github.com/DoctorLai/steem-proxy-cloudflare/actions/workflows/ci.yaml) [![Steem Proxy Lint & Format](https://github.com/DoctorLai/steem-proxy-cloudflare/actions/workflows/lint.yml/badge.svg)](https://github.com/DoctorLai/steem-proxy-cloudflare/actions/workflows/lint.yml)

A lightweight Cloudflare Snippet that automatically selects the healthiest Steem RPC node, ensuring stable, low-latency JSON-RPC access. 

It has been deployed live to [https://api2.steemyy.com](https://api2.steemyy.com).

## Features
- Auto health-check and version validation
- CORS enabled
- Compatible with `fetch` API
- Instant failover using `Promise.any`

## Development
```bash
npm install
npm run dev
```

### Disable Cloudflare Web Access Firewall
You would need a Pro cloudflare account. Also you would need to disable WAF (Web Access Firewall)

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