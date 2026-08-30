# @a.svetlitskiy/yandex-metrika

[![npm version](https://img.shields.io/npm/v/@a.svetlitskiy/yandex-metrika.svg)](https://www.npmjs.com/package/@a.svetlitskiy/yandex-metrika)
[![CI](https://github.com/svetlitskiy/yandex-metrika/actions/workflows/ci.yml/badge.svg)](https://github.com/svetlitskiy/yandex-metrika/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@a.svetlitskiy/yandex-metrika.svg)](./LICENSE)

A small, framework-neutral TypeScript SDK for sending custom events to
[Yandex Metrica](https://metrica.yandex.com/) from both the browser and the
server.

Use the browser entry point for the standard `window.ym` API. Use the server
entry point for events that happen after the browser request: completed
payments, webhooks, background jobs, CRM updates, bots, or other server-side
workflows.

## Why this package exists

The Yandex Metrica browser API is convenient for UI interactions, but many
important conversions do not finish in a browser. Yandex Metrica's Measurement
Protocol can report those conversions from a server, but it has a different
HTTP API and requires careful handling of ClientID values and secret tokens.

This package provides one typed, dependency-free transport layer for both
environments while keeping application policy in your application:

- browser calls are SSR-safe and become no-ops until `window.ym` is available;
- server calls use the official Measurement Protocol collect endpoint;
- browser and server code are exposed through separate package entry points;
- the package does not depend on React, Next.js, Express, Fastify, or a database;
- the package never invents a ClientID or decides how long your application
  should store it.

Measurement Protocol supplements the regular Metrica tag; it is not a complete
replacement for it.

## Installation

```bash
npm install @a.svetlitskiy/yandex-metrika
```

The package ships ESM, CommonJS, and TypeScript declarations. It has no runtime
dependencies and supports Node.js 18.18 or newer.

## Package entry points

| Import                                | Purpose                                 |
| ------------------------------------- | --------------------------------------- |
| `@a.svetlitskiy/yandex-metrika/browser` | The `window.ym` browser client          |
| `@a.svetlitskiy/yandex-metrika/server`  | Server-side Measurement Protocol events |
| `@a.svetlitskiy/yandex-metrika`         | Shared helpers and types                |
| `@a.svetlitskiy/yandex-metrika/types`   | Explicit type-only imports              |

## Browser quick start

Loading and configuring the Yandex Metrica tag remains the host application's
responsibility. Once the tag has created `window.ym`, create a client:

```ts
import {
  createMetrikaBrowserClient,
  parseMetrikaTagId,
} from "@a.svetlitskiy/yandex-metrika/browser";

const metrika = createMetrikaBrowserClient({
  tagId: () => parseMetrikaTagId(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID),
});

metrika.reachGoal("signup", { plan: "pro" });
metrika.hit(window.location.href, { params: { section: "account" } });
metrika.setUserID("user-123");
metrika.userParams({ plan: "pro" });
```

Importing this module does not access `window`. Calls are safe during SSR and
become no-ops when the counter ID or `window.ym` is unavailable.

See [Browser usage](./docs/browser.md) for ClientID capture and framework notes.

## Server quick start

First enable Measurement Protocol in the counter's **Data security and usage**
settings and create a secret token. Never expose that token to browser code.

```ts
import { createMetrikaServerClient } from "@a.svetlitskiy/yandex-metrika/server";

const metrika = createMetrikaServerClient({
  counterId: process.env.YANDEX_METRIKA_COUNTER_ID,
  measurementToken: process.env.YANDEX_METRIKA_MEASUREMENT_TOKEN,
});

const result = await metrika.reachGoal({
  clientId: storedMetrikaClientId,
  name: "purchase",
  url: "https://example.com/checkout/success",
  params: { orderId: "order-123", plan: "pro" },
});

// "sent" | "skipped_unconfigured" | "skipped_no_client_id"
```

The method throws when a configured collect request fails. Missing credentials
and ClientID values return explicit skip results, making optional analytics easy
to integrate without masking transport failures.

See [Server usage](./docs/server.md) for new visits, event timestamps, injected
`fetch`, and error handling.

## Connecting browser and server events

Measurement Protocol uses the Metrica ClientID to associate a server event with
a visitor. How that value reaches the backend depends on where the backend runs,
so the package supports the three realistic cases without requiring a dedicated
analytics endpoint.

### Same domain: read it from the incoming request

When the backend shares a registrable domain with the site, the Metrica
`_ym_uid` cookie arrives with ordinary business requests:

```ts
import { getMetrikaClientIdFromRequest } from "@a.svetlitskiy/yandex-metrika/server";

const clientId = getMetrikaClientIdFromRequest(request);
```

The helper accepts a fetch `Request`, a Node.js `IncomingMessage`, or any object
with headers. `getMetrikaClientIdFromHeaders` and `getMetrikaClientIdFromCookie`
are available when only headers or only a cookie string are at hand.

### Different domains: propagate an explicit header

A browser does not send `example.com` cookies to `api.other-service.io`. Attach
the ClientID to the business request you already make:

```ts
await fetch("https://api.other-service.io/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(await metrika.getPropagationHeaders()),
  },
  body: JSON.stringify(order),
});
```

`getPropagationHeaders` resolves to `{ "X-Yandex-Metrika-Client-Id": "..." }`, or
to an empty object when no ClientID is available, so spreading it is always
safe. The server helpers read that header before falling back to the cookie.

The package never patches global `fetch` and never sends the ClientID anywhere
on its own. The application decides which requests carry the header.

### Delayed events: persist the ClientID

Payment webhooks, background jobs, and CRM updates run when no browser request
exists. Store the extracted value with the entity the later event belongs to:

```ts
order.metrikaClientId = getMetrikaClientIdFromRequest(request);

// later, from a webhook:
await metrika.reachGoal({
  clientId: order.metrikaClientId,
  name: "payment_completed",
  url: "https://example.com/orders/payment",
});
```

### Optional: a dedicated synchronization endpoint

A separate endpoint is still useful when the ClientID must be attached to a
signed-in user before any business request happens:

```ts
const clientId = await metrika.getClientID();
```

Send that value wherever your application needs it. This is one option, not the
required integration path.

Your application decides how the ClientID maps to a user, where it is stored,
when it expires, and whether analytics consent permits storing it. A propagated
ClientID is untrusted input; the helpers validate it with `isMetrikaClientId`,
and it must never be treated as authentication or authorization data.

## Starting a server-side visit

If an event cannot extend a recent browser visit, send a pageview immediately
before the goal:

```ts
await metrika.reachGoal({
  clientId: storedMetrikaClientId,
  name: "subscription_renewed",
  url: "https://example.com/_channel/background-job",
  pageview: {
    referrer: "https://example.com",
    title: "Background job",
  },
});
```

The pageview metadata is required because Yandex Metrica requires `dr`, `dl`,
and `dt` when creating a pageview. Measurement Protocol accepts events up to 12
hours in the past; use `eventTime` only within that window.

## What the package does not do

- It does not load or configure Yandex's browser tag.
- It does not store ClientID or UserID values.
- It does not manage consent, cookies, authentication, or user mapping.
- It does not retry failed requests or hide HTTP errors.
- It does not define goal names or application-specific event schemas.
- It does not send secret Measurement Protocol credentials from the browser.

These boundaries keep the package reusable and prevent analytics transport from
silently making product or privacy decisions.

## Security and privacy

- Import Measurement Protocol code only from the `/server` entry point.
- Keep `measurementToken` in a server-only secret store.
- Do not put personal data or secrets into goal parameters.
- Treat ClientID as user-associated analytics data and apply your consent and
  retention policy.
- Rotate the Measurement Protocol token if it is ever exposed.

Please report package vulnerabilities according to [SECURITY.md](./SECURITY.md).

## Documentation

- [Browser usage](./docs/browser.md)
- [Server and Measurement Protocol usage](./docs/server.md)
- [Contributing](./CONTRIBUTING.md)
- [Release process](./docs/releasing.md)

## License

[MIT](./LICENSE)
