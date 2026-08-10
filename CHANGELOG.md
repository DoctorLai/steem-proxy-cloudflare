# Changelog

All notable changes to this project are documented here. The project uses date-based versions in
`YYYY.M.D` format.

## Unreleased

## 2026.8.10 - 2026-08-10

### Added

- Reproducible Node.js 22 development and Wrangler build tooling.
- Enforced coverage thresholds for lines, statements, functions, and branches.
- Fork-safe pull request coverage reports and dynamic JavaScript percentage badge automation.
- Repository security, privacy, support, contribution, and pull request guidance.

### Changed

- Consolidated formatting, linting, tests, coverage, and build validation under `npm run check`.
- Updated Vitest and its coverage provider to version 4.

### Fixed

- Applied request timeouts to RPC health checks.
- Honored caller-provided abort signals and stopped mutating the configured node list.
- Aligned the advertised CORS methods with the methods accepted by the Worker.
- Removed the client IP response header and prevented shared caching of country-specific metadata.

## 1.0.0 - 2025-10-18

- Initial Cloudflare proxy implementation with RPC health checks and failover.
