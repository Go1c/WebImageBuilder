import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getRequestContext } from "./request-context";
import { SUB2API_ACCESS_COOKIE } from "./sub2api/session";

describe("request context", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("treats a valid Sub2API session token as a logged-in user", async () => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: "",
      JWT_SECRET: "",
      JWT_PUBLIC_KEY: "",
      LUMIO_LOCAL_MODE: "true",
      SUB2API_API_BASE_URL: "https://api.example.com/api/v1"
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          code: 0,
          message: "success",
          data: {
            id: 123,
            email: "user@example.com",
            username: "tester",
            balance: 12
          }
        })
      )
    );

    const request = new NextRequest("http://localhost/api/generate", {
      headers: {
        cookie: `${SUB2API_ACCESS_COOKIE}=sub2api-access-token`
      }
    });

    const context = await getRequestContext(request);

    expect(context.actor.type).toBe("user");
    expect(context.sub2ApiAccessToken).toBe("sub2api-access-token");
    if (context.actor.type === "user") {
      expect(context.actor.externalUserId).toBe("sub2api:123");
    }
  });
});
