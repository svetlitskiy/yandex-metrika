# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v0.4.0 (2026-09-27)

### Summary

- Fixed server-side transport failing on Cloudflare Workers with an "Illegal invocation" error.
- The default global fetch is now bound to globalThis before sending collect requests.
- Explicitly provided fetch implementations are unaffected and continue to work as before.
- Missing fetch errors are now preserved instead of being masked by a generic binding error.
- Added a regression test that fails if the default fetch is called unbound.
- Test coverage for the server client increased with new binding-related cases.
- No changes to browser transport or public API in this release.

### Areas changed

- Server: 1
- Tests: 1

Links: https://github.com/svetlitskiy/yandex-metrika/compare/v0.3.0...v0.4.0

## v0.3.0 (2026-08-30)

### Summary

- Package is now published under the `@a.svetlitskiy` npm scope.
- Install and import examples updated to use `@a.svetlitskiy/yandex-metrika`.
- Fixed README table alignment for the new package name.
- Documentation for browser and server usage updated to match the new scope.
- Releasing and contributing guides now reference the correct npm scope.
- CI workflow updated to reflect the new package name and publish prerequisites.
- No changes to browser or server SDK behavior; this release is purely packaging and documentation.

### Areas changed

- Docs: 4
- Other: 3
- CI: 1

Links: https://github.com/svetlitskiy/yandex-metrika/compare/v0.2.0...v0.3.0

## v0.2.0 (2026-08-30)

### Summary

- Initial public release of a framework-neutral TypeScript SDK for Yandex Metrica browser goals and server-side Measurement Protocol events.
- Ships ESM, CommonJS, and TypeScript declarations through isolated package entry points.
- Adds server helpers to read a Yandex Metrica ClientID from incoming requests, preferring the `X-Yandex-Metrika-Client-Id` header and falling back to the `_ym_uid` cookie.
- Adds a browser helper that attaches the ClientID to an existing business request, removing the need for a dedicated `/api/analytics/client-id` endpoint.
- Introduces `getPropagationHeaders` for easy server-side header propagation when a ClientID is available.
- Breaking change: browser `getClientID` is now Promise-based and resolves to `string | null`; the callback form was removed, and it resolves to `null` instead of waiting indefinitely on missing counters, invalid values, or timeouts.
- Adds complete English documentation, practical examples, security guidance, and release instructions.
- Includes tests, package artifact validation, and an automated npm publication via Trusted Publishing.

### Areas changed

- Other: 14
- Server: 4
- Docs: 4
- Shared: 3
- Tests: 3
- CI: 3
- Browser: 1

Links: https://github.com/svetlitskiy/yandex-metrika/compare/d2b883df8cab0fe7cd05404980fe7db94e057fe0...v0.2.0

## [0.1.0] - 2026-08-29

### Added

- SSR-safe browser client for goals, hits, UserID, user parameters, and ClientID.
- Framework-neutral server client for Yandex Metrica Measurement Protocol goals.
- Optional pageview delivery before server-side goals.
- ESM, CommonJS, and TypeScript package exports.
- Package validation, CI, Trusted Publishing workflow, and English documentation.

[0.1.0]: https://github.com/svetlitskiy/yandex-metrika/releases/tag/v0.1.0
