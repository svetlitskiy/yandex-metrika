# Server and Measurement Protocol usage

The server entry point sends custom goals to the official Yandex Metrica
Measurement Protocol endpoint. It contains no browser or framework code.

## Prerequisites

1. Install and configure the regular Yandex Metrica tag on your website.
2. Enable Measurement Protocol in the counter's **Data security and usage**
   settings.
3. Generate a Measurement Protocol token.
4. Make the Metrica ClientID available on the server: read it from the incoming
   request, or store it with the entity a later event belongs to.

The token is a secret and must never be included in a public environment
variable, browser bundle, log, or API response.

## Create a reusable client

```ts
import { createMetrikaServerClient } from "@a.svetlitskiy/yandex-metrika/server";

const metrika = createMetrikaServerClient({
  counterId: process.env.YANDEX_METRIKA_COUNTER_ID,
  measurementToken: process.env.YANDEX_METRIKA_MEASUREMENT_TOKEN,
  timeoutMs: 5_000,
});
```

Missing or empty configuration does not throw when the client is created. A
goal returns `skipped_unconfigured`, which is useful for environments where
analytics is intentionally disabled.

## Read ClientID from an incoming request

Measurement Protocol needs the ClientID of the browser visitor. Three helpers
extract it from request data, and all of them validate the result with
`isMetrikaClientId` before returning it:

```ts
import {
  getMetrikaClientIdFromCookie,
  getMetrikaClientIdFromHeaders,
  getMetrikaClientIdFromRequest,
} from "@a.svetlitskiy/yandex-metrika/server";

getMetrikaClientIdFromRequest(request); // Request, IncomingMessage, { headers }
getMetrikaClientIdFromHeaders(request.headers); // Headers or a header record
getMetrikaClientIdFromCookie(request.headers.cookie); // a raw Cookie header
```

The lookup checks the `X-Yandex-Metrika-Client-Id` header first and falls back
to the `_ym_uid` cookie. Both names are exported as `METRIKA_CLIENT_ID_HEADER`
and `METRIKA_CLIENT_ID_COOKIE`, and both can be overridden:

```ts
getMetrikaClientIdFromHeaders(headers, {
  headerName: "X-App-Client-Id",
  cookieName: "app_cid",
});
```

Every helper returns `string | null` and never throws, so an unusable request
degrades to `skipped_no_client_id` instead of failing a business operation.

The helpers accept both the WHATWG `Headers` interface and plain Node.js header
records, which covers Express, Fastify, Next.js route handlers, Hono, and
workers without a framework-specific dependency.

### Which source applies

| Deployment                             | Source                              |
| -------------------------------------- | ----------------------------------- |
| Backend on the same registrable domain | `_ym_uid` cookie                    |
| Backend on a different domain          | Propagation header from the browser |
| Webhook, background job, or CRM update | A ClientID stored earlier           |

The cookie is best effort: it is missing on an unrelated API domain, when the
visitor blocks cookies, and when the tag has not run yet. Explicit propagation
with `getPropagationHeaders` in the browser is the reliable path when the
backend does not share the site's domain.

### Untrusted input

A propagated ClientID comes from the browser and can be forged. Validation only
guarantees the shape of the value. Never use a ClientID for authentication,
authorization, or as a lookup key that grants access to another user's data.

## Send a goal

```ts
const result = await metrika.reachGoal({
  clientId: storedClientId,
  name: "payment_succeeded",
  url: "https://example.com/checkout/success",
  params: {
    plan: "team",
    billingPeriod: "year",
  },
});
```

Possible results:

| Result                 | Meaning                                             |
| ---------------------- | --------------------------------------------------- |
| `sent`                 | The collect endpoint accepted the request           |
| `skipped_unconfigured` | Counter ID or Measurement Protocol token is missing |
| `skipped_no_client_id` | ClientID is missing or invalid                      |

Configured HTTP failures and timeouts throw. Decide in the host application
whether to log, report, retry, or ignore those failures. Analytics should not
usually make a business transaction fail.

```ts
try {
  await metrika.reachGoal(event);
} catch (error) {
  logger.warn({ error }, "Could not send Yandex Metrica goal");
}
```

## Event time

Pass a `Date` or Unix timestamp in milliseconds when reporting a recent event
after it happened:

```ts
await metrika.reachGoal({
  clientId,
  name: "payment_succeeded",
  url: "https://example.com/checkout/success",
  eventTime: payment.completedAt,
});
```

Yandex Metrica accepts events up to 12 hours in the past. When `eventTime` is
omitted, the collect endpoint uses the delivery time.

## Start a new visit

To create a new server-side visit, send a pageview before the event:

```ts
import {
  createMetrikaServerClient,
  metrikaChannelPageUrl,
} from "@a.svetlitskiy/yandex-metrika/server";

await metrika.reachGoal({
  clientId,
  name: "contract_signed",
  url: metrikaChannelPageUrl("https://example.com", "crm"),
  pageview: {
    referrer: "https://example.com",
    title: "CRM",
  },
  params: { channel: "crm" },
});
```

When `pageview` is present, the package awaits a successful pageview collect
request and then sends the goal. Yandex requires a referrer, page URL, and title
for pageviews, so `referrer` and `title` are required by the TypeScript API.

## One-off calls

The standalone `reachGoal` function accepts the same values without creating a
client:

```ts
import { reachGoal } from "@a.svetlitskiy/yandex-metrika/server";

await reachGoal({
  counterId: "12345678",
  measurementToken: process.env.YANDEX_METRIKA_MEASUREMENT_TOKEN,
  clientId,
  name: "lead_qualified",
  url: "https://example.com/leads/qualified",
});
```

## Inject fetch

Node.js 18 and newer provides a global `fetch`. Inject a compatible function for
tests or custom transports:

```ts
const metrika = createMetrikaServerClient({
  counterId: "12345678",
  measurementToken: "test-token",
  fetch: async () => ({ ok: true, status: 200 }),
});
```

## Low-level protocol helpers

`buildMetrikaCollectUrl` and `postMetrikaCollect` are available for advanced
use cases. Their hit shape uses the official protocol parameter names such as
`tid`, `cid`, `ms`, `dl`, and `ea`. Prefer the high-level client for ordinary
goal delivery.

The current package covers pageviews, JavaScript goals, and visit parameters.
It does not yet provide a high-level e-commerce event builder.

## Official references

- [Measurement Protocol overview](https://yandex.com/support/metrica/en/general/measurement-protocol)
- [Supported parameters and examples](https://yandex.com/dev/metrika/en/data-import/measurement-upload)
