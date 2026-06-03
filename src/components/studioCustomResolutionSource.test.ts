import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/ImageStudio.tsx", "utf8");

function readFunctionSource(name: string): string {
  const functionStart = source.indexOf(`function ${name}`);
  const nextFunctionStart = source.indexOf("\n  function ", functionStart + 1);

  if (functionStart === -1) {
    return "";
  }

  return source.slice(functionStart, nextFunctionStart === -1 ? undefined : nextFunctionStart);
}

describe("ImageStudio custom resolution controls", () => {
  it("renders a custom resolution button and width-height inputs", () => {
    expect(source).toContain("custom-resolution-button");
    expect(source).toContain("custom-size-fields");
    expect(source).toContain("自定义分辨率");
    expect(source).toContain("customWidth");
    expect(source).toContain("customHeight");
  });

  it("validates custom sizes before the generation request starts", () => {
    const handler = readFunctionSource("handleGenerate");

    expect(handler).toContain("validateCustomGenerationSize");
    expect(handler).toContain("getCustomSizeUnsupportedMessage");
    expect(handler).toContain('title: "分辨率不支持"');
    expect(handler.indexOf("validateCustomGenerationSize")).toBeLessThan(handler.indexOf("setLoading(true)"));
  });

  it("sends the inferred resolution tier with a custom size", () => {
    const handler = readFunctionSource("handleGenerate");

    expect(source).toContain("effectiveResolution");
    expect(source).toContain("getEffectiveResolutionTier");
    expect(handler).toContain("resolution: effectiveResolution");
  });
});
