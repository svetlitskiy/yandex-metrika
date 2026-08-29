/** A conservative validation pattern for Yandex Metrica ClientID values. */
export const METRIKA_CLIENT_ID_PATTERN = /^\d{1,32}$/;

/** The public Measurement Protocol collection endpoint. */
export const METRIKA_COLLECT_ORIGIN = "https://mc.yandex.ru/collect";

/** The default timeout for Measurement Protocol requests. */
export const METRIKA_COLLECT_TIMEOUT_MS = 5_000;

/** Returns whether a value looks like a Yandex Metrica ClientID. */
export function isMetrikaClientId(value: string): boolean {
  return METRIKA_CLIENT_ID_PATTERN.test(value);
}

/** Parses a counter ID from an environment variable or other string input. */
export function parseMetrikaTagId(
  value: string | undefined | null,
): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
