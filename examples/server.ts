import {
  createMetrikaServerClient,
  getMetrikaClientIdFromRequest,
} from "../src/server/index";

const metrika = createMetrikaServerClient({
  counterId: process.env.YANDEX_METRIKA_COUNTER_ID,
  measurementToken: process.env.YANDEX_METRIKA_MEASUREMENT_TOKEN,
});

// A framework-neutral request handler: the ClientID arrives either in the
// propagation header or in the `_ym_uid` cookie of the incoming request.
export async function handleOrderCreated(request: Request): Promise<Response> {
  const clientId = getMetrikaClientIdFromRequest(request);

  // Persist `clientId` with the order so delayed events, such as a payment
  // webhook, can report the same visitor later.
  const result = await metrika.reachGoal({
    clientId,
    name: "order_created",
    url: request.url,
    params: { plan: "pro" },
  });

  console.info(result);
  return Response.json({ ok: true });
}
