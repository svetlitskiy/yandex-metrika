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

## Send ClientID to your backend

Server-side Measurement Protocol events need the Metrica ClientID. Instead of
calling a dedicated analytics endpoint, attach it to a request the application
already makes:

```ts
const response = await fetch("https://api.example.net/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(await metrika.getPropagationHeaders()),
  },
  body: JSON.stringify(order),
});
```

`getPropagationHeaders` resolves to `{ "X-Yandex-Metrika-Client-Id": "..." }` when
a ClientID is available and to an empty object otherwise, so spreading it never
breaks a request. The header name is exported as `METRIKA_CLIENT_ID_HEADER`, and
the `/server` entry point reads it with `getMetrikaClientIdFromRequest`.

When the backend shares a registrable domain with the site, no header is needed
at all: the backend can read the `_ym_uid` cookie from the incoming request.

The package never patches global `fetch` and never sends the ClientID to an
origin by itself. Choose the requests that carry the header.

## Read the ClientID directly

```ts
const clientId = await metrika.getClientID();

if (clientId) {
  // Store it, or send it wherever the application needs it.
}
```

`getClientID` resolves to `null` rather than hanging when the counter ID is
missing, `window.ym` is unavailable, the tag is blocked, or the reported value
does not pass `isMetrikaClientId`. It waits two seconds by default; pass
`{ timeoutMs }` to change that. It never rejects.

The backend should validate the ClientID again and store it according to the
application's consent and retention rules. This package intentionally does not
prescribe cookies, Redis keys, database tables, or a user-to-device mapping
strategy.

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
