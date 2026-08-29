# Browser usage

The browser entry point is a small typed wrapper around the global `window.ym`
function created by the Yandex Metrica tag.

## Create a client

```ts
import {
  createMetrikaBrowserClient,
  parseMetrikaTagId,
} from "@svetlitskiy/yandex-metrika/browser";

const metrika = createMetrikaBrowserClient({
  tagId: () => parseMetrikaTagId(import.meta.env.PUBLIC_YANDEX_METRIKA_ID),
});
```

`tagId` accepts a positive integer, `null`, or a function returning either. A
function is useful when configuration becomes available after the module is
loaded.

The package deliberately does not inject `tag.js`. Use the installation snippet
or framework integration recommended by Yandex Metrica to initialize the tag.

## Goals and page hits

```ts
metrika.reachGoal("trial_started", {
  plan: "team",
  source: "pricing",
});

metrika.hit("https://example.com/account", {
  title: "Account",
  params: { section: "billing" },
});
```

The package does not register goals in the Metrica dashboard. Create the
corresponding JavaScript goal there before relying on it in reports.

## UserID and user parameters

```ts
metrika.setUserID("internal-user-123");
metrika.userParams({
  accountType: "business",
  plan: "team",
});
```

Avoid sending names, email addresses, access tokens, or other personal and
sensitive values as analytics parameters.

## Capture ClientID for server events

```ts
import { isMetrikaClientId } from "@svetlitskiy/yandex-metrika/browser";

metrika.getClientID((clientId) => {
  if (!isMetrikaClientId(clientId)) return;

  void fetch("/api/analytics/client-id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId }),
  });
});
```

The backend should authenticate the request, validate the ClientID again, and
store it according to the application's consent and retention rules. This
package intentionally does not prescribe cookies, headers, Redis keys, database
tables, or a user-to-device mapping strategy.

## SSR and Next.js

The module is safe to import during SSR because it does not read `window` at
module initialization. Calls become no-ops when `window.ym` is unavailable.

For Next.js, call analytics methods from client components or browser event
handlers. The package is precompiled and does not need to be listed in
`transpilePackages`.

```tsx
"use client";

import { createMetrikaBrowserClient } from "@svetlitskiy/yandex-metrika/browser";

const metrika = createMetrikaBrowserClient({ tagId: 12345678 });

export function SignupButton() {
  return (
    <button onClick={() => metrika.reachGoal("signup_clicked")}>
      Create account
    </button>
  );
}
```
