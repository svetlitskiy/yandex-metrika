# Contributing

Thank you for helping improve `@svetlitskiy/yandex-metrika`.

## Development

Requirements:

- Node.js 18.18 or newer;
- npm 9 or newer.

Install dependencies and run the complete validation suite:

```bash
npm ci
npm run check
```

Useful commands:

```bash
npm test
npm run test:watch
npm run typecheck
npm run build
npm run format
```

## Pull requests

- Keep browser and server code isolated in their respective entry points.
- Do not introduce framework-specific behavior into the core package.
- Add tests for behavior and public exports.
- Update the English documentation when the public API changes.
- Do not edit `CHANGELOG.md` or the package version in a pull request. Merging
  to `master` bumps the next minor version and generates the changelog.
- Do not include real counter IDs, ClientID values, Measurement Protocol tokens,
  or user data in fixtures.

## Design principles

The package is a transport layer. Goal taxonomies, retries, persistence,
authentication, consent, and user-to-ClientID mapping belong to host
applications unless a broadly reusable API can be designed without imposing
product policy.
