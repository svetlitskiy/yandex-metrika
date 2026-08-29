import {
  METRIKA_CLIENT_ID_PATTERN,
  isMetrikaClientId,
  parseMetrikaTagId,
} from "../shared";
import type {
  MetrikaBrowserClient,
  MetrikaBrowserHitOptions,
  MetrikaParams,
} from "../types";

export { METRIKA_CLIENT_ID_PATTERN, isMetrikaClientId, parseMetrikaTagId };
export type { MetrikaBrowserClient, MetrikaBrowserHitOptions, MetrikaParams };

export type YmFunction = (
  id: number,
  method: string,
  ...args: unknown[]
) => void;

export type MetrikaTagIdInput = number | null | (() => number | null);

export type CreateMetrikaBrowserClientOptions = {
  tagId: MetrikaTagIdInput;
};

function getYm(): YmFunction | null {
  if (!("window" in globalThis)) return null;
  const maybeWindow = globalThis.window as unknown;
  if (!maybeWindow || typeof maybeWindow !== "object") return null;
  if (!("ym" in maybeWindow)) return null;
  return typeof maybeWindow.ym === "function"
    ? (maybeWindow.ym as YmFunction)
    : null;
}

function resolveTagId(tagId: MetrikaTagIdInput): number | null {
  return typeof tagId === "function" ? tagId() : tagId;
}

/**
 * Creates a browser client backed by the global `window.ym` function.
 *
 * Importing and calling the client is safe during SSR. Calls become no-ops
 * until both a valid counter ID and `window.ym` are available.
 */
export function createMetrikaBrowserClient(
  options: CreateMetrikaBrowserClientOptions,
): MetrikaBrowserClient {
  function call(method: string, ...args: unknown[]): void {
    const id = resolveTagId(options.tagId);
    const ym = getYm();
    if (!id || !Number.isSafeInteger(id) || id < 1 || !ym) return;
    ym(id, method, ...args);
  }

  return {
    reachGoal(name: string, params?: MetrikaParams) {
      params === undefined
        ? call("reachGoal", name)
        : call("reachGoal", name, params);
    },
    hit(url: string, hitOptions?: MetrikaBrowserHitOptions) {
      hitOptions === undefined
        ? call("hit", url)
        : call("hit", url, hitOptions);
    },
    setUserID(userId: string) {
      call("setUserID", userId);
    },
    userParams(params: MetrikaParams) {
      call("userParams", params);
    },
    getClientID(callback: (clientId: string) => void) {
      call("getClientID", callback);
    },
  };
}
