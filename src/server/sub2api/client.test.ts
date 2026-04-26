import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSub2ApiCurrentUser,
  refreshSub2ApiToken,
  sub2ApiUrl
} from "./client";

describe("Sub2API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds API URLs without duplicating slashes", () => {
    expect(sub2ApiUrl("/auth/me", "https://api.example.com/api/v1/")).toBe(
      "https://api.example.com/api/v1/auth/me"
    );
  });

  it("fetches current user with bearer token and dynamic balance", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        code: 0,
        message: "success",
        data: {
          id: 1,
          email: "user@example.com",
          username: "user",
          role: "user",
          balance: 8.5,
          run_mode: "standard"
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = await getSub2ApiCurrentUser("access", "https://api.example.com/api/v1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access"
        })
      })
    );
    expect(user.email).toBe("user@example.com");
    expect(user.balance).toBe(8.5);
  });

  it("refreshes tokens through Sub2API refresh endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          code: 0,
          message: "success",
          data: {
            access_token: "new-access",
            refresh_token: "new-refresh",
            expires_in: 3600,
            token_type: "Bearer"
          }
        })
      )
    );

    await expect(refreshSub2ApiToken("refresh", "https://api.example.com/api/v1")).resolves.toEqual(
      expect.objectContaining({
        access_token: "new-access",
        refresh_token: "new-refresh"
      })
    );
  });

  it("raises clear errors when Sub2API returns a failed envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            code: 1001,
            message: "invalid token"
          },
          { status: 401 }
        )
      )
    );

    await expect(getSub2ApiCurrentUser("bad-token", "https://api.example.com/api/v1")).rejects.toThrow(
      "invalid token"
    );
  });
});
