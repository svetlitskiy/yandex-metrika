# Server and Measurement Protocol usage

The server entry point sends custom goals to the official Yandex Metrica
Measurement Protocol endpoint. It contains no browser or framework code.

## Prerequisites

1. Install and configure the regular Yandex Metrica tag on your website.
2. Enable Measurement Protocol in the counter's **Data security and usage**
   settings.
3. Generate a Measurement Protocol token.
4. Capture Metrica ClientID values during browser visits and store them in your
   own backend.

The token is a secret and must never be included in a public environment
variable, browser bundle, log, or API response.

## Create a reusable client

```ts
import { createMetrikaServerClient } from "@svetlitskiy/yandex-metrika/server";

const metrika = createMetrikaServerClient({
  counterId: process.env.YANDEX_METRIKA_COUNTER_ID,
  measurementToken: process.env.YANDEX_METRIKA_MEASUREMENT_TOKEN,
  timeoutMs: 5_000,
});
```

Missing or empty configuration does not throw when the client is created. A
goal returns `skipped_unconfigured`, which is useful for environments where
analytics is intentionally disabled.

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
} from "@svetlitskiy/yandex-metrika/server";

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
import { reachGoal } from "@svetlitskiy/yandex-metrika/server";

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
