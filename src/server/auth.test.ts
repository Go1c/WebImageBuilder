import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { getAuthenticatedUser } from "./auth";

describe("request authentication", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("treats unverifiable bearer tokens as anonymous instead of failing the request", async () => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: "local-secret"
    };

    const request = new NextRequest("http://localhost/api/quota", {
      headers: {
        Authorization: "Bearer invalid-token"
      }
    });

    await expect(getAuthenticatedUser(request)).resolves.toBeNull();
  });
});
