import { describe, expect, it } from "vitest";
import { buildGenerationRequestPreview } from "./generationRequestPreview";

describe("generation request preview", () => {
  it("formats a copyable generation request summary", () => {
    expect(
      buildGenerationRequestPreview({
        prompt: "  测试直播封面  ",
        model: "gpt-image-2",
        mode: "text-to-image",
        size: "1024x1024",
        quality: "standard",
        count: 1,
        referenceCount: 0,
        hasMask: false
      })
    ).toBe(
      JSON.stringify(
        {
          prompt: "测试直播封面",
          model: "gpt-image-2",
          mode: "text-to-image",
          size: "1024x1024",
          quality: "standard",
          count: 1,
          referenceCount: 0,
          hasMask: false
        },
        null,
        2
      )
    );
  });
});
