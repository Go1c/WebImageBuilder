import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("share watermark style", () => {
  it("renders the compliance watermark diagonally over the shared image", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const watermarkStart = css.indexOf(".share-watermark");
    const nextRuleStart = css.indexOf("\n.", watermarkStart + 1);
    const rule = css.slice(watermarkStart, nextRuleStart);

    expect(rule).toContain("transform:");
    expect(rule).toContain("rotate(-");
  });
});
