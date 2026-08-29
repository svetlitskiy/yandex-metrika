import { createMetrikaServerClient } from "../src/server/index";

const metrika = createMetrikaServerClient({
  counterId: process.env.YANDEX_METRIKA_COUNTER_ID,
  measurementToken: process.env.YANDEX_METRIKA_MEASUREMENT_TOKEN,
});

const result = await metrika.reachGoal({
  clientId: process.env.YANDEX_METRIKA_CLIENT_ID,
  name: "purchase",
  url: "https://example.com/checkout/success",
  params: { plan: "pro" },
});

console.info(result);
