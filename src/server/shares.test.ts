import { describe, expect, it } from "vitest";
import { PROMPT_SHARE_COMPLIANCE_NOTICE, buildPromptTryUrl } from "./shares";

describe("prompt share helpers", () => {
  it("builds a try-it URL that fills the prompt on the studio home page", () => {
    expect(buildPromptTryUrl("赛博朋克白猫，电影感")).toBe(
      "https://img.lumio.games/?prompt=%E8%B5%9B%E5%8D%9A%E6%9C%8B%E5%85%8B%E7%99%BD%E7%8C%AB%EF%BC%8C%E7%94%B5%E5%BD%B1%E6%84%9F"
    );
  });

  it("preserves existing URL parameters when adding the prompt", () => {
    expect(buildPromptTryUrl("blue circle", "https://img.lumio.games/?ref=share")).toBe(
      "https://img.lumio.games/?ref=share&prompt=blue+circle"
    );
  });

  it("exposes the compliance notice shown during share and public viewing", () => {
    expect(PROMPT_SHARE_COMPLIANCE_NOTICE).toBe(
      "仅供学习交流，禁止传播任何色情非法内容。"
    );
  });
});
