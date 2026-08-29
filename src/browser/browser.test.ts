import { afterEach, describe, expect, it, vi } from "vitest";
import {
  METRIKA_CLIENT_ID_HEADER,
  createMetrikaBrowserClient,
  isMetrikaClientId,
  parseMetrikaTagId,
} from "./index";

const CLIENT_ID = "1710232430899999999";

function stubYm(implementation?: (...args: unknown[]) => void) {
  const ym = vi.fn(implementation);
  vi.stubGlobal("window", { ym });
  return ym;
}

function answeringYm(clientId: unknown) {
  return stubYm((...args: unknown[]) => {
    if (args[1] !== "getClientID") return;
    (args[2] as (value: unknown) => void)(clientId);
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("browser client", () => {
  it("imports and no-ops during SSR", async () => {
    const client = createMetrikaBrowserClient({ tagId: 12345678 });

    expect(() => client.reachGoal("signup")).not.toThrow();
    expect(() => client.hit("https://example.test/")).not.toThrow();
    expect(() => client.setUserID("user-1")).not.toThrow();
    expect(() => client.userParams({ plan: "pro" })).not.toThrow();
    await expect(client.getClientID()).resolves.toBeNull();
    await expect(client.getPropagationHeaders()).resolves.toEqual({});
  });

  it("forwards calls to window.ym", () => {
    const ym = stubYm();
    const client = createMetrikaBrowserClient({ tagId: () => 12345678 });

    client.reachGoal("signup", { plan: "pro" });
    client.hit("https://example.test/account", { title: "Account" });
    client.setUserID("user-1");
    client.userParams({ plan: "pro" });

    expect(ym).toHaveBeenNthCalledWith(1, 12345678, "reachGoal", "signup", {
      plan: "pro",
    });
    expect(ym).toHaveBeenNthCalledWith(
      2,
      12345678,
      "hit",
      "https://example.test/account",
      { title: "Account" },
    );
    expect(ym).toHaveBeenNthCalledWith(3, 12345678, "setUserID", "user-1");
    expect(ym).toHaveBeenNthCalledWith(4, 12345678, "userParams", {
      plan: "pro",
    });
  });

  it("does not call ym for invalid counter IDs", () => {
    const ym = stubYm();

    createMetrikaBrowserClient({ tagId: 1.5 }).reachGoal("signup");
    createMetrikaBrowserClient({ tagId: null }).reachGoal("signup");

    expect(ym).not.toHaveBeenCalled();
  });

  it("parses counter IDs and validates ClientIDs", () => {
    expect(parseMetrikaTagId(undefined)).toBeNull();
    expect(parseMetrikaTagId("0")).toBeNull();
    expect(parseMetrikaTagId("1.5")).toBeNull();
    expect(parseMetrikaTagId("12345678")).toBe(12345678);
    expect(isMetrikaClientId(CLIENT_ID)).toBe(true);
    expect(isMetrikaClientId("not-a-client-id")).toBe(false);
  });
});

describe("getClientID", () => {
  it("resolves the ClientID reported by the tag", async () => {
    const ym = answeringYm(CLIENT_ID);
    const client = createMetrikaBrowserClient({ tagId: 12345678 });

    await expect(client.getClientID()).resolves.toBe(CLIENT_ID);
    expect(ym).toHaveBeenCalledWith(
      12345678,
      "getClientID",
      expect.any(Function),
    );
  });

  it("resolves null when the tag reports an invalid value", async () => {
    answeringYm("not-a-client-id");
    const client = createMetrikaBrowserClient({ tagId: 12345678 });

    await expect(client.getClientID()).resolves.toBeNull();
  });

  it("resolves null when the tag never answers", async () => {
    vi.useFakeTimers();
    stubYm();
    const client = createMetrikaBrowserClient({ tagId: 12345678 });

    const pending = client.getClientID();
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(pending).resolves.toBeNull();
  });

  it("honours a custom timeout", async () => {
    vi.useFakeTimers();
    stubYm();
    const client = createMetrikaBrowserClient({ tagId: 12345678 });

    const pending = client.getClientID({ timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toBeNull();
  });
});

describe("getPropagationHeaders", () => {
  it("returns a header that can be spread into a business request", async () => {
    answeringYm(CLIENT_ID);
    const client = createMetrikaBrowserClient({ tagId: 12345678 });

    await expect(client.getPropagationHeaders()).resolves.toEqual({
      [METRIKA_CLIENT_ID_HEADER]: CLIENT_ID,
    });
  });

  it("returns an empty object when no ClientID is available", async () => {
    answeringYm(undefined);
    const client = createMetrikaBrowserClient({ tagId: 12345678 });

    await expect(client.getPropagationHeaders()).resolves.toEqual({});
  });
});
