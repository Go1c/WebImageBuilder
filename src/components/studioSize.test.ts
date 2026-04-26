import { describe, expect, it } from "vitest";
import { buildGenerationSize } from "./studioSize";

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
  });
});
