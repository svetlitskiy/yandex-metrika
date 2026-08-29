import { METRIKA_COLLECT_TIMEOUT_MS, isMetrikaClientId } from "../shared";
import type {
  CreateMetrikaServerClientOptions,
  MetrikaCollectHit,
  MetrikaFetch,
  MetrikaReachGoalInput,
  MetrikaServerClient,
  MetrikaServerConfig,
  MetrikaServerGoalResult,
} from "../types";
import { buildMetrikaCollectUrl } from "./measurement-protocol";

/** Parses public server configuration without throwing on missing env values. */
export function parseMetrikaServerConfig(input: {
  counterId?: string | number | null;
  measurementToken?: string | null;
}): MetrikaServerConfig | null {
  const counterId = String(input.counterId ?? "").trim();
  const measurementToken = input.measurementToken?.trim();
  if (!/^\d+$/.test(counterId) || !measurementToken) return null;
  return { counterId, measurementToken };
}

/** Sends one raw Measurement Protocol hit. */
export async function postMetrikaCollect(input: {
  hit: MetrikaCollectHit;
  fetch?: MetrikaFetch;
  timeoutMs?: number;
}): Promise<void> {
  const collectUrl = new URL(buildMetrikaCollectUrl(input.hit));
  const body = new URLSearchParams(collectUrl.searchParams);
  collectUrl.search = "";

  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("fetch is not available");

  const response = await fetchImpl(collectUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
    signal: AbortSignal.timeout(input.timeoutMs ?? METRIKA_COLLECT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `Yandex Metrica collect request failed with HTTP ${response.status}`,
    );
  }
}

function eventTimestamp(value: Date | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const milliseconds = value instanceof Date ? value.getTime() : value;
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(
      "eventTime must be a valid Date or Unix timestamp in milliseconds",
    );
  }
  return Math.floor(milliseconds / 1_000);
}

/** Sends a goal through the Yandex Metrica Measurement Protocol. */
export async function reachGoal(
  input: MetrikaReachGoalInput,
): Promise<MetrikaServerGoalResult> {
  const configured = parseMetrikaServerConfig(input);
  if (!configured) return "skipped_unconfigured";
  if (!input.clientId || !isMetrikaClientId(input.clientId)) {
    return "skipped_no_client_id";
  }

  const et = eventTimestamp(input.eventTime);
  const transport = { fetch: input.fetch, timeoutMs: input.timeoutMs };
  const baseHit = {
    tid: configured.counterId,
    cid: input.clientId,
    ms: configured.measurementToken,
    dl: input.url,
    et,
  };

  if (input.pageview) {
    await postMetrikaCollect({
      ...transport,
      hit: {
        ...baseHit,
        t: "pageview",
        dr: input.pageview.referrer,
        dt: input.pageview.title,
      },
    });
  }

  await postMetrikaCollect({
    ...transport,
    hit: {
      ...baseHit,
      t: "event",
      ea: input.name,
      params: input.params,
    },
  });

  return "sent";
}

/** Creates a server client with counter credentials bound once. */
export function createMetrikaServerClient(
  options: CreateMetrikaServerClientOptions,
): MetrikaServerClient {
  return {
    reachGoal(input) {
      return reachGoal({
        ...input,
        counterId: options.counterId,
        measurementToken: options.measurementToken,
        fetch: options.fetch,
        timeoutMs: options.timeoutMs,
      });
    },
  };
}
