import { describe, expect, it } from "vitest";
import { estimateGenerationProgress } from "./generationProgress";

describe("estimateGenerationProgress", () => {
  it("returns 0 at or before start and for invalid input", () => {
    expect(estimateGenerationProgress(0)).toBe(0);
    expect(estimateGenerationProgress(-5)).toBe(0);
    expect(estimateGenerationProgress(Number.NaN)).toBe(0);
  });

  it("increases as more time elapses", () => {
    expect(estimateGenerationProgress(30)).toBeLessThan(estimateGenerationProgress(90));
    expect(estimateGenerationProgress(90)).toBeLessThan(estimateGenerationProgress(180));
  });

  it("never reaches 100% so completion is only shown on the real result", () => {
    expect(estimateGenerationProgress(600)).toBeLessThanOrEqual(95);
    expect(estimateGenerationProgress(100_000)).toBeLessThanOrEqual(95);
  });
});
