import { describe, expect, it } from "vitest";
import { formatGlobalGenerationTotal } from "./studioStats";

describe("studio global generation stats", () => {
  it("formats the global generation total for the top bar", () => {
    expect(formatGlobalGenerationTotal(12345)).toBe("全站已生成 12,345 次");
  });

  it("formats a compact global generation total for narrow screens", () => {
    expect(formatGlobalGenerationTotal(12345, { compact: true })).toBe("12,345 次");
  });

  it("uses a stable loading placeholder", () => {
    expect(formatGlobalGenerationTotal(null)).toBe("全站已生成 -- 次");
  });
});
