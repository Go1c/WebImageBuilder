import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("root layout hydration source", () => {
  it("suppresses root attribute mismatches from browser-injected HTML attributes", () => {
    const layoutSource = readFileSync("src/app/layout.tsx", "utf8");

    expect(layoutSource).toContain("suppressHydrationWarning");
  });
});
