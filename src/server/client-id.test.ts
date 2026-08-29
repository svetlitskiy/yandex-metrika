import { describe, expect, it } from "vitest";
import {
  METRIKA_CLIENT_ID_HEADER,
  getMetrikaClientIdFromCookie,
  getMetrikaClientIdFromHeaders,
  getMetrikaClientIdFromRequest,
} from "./index";

const CLIENT_ID = "1710232430899999999";

describe("getMetrikaClientIdFromCookie", () => {
  it("reads _ym_uid from a cookie header with several cookies", () => {
    expect(
      getMetrikaClientIdFromCookie(
        `session=abc; _ym_uid=${CLIENT_ID}; _ym_d=1710232430`,
      ),
    ).toBe(CLIENT_ID);
  });

  it("accepts quoted and percent-encoded values", () => {
    expect(getMetrikaClientIdFromCookie(`_ym_uid="${CLIENT_ID}"`)).toBe(
      CLIENT_ID,
    );
    expect(getMetrikaClientIdFromCookie(`_ym_uid=%31%32%33`)).toBe("123");
  });

  it("skips an invalid duplicate and keeps the valid value", () => {
    expect(
      getMetrikaClientIdFromCookie(
        `_ym_uid=not-a-client-id; _ym_uid=${CLIENT_ID}`,
      ),
    ).toBe(CLIENT_ID);
  });

  it("rejects invalid, missing, and malformed input", () => {
    expect(getMetrikaClientIdFromCookie("_ym_uid=not-a-client-id")).toBeNull();
    expect(getMetrikaClientIdFromCookie("_ym_uid=")).toBeNull();
    expect(getMetrikaClientIdFromCookie("session=abc")).toBeNull();
    expect(getMetrikaClientIdFromCookie("")).toBeNull();
    expect(getMetrikaClientIdFromCookie(undefined)).toBeNull();
    expect(getMetrikaClientIdFromCookie(null)).toBeNull();
  });

  it("does not match a different cookie name", () => {
    expect(
      getMetrikaClientIdFromCookie(`other_ym_uid=${CLIENT_ID}`),
    ).toBeNull();
  });

  it("supports a custom cookie name", () => {
    expect(
      getMetrikaClientIdFromCookie(`app_cid=${CLIENT_ID}`, {
        cookieName: "app_cid",
      }),
    ).toBe(CLIENT_ID);
  });
});

describe("getMetrikaClientIdFromHeaders", () => {
  it("reads the propagation header from a Headers instance", () => {
    const headers = new Headers({ [METRIKA_CLIENT_ID_HEADER]: CLIENT_ID });
    expect(getMetrikaClientIdFromHeaders(headers)).toBe(CLIENT_ID);
  });

  it("falls back to the cookie header", () => {
    const headers = new Headers({ cookie: `_ym_uid=${CLIENT_ID}` });
    expect(getMetrikaClientIdFromHeaders(headers)).toBe(CLIENT_ID);
  });

  it("prefers the propagation header over the cookie", () => {
    const headers = new Headers({
      [METRIKA_CLIENT_ID_HEADER]: "42",
      cookie: `_ym_uid=${CLIENT_ID}`,
    });
    expect(getMetrikaClientIdFromHeaders(headers)).toBe("42");
  });

  it("reads Node.js header records case-insensitively", () => {
    expect(
      getMetrikaClientIdFromHeaders({
        "X-YANDEX-METRIKA-CLIENT-ID": CLIENT_ID,
      }),
    ).toBe(CLIENT_ID);
    expect(
      getMetrikaClientIdFromHeaders({ Cookie: `_ym_uid=${CLIENT_ID}` }),
    ).toBe(CLIENT_ID);
  });

  it("reads repeated header values delivered as an array", () => {
    expect(
      getMetrikaClientIdFromHeaders({
        "x-yandex-metrika-client-id": ["not-a-client-id", CLIENT_ID],
      }),
    ).toBe(CLIENT_ID);
    expect(
      getMetrikaClientIdFromHeaders({
        cookie: ["session=abc", `_ym_uid=${CLIENT_ID}`],
      }),
    ).toBe(CLIENT_ID);
  });

  it("splits comma-joined duplicates of the propagation header", () => {
    const headers = new Headers();
    headers.append(METRIKA_CLIENT_ID_HEADER, "not-a-client-id");
    headers.append(METRIKA_CLIENT_ID_HEADER, CLIENT_ID);
    expect(getMetrikaClientIdFromHeaders(headers)).toBe(CLIENT_ID);
  });

  it("rejects an invalid propagated value and reports no ClientID", () => {
    expect(
      getMetrikaClientIdFromHeaders({
        "x-yandex-metrika-client-id": "'; DROP TABLE visits; --",
      }),
    ).toBeNull();
    expect(getMetrikaClientIdFromHeaders({})).toBeNull();
    expect(
      getMetrikaClientIdFromHeaders({
        "x-yandex-metrika-client-id": undefined,
      }),
    ).toBeNull();
  });

  it("supports a custom propagation header name", () => {
    expect(
      getMetrikaClientIdFromHeaders(
        { "x-app-client-id": CLIENT_ID },
        { headerName: "X-App-Client-Id" },
      ),
    ).toBe(CLIENT_ID);
  });
});

describe("getMetrikaClientIdFromRequest", () => {
  it("reads headers from a fetch Request", () => {
    const request = new Request("https://api.example.test/orders", {
      method: "POST",
      headers: { [METRIKA_CLIENT_ID_HEADER]: CLIENT_ID },
    });
    expect(getMetrikaClientIdFromRequest(request)).toBe(CLIENT_ID);
  });

  it("reads headers from a Node.js style request", () => {
    expect(
      getMetrikaClientIdFromRequest({
        headers: { cookie: `_ym_uid=${CLIENT_ID}` },
      }),
    ).toBe(CLIENT_ID);
  });

  it("returns null for a missing request", () => {
    expect(getMetrikaClientIdFromRequest(null)).toBeNull();
    expect(getMetrikaClientIdFromRequest(undefined)).toBeNull();
  });
});
