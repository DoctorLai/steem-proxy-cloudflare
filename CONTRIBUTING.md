# Contributing

Bug fixes, focused features, tests, and documentation improvements are welcome. By participating,
you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately as
described in [SECURITY.md](SECURITY.md).

## Getting Started

Node.js 22 and npm are required. Fork the repository, then set up your checkout:

```bash
git clone https://github.com/YOUR-USERNAME/steem-proxy-cloudflare.git
cd steem-proxy-cloudflare
nvm use
npm ci
```

## Making Changes

Create a focused branch from the latest `main`:

```bash
git switch -c fix/short-description
```

- Keep behavior changes small and preserve the public response contract unless the change is
  intentionally breaking.
- Add tests for success, failure, timeout, or parsing paths affected by the change.
- Do not include credentials, `.dev.vars`, private RPC payloads, generated coverage, or `dist/`.
- Update `README.md`, `docs/API.md`, and `CHANGELOG.md` when behavior or deployment changes.
- Use `npm run format:fix` and `npm run lint:fix` only for files relevant to your change.

Run the complete local gate before committing:

```bash
npm run check
```

For a narrower feedback loop, use `npm test`, `npm run test:watch`, `npm run lint`, or
`npm run coverage`. The coverage command enforces 80% thresholds for lines, statements, functions,
and branches.

## Submitting Your Contribution

Push the branch to your fork and open a pull request against `main`. Complete the pull request
template, explain user-visible changes, and list the checks you ran. CI executes `npm run check` and
posts a Vitest coverage report to the pull request.

Maintainers may request changes to behavior, tests, documentation, or commit scope. See
[SUPPORT.md](SUPPORT.md) for help with development or deployment questions.
