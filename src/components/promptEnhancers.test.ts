import { describe, expect, it } from "vitest";
import { buildPromptEnhancementMetadata, promptStylePresets } from "./promptEnhancers";

describe("prompt enhancers", () => {
  it("adds no type enhancer when selectedTypes is empty", () => {
    const metadata = buildPromptEnhancementMetadata({
      userPrompt: "  雨夜里的未来城市  ",
      selectedTypes: [],
      selectedStyle: null,
      negativePrompt: ""
    });

    expect(metadata.rawPrompt).toBe("雨夜里的未来城市");
    expect(metadata.finalPrompt).toBe("雨夜里的未来城市");
    expect(metadata.selectedTypes).toEqual([]);
    expect(metadata.selectedTypeEnhancers).toEqual([]);
  });

  it("adds realistic photography guidance when 写实 is selected", () => {
    const metadata = buildPromptEnhancementMetadata({
      userPrompt: "城市街头肖像",
      selectedTypes: ["写实"],
      selectedStyle: null,
      negativePrompt: ""
    });

    expect(metadata.selectedTypes).toEqual(["写实"]);
    expect(metadata.finalPrompt).toContain("realistic photography");
    expect(metadata.finalPrompt).toContain("lens language");
    expect(metadata.finalPrompt).toContain("material detail");
  });

  it("appends UI and 3D enhancers in stable UI order", () => {
    const metadata = buildPromptEnhancementMetadata({
      userPrompt: "智能家居控制台",
      selectedTypes: ["3D", "UI"],
      selectedStyle: null,
      negativePrompt: ""
    });

    expect(metadata.selectedTypes).toEqual(["UI", "3D"]);
    expect(metadata.finalPrompt.indexOf("interface design")).toBeLessThan(
      metadata.finalPrompt.indexOf("PBR materials")
    );
  });

  it("represents deselection by omitting a previously selected type", () => {
    const metadata = buildPromptEnhancementMetadata({
      userPrompt: "智能家居控制台",
      selectedTypes: ["UI"],
      selectedStyle: null,
      negativePrompt: ""
    });

    expect(metadata.selectedTypes).toEqual(["UI"]);
    expect(metadata.finalPrompt).toContain("interface design");
    expect(metadata.finalPrompt).not.toContain("PBR materials");
  });

  it("appends style preset guidance without deleting the user prompt", () => {
    const metadata = buildPromptEnhancementMetadata({
      userPrompt: "  森林里的小屋  ",
      selectedTypes: [],
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
      selectedTypes: [],
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
