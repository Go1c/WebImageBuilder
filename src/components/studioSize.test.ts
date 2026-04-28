import { describe, expect, it } from "vitest";
import {
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

  it("calculates 2K and 4K sizes from the selected aspect ratio", () => {
    expect(buildGenerationSize({ ratio: "16:9", resolution: "2K" }).size).toBe("2560x1440");
    expect(buildGenerationSize({ ratio: "16:9", resolution: "4K" }).size).toBe("3840x2160");
    expect(buildGenerationSize({ ratio: "9:16", resolution: "2K" }).size).toBe("1440x2560");
    expect(buildGenerationSize({ ratio: "3:4", resolution: "2K" }).size).toBe("1920x2560");
    expect(buildGenerationSize({ ratio: "4:3", resolution: "4K" }).size).toBe("3312x2480");
    expect(buildGenerationSize({ ratio: "3:4", resolution: "4K" }).size).toBe("2480x3312");
  });

  it("uses 120 seconds for 1K and 240 seconds for 2K/4K front-end requests", () => {
    expect(getGenerationRequestTimeoutMs("1K")).toBe(120_000);
    expect(getGenerationRequestTimeoutMs("2K")).toBe(240_000);
    expect(getGenerationRequestTimeoutMs("4K")).toBe(240_000);
  });

  it("recommends 16:9 when switching to 4K", () => {
    expect(getRecommendedRatioForResolution("4K")).toBe("16:9");
    expect(getRecommendedRatioForResolution("1K")).toBeNull();
    expect(getRecommendedRatioForResolution("2K")).toBeNull();
  });

  it("blocks square 4K sizes before they reach the provider", () => {
    expect(getUnsupportedGenerationSizeReason({ ratio: "1:1", resolution: "4K" })).toContain(
      "4K 不支持 1:1"
    );
    expect(getUnsupportedGenerationSizeReason({ ratio: "16:9", resolution: "4K" })).toBeNull();
  });
});
