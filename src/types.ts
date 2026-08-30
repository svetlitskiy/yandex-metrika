/** Custom parameters attached to a goal, hit, or visit. */
export type MetrikaParams = Record<string, unknown>;

export type MetrikaTagId = number | null;

/** Options passed to the browser `hit` method. */
export type MetrikaBrowserHitOptions = MetrikaParams;

/** Options for reading a ClientID from the browser tag. */
export type MetrikaClientIdOptions = {
  timeoutMs?: number;
};

/** Request headers that carry a ClientID to a backend. */
export type MetrikaPropagationHeaders = Record<string, string>;

/** A small, framework-neutral subset of the Yandex Metrica browser API. */
export type MetrikaBrowserClient = {
  reachGoal: (name: string, params?: MetrikaParams) => void;
  hit: (url: string, options?: MetrikaBrowserHitOptions) => void;
  setUserID: (userId: string) => void;
  userParams: (params: MetrikaParams) => void;
  getClientID: (options?: MetrikaClientIdOptions) => Promise<string | null>;
  getPropagationHeaders: (
    options?: MetrikaClientIdOptions,
  ) => Promise<MetrikaPropagationHeaders>;
};

/**
 * Incoming request headers in either supported shape: the WHATWG `Headers`
 * interface or a plain Node.js header record.
 */
export type MetrikaHeadersLike =
  | { get: (name: string) => string | null | undefined }
  | Record<string, string | string[] | null | undefined>;

/** Anything carrying incoming request headers, such as `Request`. */
export type MetrikaRequestLike = {
  headers: MetrikaHeadersLike;
};

/** Overrides for the header and cookie names used during ClientID lookup. */
export type MetrikaClientIdLookupOptions = {
  headerName?: string;
  cookieName?: string;
};

/** Raw fields accepted by the supported Measurement Protocol transport. */
export type MetrikaCollectHit = {
  tid: string;
  cid: string;
  ms: string;
  t: "pageview" | "event";
  dl: string;
  et?: number;
  ea?: string;
  dr?: string;
  dt?: string;
  params?: MetrikaParams;
};

export type MetrikaServerGoalResult =
  "sent" | "skipped_unconfigured" | "skipped_no_client_id";

export type MetrikaServerConfig = {
  counterId: string;
  measurementToken: string;
};

/** Required metadata for starting a new server-side visit. */
export type MetrikaPageviewOptions = {
  referrer: string;
  title: string;
};

/** A fetch-compatible function accepted by the server transport. */
export type MetrikaFetch = (
  input: URL,
  init: {
    method: string;
    headers: Record<string, string>;
    body: URLSearchParams;
    signal: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number }>;

export type MetrikaReachGoalInput = {
  counterId?: string | number | null;
  measurementToken?: string | null;
  clientId: string | null | undefined;
  name: string;
  url: string;
  params?: MetrikaParams;
  pageview?: MetrikaPageviewOptions;
  fetch?: MetrikaFetch;
  timeoutMs?: number;
  eventTime?: Date | number;
};

export type CreateMetrikaServerClientOptions = {
  counterId?: string | number | null;
  measurementToken?: string | null;
  fetch?: MetrikaFetch;
  timeoutMs?: number;
};

export type MetrikaServerClient = {
  reachGoal: (
    input: Omit<
      MetrikaReachGoalInput,
      "counterId" | "measurementToken" | "fetch" | "timeoutMs"
    >,
  ) => Promise<MetrikaServerGoalResult>;
};
