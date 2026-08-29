import {
  createMetrikaBrowserClient,
  parseMetrikaTagId,
} from "../src/browser/index";

const metrika = createMetrikaBrowserClient({
  tagId: () => parseMetrikaTagId(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID),
});

metrika.reachGoal("signup", { plan: "pro" });

// Attach the ClientID to an ordinary business request instead of calling a
// dedicated analytics endpoint. The object is empty when no ClientID is
// available, so spreading it is always safe.
const propagationHeaders = await metrika.getPropagationHeaders();

await fetch("https://api.example.net/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...propagationHeaders,
  },
  body: JSON.stringify({ plan: "pro" }),
});

// The raw value is available when the application stores it itself.
const clientId = await metrika.getClientID();
console.info("ClientID", clientId);
