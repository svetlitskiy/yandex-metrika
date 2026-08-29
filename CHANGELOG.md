# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `getMetrikaClientIdFromCookie`, `getMetrikaClientIdFromHeaders`, and
  `getMetrikaClientIdFromRequest` on the server entry point for reading a
  ClientID from an incoming request, with the propagation header taking
  precedence over the `_ym_uid` cookie.
- `getPropagationHeaders` on the browser client for attaching the ClientID to an
  existing business request instead of a dedicated analytics endpoint.
- `METRIKA_CLIENT_ID_HEADER`, `METRIKA_CLIENT_ID_COOKIE`, and
  `METRIKA_CLIENT_ID_TIMEOUT_MS` constants.

### Changed

- **BREAKING**: the browser `getClientID` is now Promise-based and resolves to
  `string | null`. The callback form was removed. It resolves to `null`, instead
  of waiting indefinitely, when the counter ID or tag is unavailable, when the
  reported value is invalid, or after the timeout.
- Documentation leads with same-domain, cross-domain, and delayed-event
  integration instead of a dedicated `/api/analytics/client-id` endpoint.

## [0.1.0] - 2026-08-29

### Added

- SSR-safe browser client for goals, hits, UserID, user parameters, and ClientID.
- Framework-neutral server client for Yandex Metrica Measurement Protocol goals.
- Optional pageview delivery before server-side goals.
- ESM, CommonJS, and TypeScript package exports.
- Package validation, CI, Trusted Publishing workflow, and English documentation.

[Unreleased]: https://github.com/svetlitskiy/yandex-metrika/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/svetlitskiy/yandex-metrika/releases/tag/v0.1.0
