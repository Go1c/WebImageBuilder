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

  it("fits shared images inside the preview instead of cropping their top or bottom", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const protectedImageStart = css.indexOf(".share-protected-image");
    const protectedImageEnd = css.indexOf("\n.", protectedImageStart + 1);
    const protectedImageRule = css.slice(protectedImageStart, protectedImageEnd);
    const dialogImageStart = css.indexOf(".prompt-share-card-preview img");
    const dialogImageEnd = css.indexOf("\n.", dialogImageStart + 1);
    const dialogImageRule = css.slice(dialogImageStart, dialogImageEnd);

    expect(protectedImageRule).toContain("background-size: contain");
    expect(protectedImageRule).not.toContain("background-size: cover");
    expect(dialogImageRule).toContain("object-fit: contain");
    expect(dialogImageRule).not.toContain("object-fit: cover");
  });
});
