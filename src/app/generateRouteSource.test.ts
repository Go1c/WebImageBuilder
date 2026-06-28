import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("generate API route source", () => {
  it("starts a background generation task instead of waiting for provider completion", () => {
    const source = readFileSync("src/app/api/generate/route.ts", "utf8");

    expect(source).toContain("startGeneration");
    expect(source).not.toContain("generateImagesForActor");
  });
});
