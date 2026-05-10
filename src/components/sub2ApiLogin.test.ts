import { describe, expect, it } from "vitest";
import {
  buildSub2ApiLoginUrl,
  readSub2ApiAuthFromUrl,
  readSub2ApiTokenFromUrl,
  stripSub2ApiAuthParamsFromUrl
} from "./sub2ApiLogin";

describe("Sub2API login handoff helpers", () => {
  it("adds the current page as return_to on the Sub2API login URL", () => {
    const loginUrl = buildSub2ApiLoginUrl({
      loginBaseUrl: "https://api.lumio.games/login",
      returnToUrl: "http://localhost:3000/?foo=bar"
    });

    const url = new URL(loginUrl);
    expect(url.origin).toBe("https://api.lumio.games");
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("return_to")).toBe("http://localhost:3000/?foo=bar");
    expect(url.searchParams.get("handoff")).toBe("1");
  });

  it("keeps callback URLs from forwarding one-time Sub2API token params again", () => {
    const loginUrl = buildSub2ApiLoginUrl({
      loginBaseUrl: "https://api.lumio.games/login?lang=zh",
      returnToUrl: "http://localhost:3000/?token=secret&theme=dark&prompt=cat#access_token=hash-secret&view=studio"
    });

    const url = new URL(loginUrl);
    expect(url.searchParams.get("lang")).toBe("zh");
    expect(url.searchParams.get("return_to")).toBe("http://localhost:3000/?prompt=cat#view=studio");
  });

  it("reads a handoff token from query token or hash access_token", () => {
    expect(readSub2ApiTokenFromUrl("http://localhost:3000/?token=query-token")).toBe("query-token");
    expect(readSub2ApiTokenFromUrl("http://localhost:3000/#access_token=hash-token")).toBe("hash-token");
  });

  it("reads refresh token and expiry from handoff URLs when available", () => {
    expect(
      readSub2ApiAuthFromUrl(
        "http://localhost:3000/?access_token=access-token&refresh_token=refresh-token&expires_in=3600"
      )
    ).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 3600
    });
  });

  it("strips Sub2API handoff params from query and hash while preserving app params", () => {
    expect(
      stripSub2ApiAuthParamsFromUrl(
        "http://localhost:3000/?token=query-token&prompt=cat&ui_mode=embedded#access_token=hash-token&view=studio"
      )
    ).toBe("http://localhost:3000/?prompt=cat#view=studio");
  });
});
