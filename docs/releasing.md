# Release process

Releases are published to npm from GitHub Actions with npm Trusted Publishing
and provenance.

## One-time setup

1. Confirm that the npm account or organization owns the `@svetlitskiy` scope.
2. Publish the first public version with two-factor authentication:

   ```bash
   npm ci
   npm run check
   npm publish --access public
   ```

3. In the npm package settings, add a GitHub Actions trusted publisher:
   - repository owner: `svetlitskiy`;
   - repository: `yandex-metrika`;
   - workflow: `publish.yml`;
   - allowed action: `npm publish`.
4. Require two-factor authentication and disallow token-based publishing after
   the trusted publisher has been verified.

The repository URL and workflow filename are case-sensitive in npm's trusted
publisher configuration.

## Publish a version

1. Update `version` in `package.json` and `package-lock.json`.
2. Move entries from the `Unreleased` section in `CHANGELOG.md` into a dated
   version section.
3. Open and merge a pull request with those changes.
4. Create a GitHub Release whose tag matches the package version, for example
   `v0.2.0`.
5. The `Publish` workflow runs the complete check suite and invokes
   `npm publish` through OIDC.
6. Verify the package page, provenance, exports, and README on npm.

Do not publish from an uncommitted or dirty working tree. Never add an npm write
token to repository secrets when Trusted Publishing is available.
