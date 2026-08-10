# Privacy Notice

Last updated: 2026-08-10

This repository contains stateless proxy software. The source code does not use cookies, browser
storage, a database, or an application analytics service.

## Data Processed

A deployed instance receives the request body and standard network information needed to serve an
HTTP request, including the client IP address and Cloudflare-provided country code. The Worker:

- Forwards the request payload to one configured Steem RPC node.
- Returns the country code and selected node as response metadata.
- Marks country-specific responses as private to prevent shared caching.
- Does not persist request data in application code.

Cloudflare and the selected upstream RPC operator may process or retain request and network data
under their own policies. A deployment operator may also enable platform logging outside this
repository. Do not send secrets or sensitive personal data through a public proxy.

This notice describes the public instance linked from [README.md](README.md) and the behavior of the
included source code. Independent deployments are controlled by their operators.

Questions can be raised through the channels in [SUPPORT.md](SUPPORT.md). Security concerns should
be reported privately under [SECURITY.md](SECURITY.md).
