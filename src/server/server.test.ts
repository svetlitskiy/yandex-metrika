import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMetrikaCollectUrl,
  createMetrikaServerClient,
  metrikaChannelPageUrl,
  parseMetrikaServerConfig,
  reachGoal,
} from "./index";

afterEach(() => {
  vi.unstubAllGlobals();
});

function collectBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number) {
  const init = fetchMock.mock.calls[callIndex]?.[1] as
    { body?: unknown } | undefined;
  if (!(init?.body instanceof URLSearchParams)) {
    throw new Error("Expected a URLSearchParams body");
  }
  return init.body;
}

describe("Measurement Protocol helpers", () => {
  it("serializes goal fields", () => {
    const url = new URL(
      buildMetrikaCollectUrl({
        tid: "12345678",
        cid: "1710232430899999999",
        ms: "secret-token",
        t: "event",
        ea: "purchase",
        dl: "https://example.test/checkout",
        et: 1_700_000_000,
        params: { plan: "pro" },
      }),
    );

    expect(url.origin + url.pathname).toBe("https://mc.yandex.ru/collect");
    expect(url.searchParams.get("ea")).toBe("purchase");
    expect(url.searchParams.get("params")).toBe('{"plan":"pro"}');
  });

  it("builds an encoded synthetic channel URL", () => {
    expect(
      metrikaChannelPageUrl("https://example.test/", "background job"),
    ).toBe("https://example.test/_channel/background%20job");
  });

  it("parses server configuration", () => {
    expect(
      parseMetrikaServerConfig({
        counterId: 12345678,
        measurementToken: " token ",
      }),
    ).toEqual({ counterId: "12345678", measurementToken: "token" });
    expect(
      parseMetrikaServerConfig({ counterId: "abc", measurementToken: "token" }),
    ).toBeNull();
  });
});

describe("reachGoal", () => {
  it("skips an unconfigured client", async () => {
    const fetchMock = vi.fn();
    await expect(
      reachGoal({
        counterId: "12345678",
        measurementToken: " ",
        clientId: "1710232430899999999",
        name: "purchase",
        url: "https://example.test/checkout",
        fetch: fetchMock,
      }),
    ).resolves.toBe("skipped_unconfigured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips a missing or invalid ClientID", async () => {
    const fetchMock = vi.fn();
    const input = {
      counterId: "12345678",
      measurementToken: "token",
      name: "purchase",
      url: "https://example.test/checkout",
      fetch: fetchMock,
    };

    await expect(reachGoal({ ...input, clientId: null })).resolves.toBe(
      "skipped_no_client_id",
    );
    await expect(reachGoal({ ...input, clientId: "invalid" })).resolves.toBe(
      "skipped_no_client_id",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends one event with an explicit event time", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await expect(
      reachGoal({
        counterId: "12345678",
        measurementToken: "token",
        clientId: "1710232430899999999",
        name: "purchase",
        url: "https://example.test/checkout",
        params: { plan: "pro" },
        eventTime: new Date("2023-11-14T22:13:20.000Z"),
        fetch: fetchMock,
      }),
    ).resolves.toBe("sent");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://mc.yandex.ru/collect",
    );
    const body = collectBody(fetchMock, 0);
    expect(body.get("t")).toBe("event");
    expect(body.get("ea")).toBe("purchase");
    expect(body.get("et")).toBe("1700000000");
  });

  it("sends a pageview before a goal when requested", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const client = createMetrikaServerClient({
      counterId: "12345678",
      measurementToken: "token",
      fetch: fetchMock,
    });

    await client.reachGoal({
      clientId: "1710232430899999999",
      name: "purchase",
      url: "https://example.test/_channel/telegram",
      pageview: {
        referrer: "https://example.test",
        title: "Telegram",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(collectBody(fetchMock, 0).get("t")).toBe("pageview");
    expect(collectBody(fetchMock, 0).get("dr")).toBe("https://example.test");
    expect(collectBody(fetchMock, 1).get("t")).toBe("event");
  });

  it("throws on an invalid event time", async () => {
    await expect(
      reachGoal({
        counterId: "12345678",
        measurementToken: "token",
        clientId: "1710232430899999999",
        name: "purchase",
        url: "https://example.test/checkout",
        eventTime: Number.NaN,
      }),
    ).rejects.toThrow("eventTime must be a valid Date");
  });

  it("calls the default fetch with globalThis as its receiver", async () => {
    let calls = 0;
    const fetchProxy = new Proxy(globalThis.fetch, {
      apply(_target, thisArg) {
        if (thisArg !== globalThis) {
          throw new TypeError("Illegal invocation");
        }
        calls += 1;
        return Promise.resolve(new Response(null, { status: 200 }));
      },
    });
    vi.stubGlobal("fetch", fetchProxy);

    await expect(
      reachGoal({
        counterId: "12345678",
        measurementToken: "token",
        clientId: "1710232430899999999",
        name: "purchase",
        url: "https://example.test/checkout",
      }),
    ).resolves.toBe("sent");
    expect(calls).toBe(1);
  });

  it("throws when collect returns an error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      reachGoal({
        counterId: "12345678",
        measurementToken: "token",
        clientId: "1710232430899999999",
        name: "purchase",
        url: "https://example.test/checkout",
        fetch: fetchMock,
      }),
    ).rejects.toThrow("HTTP 500");
  });
});
