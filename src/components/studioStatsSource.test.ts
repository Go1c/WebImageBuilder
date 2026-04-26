import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("ImageStudio global stats integration", () => {
  it("loads and renders global generation totals in the top bar", () => {
    const studioSource = readFileSync("src/components/ImageStudio.tsx", "utf8");

    expect(studioSource).toContain('fetch("/api/stats"');
    expect(studioSource).toContain("formatGlobalGenerationTotal");
    expect(studioSource).toContain("global-stats-pill");
  });
});
