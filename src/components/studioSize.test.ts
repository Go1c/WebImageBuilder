import { describe, expect, it } from "vitest";
import {
  type AspectRatioLabel,
  type ImageResolutionTier,
  buildGenerationSize,
  getGenerationRequestTimeoutMs,
  getRecommendedRatioForResolution,
  getUnsupportedGenerationSizeReason
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
});
