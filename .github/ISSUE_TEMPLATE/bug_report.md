---
name: Bug report
about: Report reproducible proxy or deployment behavior
title: "[Bug]: "
labels: bug
assignees: ""
---

## Description

Describe what happened and what you expected instead.

## Reproduction

Provide the smallest request that reproduces the problem. Redact credentials and private RPC
payload data.

```bash
curl ...
```

## Response

Include the HTTP status, response body, and relevant headers such as `X-Origin-Server` and
`X-Serverless-Version`.

## Environment

- Endpoint or Worker deployment:
- Request method:
- Node.js version, if reproduced locally:
- Commit or serverless version:

## Additional Context

Add logs or other details that may help diagnose the issue. Do not include secrets or personal data.
