import { describe, expect, it } from "vitest";
import {
  buildPromptShareCopyText,
  buildShareCardFileName,
  summarizePromptForShare
} from "./sharePromptCard";

describe("prompt share card helpers", () => {
  it("summarizes long prompts without losing the sharing intent", () => {
    const prompt = "  第一行提示词\n第二行提示词  ".repeat(20);

    const summary = summarizePromptForShare(prompt, 48);

    expect(summary.length).toBeLessThanOrEqual(49);
    expect(summary).toContain("第一行提示词");
    expect(summary.endsWith("...")).toBe(true);
    expect(summary).not.toContain("\n");
  });

  it("builds concise Image-2 copy with the remix link only", () => {
    expect(
      buildPromptShareCopyText({
        prompt: "赛博城市夜景，电影感构图",
        shareUrl: "https://img.lumio.games/share/XB9nyXuPDuVD"
      })
    ).toBe("我在 Lumio 使用Image-2生成了一张图，你可以打开链接生成同款：https://img.lumio.games/share/XB9nyXuPDuVD");
  });

  it("builds stable svg card file names", () => {
    expect(buildShareCardFileName(new Date(2026, 3, 27, 8, 5, 9))).toBe(
      "lumio-prompt-card-20260427-080509.svg"
    );
  });
});
