import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSub2ApiGenerationApiKey,
  getSub2ApiImageApiKey,
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

  it("selects an active OpenAI API key whose group name is for image generation", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        code: 0,
        message: "success",
        data: {
          items: [
            {
              id: 1,
              key: "sk-anthropic",
              name: "Claude key",
              status: "active",
              group: { id: 10, platform: "anthropic" }
            },
            {
              id: 2,
              key: "sk-openai-chat",
              name: "Chat key",
              status: "active",
              group: { id: 11, name: "OpenAI Chat", platform: "openai" }
            },
            {
              id: 3,
              key: "sk-openai-image",
              name: "Image key",
              status: "active",
              group: { id: 12, name: "Image-2（生图专用）", platform: "openAI" }
            }
          ],
          total: 2,
          page: 1,
          page_size: 100,
          pages: 1
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getSub2ApiImageApiKey("access", "https://api.example.com/api/v1")).resolves.toBe(
      "sk-openai-image"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/v1/keys?page=1&page_size=100&status=active",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access"
        })
      })
    );
  });

  it("selects an active Gemini API key from a Gemini group", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          code: 0,
          message: "success",
          data: {
            items: [
              {
                id: 1,
                key: "gemini-chat-key",
                name: "Gemini chat key",
                status: "active",
                group: { id: 11, name: "Gemini Chat", platform: "gemini" }
              },
              {
                id: 2,
                key: "gemini-image-key",
                name: "Gemini image key",
                status: "active",
                group: { id: 12, name: "Gemini（生图专用）", platform: "Gemini" }
              }
            ],
            total: 2,
            page: 1,
            page_size: 100,
            pages: 1
          }
        })
      )
    );

    await expect(
      getSub2ApiGenerationApiKey("access", "gemini", "https://api.example.com/api/v1")
    ).resolves.toBe("gemini-image-key");
  });

  it("raises a Gemini setup error when no active Gemini image group key exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          code: 0,
          message: "success",
          data: {
            items: [
              {
                id: 0,
                key: "gemini-general-key",
                name: "Gemini general key",
                status: "active",
                group: { id: 10, name: "General", platform: "gemini" }
              },
              {
                id: 1,
                key: "sk-openai-image",
                name: "Image key",
                status: "active",
                group: { id: 12, name: "Image-2（生图专用）", platform: "openai" }
              }
            ],
            total: 1,
            page: 1,
            page_size: 100,
            pages: 1
          }
        })
      )
    );

    await expect(
      getSub2ApiGenerationApiKey("access", "gemini", "https://api.example.com/api/v1")
    ).rejects.toMatchObject({
      status: 402,
      code: "account_unavailable",
      message: expect.stringContaining("Gemini")
    });
  });

  it("raises a setup error when no active OpenAI image group key exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          code: 0,
          message: "success",
          data: {
            items: [
              {
                id: 1,
                key: "sk-openai-chat",
                name: "Chat key",
                status: "active",
                group: { id: 11, name: "OpenAI Chat", platform: "openai" }
              }
            ],
            total: 1,
            page: 1,
            page_size: 100,
            pages: 1
          }
        })
      )
    );

    await expect(getSub2ApiImageApiKey("access", "https://api.example.com/api/v1")).rejects.toMatchObject({
      status: 402,
      code: "account_unavailable",
      message: expect.stringContaining("Image-2")
    });
  });

  it("raises a setup error when the key list endpoint cannot be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );

    await expect(getSub2ApiImageApiKey("access", "https://api.example.com/api/v1")).rejects.toMatchObject({
      status: 402,
      code: "account_unavailable",
      message: expect.stringContaining("Image-2")
    });
  });

  it("raises a setup error when the key list endpoint returns a non-JSON not found response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("404 page not found", {
          status: 404,
          headers: {
            "content-type": "text/plain"
          }
        })
      )
    );

    await expect(getSub2ApiImageApiKey("access", "https://api.example.com/api/v1")).rejects.toMatchObject({
      status: 402,
      code: "account_unavailable",
      message: expect.stringContaining("Image-2")
    });
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
