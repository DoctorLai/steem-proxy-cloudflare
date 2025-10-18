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
You would need a Pro cloudflare account. Also you would need to disable WAF (Web Access Firewall) see this post [Bypassing WAF for API/RPC Node: api2.steemyy.com](https://steemit.com/blog/@justyy/bypassing-waf-for-api-rpc-node-api2-steemyy-com)

<img width="1227" height="818" alt="image" src="https://github.com/user-attachments/assets/ee4185c1-8907-4855-91a7-010c7fcf9bb9" />

## Testing
```bash
npm test
```

## Deploy
```bash
npm run deploy
```

## Sibling Projects
- [Steem Load Balancer](https://github.com/doctorlai/steem-load-balancer)

## License
[MIT](./LICENSE)

## Contribution
See [CONTRIBUTING](./CONTRIBUTING.md) and [CODE OF CONDUCT](./CODE_OF_CONDUCT.md)
