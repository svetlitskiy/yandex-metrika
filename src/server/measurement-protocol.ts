import { METRIKA_COLLECT_ORIGIN } from "../shared";
import type { MetrikaCollectHit } from "../types";

/** Builds a synthetic page URL for a non-browser channel. */
export function metrikaChannelPageUrl(
  applicationUrl: string,
  channel: string,
): string {
  const base = applicationUrl.replace(/\/+$/, "");
  return `${base}/_channel/${encodeURIComponent(channel)}`;
}

/** Builds a Yandex Metrica Measurement Protocol collect URL. */
export function buildMetrikaCollectUrl(hit: MetrikaCollectHit): string {
  const url = new URL(METRIKA_COLLECT_ORIGIN);
  url.searchParams.set("tid", hit.tid);
  url.searchParams.set("cid", hit.cid);
  url.searchParams.set("t", hit.t);
  url.searchParams.set("ms", hit.ms);
  url.searchParams.set("dl", hit.dl);
  if (hit.et !== undefined) url.searchParams.set("et", String(hit.et));

  if (hit.t === "pageview") {
    if (hit.dr) url.searchParams.set("dr", hit.dr);
    if (hit.dt) url.searchParams.set("dt", hit.dt);
  }

  if (hit.t === "event" && hit.ea) {
    url.searchParams.set("ea", hit.ea);
  }

  if (hit.params) {
    url.searchParams.set("params", JSON.stringify(hit.params));
  }

  return url.toString();
}
