# Release process

Releases are published to npm from GitHub Actions with npm Trusted Publishing
and provenance. Merging to `master` creates the next minor version, GitHub
Release, and npm publication automatically.

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
5. Add the `DEEPSEEK_API_KEY` repository secret used to write release notes.
   Optional: set the `DEEPSEEK_BASE_URL` repository variable if the API is not
   at `https://api.deepseek.com`. Without the key, the release still publishes
   and the changelog falls back to a placeholder summary.

The repository URL and workflow filename are case-sensitive in npm's trusted
publisher configuration.

If `master` is a protected branch, allow GitHub Actions to push version-bump
commits or the bump workflow will fail.

## Publish a version

1. Merge a pull request into `master`.
2. The `Bump Version` workflow:
   - increments the next free minor version (`0.1.0` → `0.2.0`);
   - updates `package.json`, `package-lock.json`, and `CHANGELOG.md`;
   - commits with `[skip ci]`, tags `vX.Y.0`, and creates a GitHub Release;
   - dispatches a `release-created` repository event.
3. The `Publish` workflow checks out that tag, runs the complete check suite,
   and invokes `npm publish` through OIDC.
4. Verify the package page, provenance, exports, and README on npm.

The first merge of this automated flow publishes **0.2.0**. Do not create
GitHub Releases or bump the version by hand. Never add an npm write token to
repository secrets when Trusted Publishing is available.
