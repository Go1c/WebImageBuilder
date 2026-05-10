import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSub2ApiCurrentUser,
  logoutSub2Api,
  refreshSub2ApiToken
} from "@/server/sub2api/client";
import {
  SUB2API_ACCESS_COOKIE,
  SUB2API_REFRESH_COOKIE
} from "@/server/sub2api/session";
import { GET, POST } from "./route";

vi.mock("@/server/sub2api/client", () => ({
  getSub2ApiCurrentUser: vi.fn(),
  logoutSub2Api: vi.fn(),
  refreshSub2ApiToken: vi.fn()
}));

describe("/api/sub2api/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes the access token when only the refresh cookie remains", async () => {
    vi.mocked(refreshSub2ApiToken).mockResolvedValueOnce({
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 3600,
      token_type: "Bearer"
    });
    vi.mocked(getSub2ApiCurrentUser).mockResolvedValueOnce({
      id: 123,
      email: "user@example.com",
      username: "tester",
      balance: 8
    });

    const response = await GET(
      new NextRequest("http://localhost/api/sub2api/session", {
        headers: {
          cookie: `${SUB2API_REFRESH_COOKIE}=refresh-token`
        }
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      authenticated: true,
      user: {
        id: 123,
        email: "user@example.com"
      }
    });
    expect(refreshSub2ApiToken).toHaveBeenCalledWith("refresh-token");
    expect(getSub2ApiCurrentUser).toHaveBeenCalledWith("new-access-token");
    expect(response.cookies.get(SUB2API_ACCESS_COOKIE)?.value).toBe("new-access-token");
    expect(response.cookies.get(SUB2API_REFRESH_COOKIE)?.value).toBe("new-refresh-token");
  });

  it("persists refresh token handoff data when attaching a Sub2API token", async () => {
    vi.mocked(getSub2ApiCurrentUser).mockResolvedValueOnce({
      id: 123,
      email: "user@example.com",
      username: "tester",
      balance: 8
    });

    const response = await POST(
      new NextRequest("http://localhost/api/sub2api/session", {
        method: "POST",
        body: JSON.stringify({
          action: "attachToken",
          accessToken: "access-token",
          refreshToken: "refresh-token",
          expiresIn: 3600
        })
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      authenticated: true,
      user: {
        id: 123,
        email: "user@example.com"
      }
    });
    expect(response.cookies.get(SUB2API_ACCESS_COOKIE)?.value).toBe("access-token");
    expect(response.cookies.get(SUB2API_REFRESH_COOKIE)?.value).toBe("refresh-token");
  });
});
