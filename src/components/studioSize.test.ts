import { describe, expect, it } from "vitest";
import {
  type AspectRatioLabel,
  type ImageResolutionTier,
  buildGenerationSize,
  buildCustomGenerationSize,
  getCustomSizeUnsupportedMessage,
  getEffectiveResolutionTier,
  getGenerationRequestTimeoutMs,
  getRecommendedRatioForResolution,
  getUnsupportedGenerationSizeReason,
  validateCustomGenerationSize
} from "./studioSize";

describe("studio generation size", () => {
  it("keeps 1K square as the default generation size", () => {
    expect(buildGenerationSize({ ratio: "1:1", resolution: "1K" })).toEqual({
      size: "1024x1024",
      meta: "1024 × 1024"
    });
  });

  it("calculates official-compliant sizes from the selected tier and aspect ratio", () => {
    expect(buildGenerationSize({ ratio: "16:9", resolution: "1K" }).size).toBe("1280x720");
    expect(buildGenerationSize({ ratio: "9:16", resolution: "1K" }).size).toBe("720x1280");
    expect(buildGenerationSize({ ratio: "16:9", resolution: "2K" }).size).toBe("2048x1152");
    expect(buildGenerationSize({ ratio: "16:9", resolution: "4K" }).size).toBe("3840x2160");
    expect(buildGenerationSize({ ratio: "9:16", resolution: "2K" }).size).toBe("1152x2048");
    expect(buildGenerationSize({ ratio: "3:4", resolution: "2K" }).size).toBe("1536x2048");
    expect(buildGenerationSize({ ratio: "4:3", resolution: "4K" }).size).toBe("3264x2448");
    expect(buildGenerationSize({ ratio: "3:4", resolution: "4K" }).size).toBe("2448x3264");
    expect(buildGenerationSize({ ratio: "1:1", resolution: "4K" }).size).toBe("2880x2880");
  });

  it("keeps every selectable GPT Image 2 size within official constraints", () => {
    const ratios: AspectRatioLabel[] = ["1:1", "3:4", "4:3", "16:9", "9:16"];
    const resolutions: ImageResolutionTier[] = ["1K", "2K", "4K"];

    for (const resolution of resolutions) {
      for (const ratio of ratios) {
        const { size } = buildGenerationSize({ ratio, resolution });
        const [width, height] = size.split("x").map(Number);
        const longEdge = Math.max(width, height);
        const shortEdge = Math.min(width, height);
        const totalPixels = width * height;

        expect(width % 16, size).toBe(0);
        expect(height % 16, size).toBe(0);
        expect(longEdge, size).toBeLessThanOrEqual(3840);
        expect(longEdge / shortEdge, size).toBeLessThanOrEqual(3);
        expect(totalPixels, size).toBeGreaterThanOrEqual(655_360);
        expect(totalPixels, size).toBeLessThanOrEqual(8_294_400);
      }
    }
  });

  it("uses 250 seconds for 1K and 240 seconds for 2K/4K front-end requests", () => {
    expect(getGenerationRequestTimeoutMs("1K")).toBe(250_000);
    expect(getGenerationRequestTimeoutMs("2K")).toBe(240_000);
    expect(getGenerationRequestTimeoutMs("4K")).toBe(240_000);
  });

  it("does not force a ratio change because every selectable 4K ratio is compliant", () => {
    expect(getRecommendedRatioForResolution("4K")).toBeNull();
    expect(getRecommendedRatioForResolution("1K")).toBeNull();
    expect(getRecommendedRatioForResolution("2K")).toBeNull();
  });

  it("does not block any selectable tier and ratio combination", () => {
    expect(getUnsupportedGenerationSizeReason({ ratio: "1:1", resolution: "4K" })).toBeNull();
    expect(getUnsupportedGenerationSizeReason({ ratio: "16:9", resolution: "4K" })).toBeNull();
  });

  it("builds supported custom GPT Image 2 generation sizes", () => {
    expect(validateCustomGenerationSize({ width: "1024", height: "1024" })).toEqual({
      supported: true,
      width: 1024,
      height: 1024,
      size: "1024x1024"
    });
    expect(buildCustomGenerationSize({ width: 3840, height: 2160 })).toEqual({
      size: "3840x2160",
      meta: "3840 × 2160"
    });
  });

  it("guides unsupported custom sizes with official min and max limits", () => {
    const validation = validateCustomGenerationSize({ width: "512", height: "512" });

    expect(validation.supported).toBe(false);
    expect(getCustomSizeUnsupportedMessage(validation)).toContain("Image2 不支持 512 × 512 分辨率");
    expect(getCustomSizeUnsupportedMessage(validation)).toContain("最小支持 655,360");
    expect(getCustomSizeUnsupportedMessage(validation)).toContain("最大支持 8,294,400");
  });

  it("rejects custom sizes that violate GPT Image 2 edge, aspect, and multiple constraints", () => {
    expect(validateCustomGenerationSize({ width: "721", height: "1280" })).toMatchObject({
      supported: false,
      code: "dimension_step"
    });
    expect(validateCustomGenerationSize({ width: "4000", height: "2048" })).toMatchObject({
      supported: false,
      code: "max_edge"
    });
    expect(validateCustomGenerationSize({ width: "3072", height: "768" })).toMatchObject({
      supported: false,
      code: "max_aspect_ratio"
    });
    expect(validateCustomGenerationSize({ width: "3840", height: "3840" })).toMatchObject({
      supported: false,
      code: "max_pixels"
    });
  });

  it("infers the effective resolution tier for custom sizes", () => {
    expect(getEffectiveResolutionTier("1024x1024")).toBe("1K");
    expect(getEffectiveResolutionTier("1920x1080")).toBe("2K");
    expect(getEffectiveResolutionTier("3840x2160")).toBe("4K");
  });
});
