import { describe, expect, it } from "vitest";
import { buildSub2ApiSession, getAccessTokenMaxAge } from "./session";

describe("Sub2API session helpers", () => {
  it("normalizes current user into a frontend-safe session payload", () => {
    expect(
      buildSub2ApiSession({
        id: 1,
        email: "user@example.com",
        username: "user",
        balance: 12.34,
        role: "user",
        run_mode: "standard"
      })
    ).toEqual({
      authenticated: true,
      user: {
        id: 1,
        email: "user@example.com",
        username: "user",
        avatar_url: null,
        balance: 12.34,
        role: "user",
        run_mode: "standard"
      }
    });
  });

  it("keeps access token cookies shorter than the provider expiry", () => {
    expect(getAccessTokenMaxAge(3600)).toBe(3540);
    expect(getAccessTokenMaxAge(undefined)).toBe(3540);
  });
});
