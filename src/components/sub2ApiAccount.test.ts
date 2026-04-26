import { describe, expect, it } from "vitest";
import { formatSub2ApiBalance, getSub2ApiAccountLabel } from "./sub2ApiAccount";

describe("Sub2API account display helpers", () => {
  it("formats Sub2API balance with two decimal places", () => {
    expect(formatSub2ApiBalance(12.3)).toBe("$12.30");
    expect(formatSub2ApiBalance(undefined)).toBe("$0.00");
  });

  it("uses email as the primary logged-in account label", () => {
    expect(
      getSub2ApiAccountLabel({
        authenticated: true,
        user: {
          id: 1,
          email: "user@example.com",
          username: "fallback",
          balance: 12.3
        }
      })
    ).toBe("user@example.com");
  });
});
