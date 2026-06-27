import { describe, expect, it } from "vitest";
import { buildGenerationRequestPreview } from "./generationRequestPreview";
import { negativePromptProviderSupportNote } from "./promptEnhancers";

describe("generation request preview", () => {
  it("formats a copyable generation request summary with prompt metadata", () => {
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
          prompt: {
            raw: "测试直播封面",
            final: "测试直播封面",
            selectedStyle: null,
            negative: "",
            providerSupportNotes: []
          },
          request: {
            model: "gpt-image-2",
            mode: "text-to-image",
            size: "1024x1024",
            quality: "standard",
            count: 1,
            referenceCount: 0,
            hasMask: false
          }
        },
        null,
        2
      )
    );
  });

  it("includes negative prompt metadata with an explicit support note", () => {
    const preview = JSON.parse(
      buildGenerationRequestPreview({
        prompt: "测试直播封面，realistic photography",
        rawPrompt: "测试直播封面",
        finalPrompt: "测试直播封面，realistic photography",
        selectedStyle: {
          key: "watercolor-illustration",
          label: "水彩插画"
        },
        negativePrompt: "  模糊，低清晰度  ",
        model: "gpt-image-2",
        mode: "text-to-image",
        size: "1024x1024",
        quality: "standard",
        count: 1,
        referenceCount: 0,
        hasMask: false
      })
    ) as {
      prompt: {
        raw: string;
        final: string;
        selectedStyle: { key: string; label: string } | null;
        negative: string;
        providerSupportNotes: string[];
      };
    };

    expect(preview.prompt.raw).toBe("测试直播封面");
    expect(preview.prompt.final).toBe("测试直播封面，realistic photography");
    expect(preview.prompt.selectedStyle).toEqual({
      key: "watercolor-illustration",
      label: "水彩插画"
    });
    expect(preview.prompt.negative).toBe("模糊，低清晰度");
    expect(preview.prompt.providerSupportNotes).toContain(negativePromptProviderSupportNote);
  });
});
