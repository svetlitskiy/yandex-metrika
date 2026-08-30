import {
  METRIKA_CLIENT_ID_HEADER,
  METRIKA_CLIENT_ID_PATTERN,
  METRIKA_CLIENT_ID_TIMEOUT_MS,
  isMetrikaClientId,
  parseMetrikaTagId,
} from "../shared";
import type {
  MetrikaBrowserClient,
  MetrikaBrowserHitOptions,
  MetrikaClientIdOptions,
  MetrikaParams,
  MetrikaPropagationHeaders,
} from "../types";

export {
  METRIKA_CLIENT_ID_HEADER,
  METRIKA_CLIENT_ID_PATTERN,
  METRIKA_CLIENT_ID_TIMEOUT_MS,
  isMetrikaClientId,
  parseMetrikaTagId,
};
export type {
  MetrikaBrowserClient,
  MetrikaBrowserHitOptions,
  MetrikaClientIdOptions,
  MetrikaParams,
  MetrikaPropagationHeaders,
};

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
  function resolveTarget(): { id: number; ym: YmFunction } | null {
    const id = resolveTagId(options.tagId);
    const ym = getYm();
    if (!id || !Number.isSafeInteger(id) || id < 1 || !ym) return null;
    return { id, ym };
  }

  function call(method: string, ...args: unknown[]): void {
    const target = resolveTarget();
    if (!target) return;
    target.ym(target.id, method, ...args);
  }

  /**
   * Reads the ClientID assigned by the Metrica tag.
   *
   * Resolves with `null` instead of waiting forever when the tag is missing,
   * blocked, or slow: the `ym` stub queues calls before `tag.js` loads, so a
   * blocked tag would otherwise never invoke the callback.
   */
  function readClientId(
    clientIdOptions?: MetrikaClientIdOptions,
  ): Promise<string | null> {
    const target = resolveTarget();
    if (!target) return Promise.resolve(null);

    return new Promise<string | null>((resolve) => {
      let settled = false;
      const finish = (clientId: string | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(clientId);
      };

      const timer = setTimeout(
        () => finish(null),
        clientIdOptions?.timeoutMs ?? METRIKA_CLIENT_ID_TIMEOUT_MS,
      );

      target.ym(target.id, "getClientID", (clientId: unknown) => {
        finish(
          typeof clientId === "string" && isMetrikaClientId(clientId)
            ? clientId
            : null,
        );
      });
    });
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
    getClientID(clientIdOptions?: MetrikaClientIdOptions) {
      return readClientId(clientIdOptions);
    },
    async getPropagationHeaders(
      clientIdOptions?: MetrikaClientIdOptions,
    ): Promise<MetrikaPropagationHeaders> {
      const clientId = await readClientId(clientIdOptions);
      return clientId ? { [METRIKA_CLIENT_ID_HEADER]: clientId } : {};
    },
  };
}
