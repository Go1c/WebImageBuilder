import { describe, expect, it } from "vitest";
import { buildPromptEnhancementMetadata, promptStylePresets } from "./promptEnhancers";

describe("prompt enhancers", () => {
  it("keeps the raw prompt unchanged when no style is selected", () => {
    const metadata = buildPromptEnhancementMetadata({
      userPrompt: "  雨夜里的未来城市  ",
      selectedStyle: null,
      negativePrompt: ""
    });

    expect(metadata.rawPrompt).toBe("雨夜里的未来城市");
    expect(metadata.finalPrompt).toBe("雨夜里的未来城市");
  });

  it("appends style preset guidance without deleting the user prompt", () => {
    const metadata = buildPromptEnhancementMetadata({
      userPrompt: "  森林里的小屋  ",
      selectedStyle: "watercolor-illustration",
      negativePrompt: ""
    });

    expect(metadata.rawPrompt).toBe("森林里的小屋");
    expect(metadata.finalPrompt.startsWith("森林里的小屋")).toBe(true);
    expect(metadata.finalPrompt).toContain("watercolor illustration");
    expect(metadata.finalPrompt).toContain("paper texture");
  });

  it("contains all current Image Studio style preset labels", () => {
    expect(promptStylePresets.map((preset) => preset.label)).toEqual([
      "电影感",
      "赛博朋克",
      "极简日系",
      "水彩插画",
      "3D 渲染",
      "黑白胶片"
    ]);
  });

  it("appends cyberpunk style guidance without deleting the user prompt", () => {
    const metadata = buildPromptEnhancementMetadata({
      userPrompt: "  未来城市入口  ",
      selectedStyle: "cyberpunk",
      negativePrompt: ""
    });

    expect(metadata.rawPrompt).toBe("未来城市入口");
    expect(metadata.finalPrompt.startsWith("未来城市入口")).toBe(true);
    expect(metadata.selectedStyle?.label).toBe("赛博朋克");
    expect(metadata.finalPrompt).toContain("cyberpunk neon street");
    expect(metadata.finalPrompt).toContain("future city");
  });
});
