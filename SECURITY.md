# Security Policy

## Supported Versions

Security fixes are applied to the latest code on `main`. Older commits and third-party deployments
are not maintained by this project.

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability. Use
[GitHub private vulnerability reporting](https://github.com/DoctorLai/steem-proxy-cloudflare/security/advisories/new)
and include:

- The affected endpoint, version, or commit.
- Reproduction steps and impact.
- Any suggested mitigation, if known.

Remove credentials, private keys, access tokens, personal data, and sensitive RPC payloads from the
report. Reports are reviewed on a best-effort basis. A maintainer will coordinate disclosure and a
fix when the report is confirmed.

For dependency vulnerabilities without a project-specific exploit, include the advisory identifier
and the dependency path reported by `npm audit`.
