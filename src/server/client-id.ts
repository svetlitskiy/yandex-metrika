import {
  METRIKA_CLIENT_ID_COOKIE,
  METRIKA_CLIENT_ID_HEADER,
  isMetrikaClientId,
} from "../shared";
import type {
  MetrikaClientIdLookupOptions,
  MetrikaHeadersLike,
  MetrikaRequestLike,
} from "../types";

/** Reads every value of one header from either supported header shape. */
function readHeaderValues(headers: MetrikaHeadersLike, name: string): string[] {
  if (!headers || typeof headers !== "object") return [];

  const getter = (headers as { get?: unknown }).get;
  if (typeof getter === "function") {
    const value = (getter as (header: string) => unknown).call(headers, name);
    return typeof value === "string" ? [value] : [];
  }

  const target = name.toLowerCase();
  const values: string[] = [];
  for (const [key, value] of Object.entries(
    headers as Record<string, unknown>,
  )) {
    if (key.toLowerCase() !== target) continue;
    if (typeof value === "string") values.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "string") values.push(item);
    }
  }
  return values;
}

/** Removes optional quoting and percent-encoding from a cookie value. */
function decodeCookieValue(raw: string): string {
  const unquoted =
    raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')
      ? raw.slice(1, -1)
      : raw;
  try {
    return decodeURIComponent(unquoted);
  } catch {
    return unquoted;
  }
}

/** Reads every value stored under one cookie name. */
function readCookieValues(cookieHeader: string, cookieName: string): string[] {
  const values: string[] = [];
  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() !== cookieName) continue;
    values.push(decodeCookieValue(pair.slice(separator + 1).trim()));
  }
  return values;
}

/**
 * Returns the first value that passes ClientID validation.
 *
 * Candidates come from untrusted request data, and a request can legitimately
 * carry more than one value for the same cookie or header, so an invalid entry
 * must not hide a valid one behind it.
 */
function firstClientId(values: readonly string[]): string | null {
  for (const value of values) {
    const candidate = value.trim();
    if (isMetrikaClientId(candidate)) return candidate;
  }
  return null;
}

/**
 * Extracts a Yandex Metrica ClientID from a `Cookie` request header.
 *
 * The Metrica tag stores the ClientID in the `_ym_uid` cookie, so a backend on
 * the same registrable domain can read it from an ordinary business request.
 * Returns `null` when the cookie is absent or does not hold a valid ClientID.
 */
export function getMetrikaClientIdFromCookie(
  cookieHeader: string | null | undefined,
  options: MetrikaClientIdLookupOptions = {},
): string | null {
  if (typeof cookieHeader !== "string" || cookieHeader === "") return null;
  return firstClientId(
    readCookieValues(
      cookieHeader,
      options.cookieName ?? METRIKA_CLIENT_ID_COOKIE,
    ),
  );
}

/**
 * Extracts a Yandex Metrica ClientID from incoming request headers.
 *
 * Resolution order: the explicit propagation header first, then the `_ym_uid`
 * cookie. A propagated ClientID is untrusted input; it is validated here and
 * must never be treated as authentication or authorization data.
 *
 * Accepts both the WHATWG `Headers` interface and a plain Node.js header
 * record, so it works with any framework without depending on one.
 */
export function getMetrikaClientIdFromHeaders(
  headers: MetrikaHeadersLike,
  options: MetrikaClientIdLookupOptions = {},
): string | null {
  const headerName = options.headerName ?? METRIKA_CLIENT_ID_HEADER;
  const propagated = firstClientId(
    readHeaderValues(headers, headerName).flatMap((value) => value.split(",")),
  );
  if (propagated) return propagated;

  for (const cookieHeader of readHeaderValues(headers, "cookie")) {
    const fromCookie = getMetrikaClientIdFromCookie(cookieHeader, options);
    if (fromCookie) return fromCookie;
  }
  return null;
}

/**
 * Extracts a Yandex Metrica ClientID from anything carrying request headers,
 * such as a fetch `Request` or a Node.js `IncomingMessage`.
 */
export function getMetrikaClientIdFromRequest(
  request: MetrikaRequestLike | null | undefined,
  options: MetrikaClientIdLookupOptions = {},
): string | null {
  if (!request || typeof request !== "object") return null;
  return getMetrikaClientIdFromHeaders(request.headers, options);
}
