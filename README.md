# Steem Proxy for Cloudflare

[![CI](https://github.com/DoctorLai/steem-proxy-cloudflare/actions/workflows/ci.yaml/badge.svg)](https://github.com/DoctorLai/steem-proxy-cloudflare/actions/workflows/ci.yaml)
[![Last commit](https://img.shields.io/github/last-commit/DoctorLai/steem-proxy-cloudflare)](https://github.com/DoctorLai/steem-proxy-cloudflare/commits/main)
[![License](https://img.shields.io/github/license/DoctorLai/steem-proxy-cloudflare)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/DoctorLai/steem-proxy-cloudflare)](https://github.com/DoctorLai/steem-proxy-cloudflare/stargazers)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-F7B93E?logo=prettier)](https://prettier.io/)
[![Commit activity](https://img.shields.io/github/commit-activity/m/DoctorLai/steem-proxy-cloudflare)](https://github.com/DoctorLai/steem-proxy-cloudflare/graphs/commit-activity)
[![Watchers](https://img.shields.io/github/watchers/DoctorLai/steem-proxy-cloudflare)](https://github.com/DoctorLai/steem-proxy-cloudflare/watchers)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)
[![JavaScript percentage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FDoctorLai%2Fsteem-proxy-cloudflare%2Fbadges%2Fjavascript.json)](.github/workflows/update-badges.yaml)
[![Repository size](https://img.shields.io/github/repo-size/DoctorLai/steem-proxy-cloudflare)](https://github.com/DoctorLai/steem-proxy-cloudflare)
[![Top language](https://img.shields.io/github/languages/top/DoctorLai/steem-proxy-cloudflare)](https://github.com/DoctorLai/steem-proxy-cloudflare)
[![Open pull requests](https://img.shields.io/github/issues-pr/DoctorLai/steem-proxy-cloudflare)](https://github.com/DoctorLai/steem-proxy-cloudflare/pulls)
[![Forks](https://img.shields.io/github/forks/DoctorLai/steem-proxy-cloudflare)](https://github.com/DoctorLai/steem-proxy-cloudflare/forks)
[![Open issues](https://img.shields.io/github/issues/DoctorLai/steem-proxy-cloudflare)](https://github.com/DoctorLai/steem-proxy-cloudflare/issues)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-5FA04E?logo=nodedotjs&logoColor=white)](.nvmrc)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/DoctorLai/steem-proxy-cloudflare)

A stateless Cloudflare Worker and Snippet-compatible proxy that selects a healthy Steem RPC node
before forwarding each JSON-RPC request. A public instance is available at
[api2.steemyy.com](https://api2.steemyy.com).

## Features

- Sequential node health checks with minimum-version validation
- Efficient failover that minimizes Cloudflare Snippet subrequests
- Five-second deadlines and abort-signal support for upstream requests
- CORS support for `GET`, `POST`, and preflight requests
- Upstream status preservation with origin and version metadata
- No application database, cookies, or client-side storage

## Cloudflare Plan Requirements

The Snippet deployment requires a Cloudflare Pro plan or higher because it needs at least two
subrequests: one node version check and one forwarded request. Worker deployments use the limits of
their configured Workers plan.

## Quick Start

Node.js 22 and npm are required.

```bash
nvm use
npm ci
npm run dev
```

Wrangler prints the local URL. Send a Steem JSON-RPC request to that endpoint:

```bash
curl --request POST http://localhost:8787 \
	--header "Content-Type: application/json" \
	--data '{"jsonrpc":"2.0","method":"condenser_api.get_dynamic_global_properties","params":[],"id":1}'
```

See the [API reference](docs/API.md) for response metadata and error behavior.

## Commands

| Command              | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Start the local Wrangler development server.         |
| `npm run test`       | Run the Vitest suite once.                           |
| `npm run test:watch` | Run tests in watch mode.                             |
| `npm run coverage`   | Run tests and enforce all 80% coverage thresholds.   |
| `npm run lint`       | Check JavaScript with ESLint.                        |
| `npm run lint:fix`   | Apply safe ESLint fixes.                             |
| `npm run format`     | Check repository formatting with Prettier.           |
| `npm run format:fix` | Format supported repository files.                   |
| `npm run build`      | Create a Wrangler dry-run bundle in `dist/`.         |
| `npm run check`      | Run formatting, linting, coverage, and build checks. |
| `npm run deploy`     | Deploy the Worker using Wrangler.                    |

`npm run coverage` produces the JSON and HTML reports used by CI. Pull requests receive a coverage
summary comment, including file coverage, from the Vitest Coverage Report Action.

## Configuration

Runtime settings live in [`CONFIG`](src/index.js):

| Setting             | Default                                       |
| ------------------- | --------------------------------------------- |
| Minimum RPC version | `0.23.0`                                      |
| Candidate nodes     | `api.justyy.com`, `api.steemit.com`           |
| Upstream timeout    | 5 seconds                                     |
| Proxy version       | Date string exposed as `X-Serverless-Version` |

Test configuration changes locally before deploying them. Adding an upstream gives that operator
access to forwarded RPC payloads.

## Deployment

### Cloudflare Worker

Authenticate Wrangler, review [`wrangler.toml`](wrangler.toml), and deploy:

```bash
npx wrangler login
npm run build
npm run deploy
```

This repository does not publish a static site or deploy GitHub Pages.

### Cloudflare Snippet

The source is also compatible with a Cloudflare Snippet. Copy [`src/index.js`](src/index.js) into a
Snippet, create a proxied DNS record for the target host, and configure a matching rule such as
`(http.host eq "api2.steemyy.com")`. The public deployment points its placeholder DNS record to the
reserved address `192.0.2.1`.

<img width="1149" height="122" alt="Cloudflare placeholder DNS record" src="https://github.com/user-attachments/assets/0d0fe9f9-f23d-480a-8149-ade6618fa694" />

Depending on the zone configuration, WAF rules can reject API payloads before the Snippet runs. See
[Bypassing WAF for API/RPC Node: api2.steemyy.com](https://steemit.com/blog/@justyy/bypassing-waf-for-api-rpc-node-api2-steemyy-com)
for the public instance configuration.

<img width="1227" height="818" alt="Cloudflare WAF configuration" src="https://github.com/user-attachments/assets/ee4185c1-8907-4855-91a7-010c7fcf9bb9" />

<img width="570" height="438" alt="Cloudflare Snippet rule" src="https://github.com/user-attachments/assets/21d2d210-a2c3-4896-b4a5-907a38e839c3" />

## Documentation

- [API reference](docs/API.md)
- [Changelog](CHANGELOG.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Privacy notice](PRIVACY.md)
- [Support guide](SUPPORT.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## Sibling Projects

- [Steem Load Balancer](https://github.com/doctorlai/steem-load-balancer)

## License

[MIT](LICENSE)

## Support the Project

Project support is optional. You can:

- [Buy me a coffee](https://buymeacoffee.com/y0btg5r)
- [Sponsor me](https://github.com/sponsors/DoctorLai)
- [Vote me as a witness](https://steemyy.com/witness-voting/?witness=justyy&action=approve)
- [Set `justyy` as a witness proxy](https://steemyy.com/witness-voting/?witness=justyy&action=proxy)

<a rel="nofollow" href="https://buymeacoffee.com/y0btg5r" target="_blank"><img src="https://user-images.githubusercontent.com/1764434/161362754-c45a85d3-5c80-4e10-b05c-62af49291d0b.png" alt="Buy me a Coffee"/></a>
