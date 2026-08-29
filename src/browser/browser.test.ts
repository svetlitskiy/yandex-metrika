import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMetrikaBrowserClient,
  isMetrikaClientId,
  parseMetrikaTagId,
} from "./index";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser client", () => {
  it("imports and no-ops during SSR", () => {
    const client = createMetrikaBrowserClient({ tagId: 12345678 });

    expect(() => client.reachGoal("signup")).not.toThrow();
    expect(() => client.hit("https://example.test/")).not.toThrow();
    expect(() => client.setUserID("user-1")).not.toThrow();
    expect(() => client.userParams({ plan: "pro" })).not.toThrow();
    expect(() => client.getClientID(() => undefined)).not.toThrow();
  });

  it("forwards calls to window.ym", () => {
    const ym = vi.fn();
    vi.stubGlobal("window", { ym });
    const client = createMetrikaBrowserClient({ tagId: () => 12345678 });

    client.reachGoal("signup", { plan: "pro" });
    client.hit("https://example.test/account", { title: "Account" });
    client.setUserID("user-1");
    client.userParams({ plan: "pro" });
    const callback = vi.fn();
    client.getClientID(callback);

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
    expect(ym).toHaveBeenNthCalledWith(5, 12345678, "getClientID", callback);
  });

  it("does not call ym for invalid counter IDs", () => {
    const ym = vi.fn();
    vi.stubGlobal("window", { ym });

    createMetrikaBrowserClient({ tagId: 1.5 }).reachGoal("signup");
    createMetrikaBrowserClient({ tagId: null }).reachGoal("signup");

    expect(ym).not.toHaveBeenCalled();
  });

  it("parses counter IDs and validates ClientIDs", () => {
    expect(parseMetrikaTagId(undefined)).toBeNull();
    expect(parseMetrikaTagId("0")).toBeNull();
    expect(parseMetrikaTagId("1.5")).toBeNull();
    expect(parseMetrikaTagId("12345678")).toBe(12345678);
    expect(isMetrikaClientId("1710232430899999999")).toBe(true);
    expect(isMetrikaClientId("not-a-client-id")).toBe(false);
  });
});
