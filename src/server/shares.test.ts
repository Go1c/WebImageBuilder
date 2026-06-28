import { describe, expect, it } from "vitest";
import {
  PROMPT_SHARE_COMPLIANCE_NOTICE,
  buildPromptShareImageUrl,
  buildPromptShareUrl,
  buildPromptTryUrl
} from "./shares";

describe("prompt share helpers", () => {
  it("builds a try-it URL that fills the prompt on the studio home page", () => {
    expect(buildPromptTryUrl("赛博朋克白猫，电影感")).toBe(
      "/?prompt=%E8%B5%9B%E5%8D%9A%E6%9C%8B%E5%85%8B%E7%99%BD%E7%8C%AB%EF%BC%8C%E7%94%B5%E5%BD%B1%E6%84%9F"
    );
  });

  it("preserves existing URL parameters when adding the prompt", () => {
    expect(buildPromptTryUrl("blue circle", "https://img.lumio.games/?ref=share")).toBe(
      "https://img.lumio.games/?ref=share&prompt=blue+circle"
    );
  });

  it("preserves existing relative URL parameters when adding the prompt", () => {
    expect(buildPromptTryUrl("blue circle", "/?ref=share")).toBe(
      "/?ref=share&prompt=blue+circle"
    );
  });

  it("builds public share URLs from forwarded host headers instead of the internal container URL", () => {
    expect(
      buildPromptShareUrl(
        "U64qHbr4MFsA",
        new Request("https://0.0.0.0:8080/api/shares", {
          headers: {
            "x-forwarded-host": "img.lumio.games",
            "x-forwarded-proto": "https"
          }
        })
      )
    ).toBe("https://img.lumio.games/share/U64qHbr4MFsA");
  });

  it("prefers an explicitly configured public site URL for share URLs", () => {
    expect(
      buildPromptShareUrl(
        "U64qHbr4MFsA",
        new Request("https://0.0.0.0:8080/api/shares"),
        "https://img.lumio.games/"
      )
    ).toBe("https://img.lumio.games/share/U64qHbr4MFsA");
  });

  it("builds a same-origin image route for public share previews", () => {
    expect(buildPromptShareImageUrl("U64qHbr4MFsA")).toBe(
      "/api/shares/U64qHbr4MFsA/image"
    );
  });

  it("exposes the compliance notice shown during share and public viewing", () => {
    expect(PROMPT_SHARE_COMPLIANCE_NOTICE).toBe(
      "仅供学习交流，禁止传播任何色情非法内容。"
    );
  });
});
