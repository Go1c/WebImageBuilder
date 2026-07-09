import { describe, expect, it } from "vitest";
import {
  buildGenerationInput,
  buildImagesResponse,
  extractImageUrls,
  parseSize,
  resolutionForSize,
  resolveModelKey
} from "./openaiImageAdapter";

describe("canvas OpenAI image adapter", () => {
  it("maps supported and provider model names, defaulting safely", () => {
    expect(resolveModelKey("gpt-image-2")).toBe("gpt-image-2");
    expect(resolveModelKey("gpt-image-2-4k")).toBe("gpt-image-2-4k");
    expect(resolveModelKey("something-unknown")).toBe("gpt-image-2");
    expect(resolveModelKey(undefined)).toBe("gpt-image-2");
  });

  it("parses sizes and derives the resolution tier", () => {
    expect(parseSize("2048x2048")).toBe("2048x2048");
    expect(parseSize("bogus")).toBe("1024x1024");
    expect(resolutionForSize("1024x1024")).toBe("1K");
    expect(resolutionForSize("1536x2048")).toBe("2K");
    expect(resolutionForSize("4096x4096")).toBe("4K");
  });

  it("builds a valid internal generation input from an OpenAI request", () => {
    const input = buildGenerationInput({ prompt: "  a white cat  ", model: "gpt-image-2-2k", size: "2048x2048", n: 3, quality: "hd" });
    expect(input).toMatchObject({
      prompt: "a white cat",
      mode: "text-to-image",
      model: "gpt-image-2-2k",
      size: "2048x2048",
      resolution: "2K",
      quality: "high",
      count: 3,
      referenceAssets: []
    });
  });

  it("clamps count to 1..4 and defaults quality to standard", () => {
    expect(buildGenerationInput({ prompt: "x", n: 99 }).count).toBe(4);
    expect(buildGenerationInput({ prompt: "x", n: 0 }).count).toBe(1);
    expect(buildGenerationInput({ prompt: "x" }).quality).toBe("standard");
  });

  it("extracts image urls from either assets or images arrays", () => {
    expect(extractImageUrls({ assets: [{ url: "https://a/1.png" }, { url: "" }, {}] })).toEqual(["https://a/1.png"]);
    expect(extractImageUrls({ images: [{ url: "https://b/2.png" }] })).toEqual(["https://b/2.png"]);
    expect(extractImageUrls(null)).toEqual([]);
  });

  it("shapes urls into an OpenAI images response body", () => {
    expect(buildImagesResponse(["https://a/1.png"], 1720000000)).toEqual({
      created: 1720000000,
      data: [{ url: "https://a/1.png" }]
    });
  });
});
