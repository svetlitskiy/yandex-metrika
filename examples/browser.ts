import {
  createMetrikaBrowserClient,
  isMetrikaClientId,
  parseMetrikaTagId,
} from "../src/browser/index";

const metrika = createMetrikaBrowserClient({
  tagId: () => parseMetrikaTagId(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID),
});

metrika.reachGoal("signup", { plan: "pro" });

metrika.getClientID((clientId) => {
  if (!isMetrikaClientId(clientId)) return;
  console.info("Store this ClientID in your backend", clientId);
});
