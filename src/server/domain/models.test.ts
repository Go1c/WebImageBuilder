import { describe, expect, it } from "vitest";
import {
  getGenerationTimeoutMs,
  getGenerationModeCapabilities,
  getModelOption,
  normalizeGenerationInput
} from "./models";

describe("model and generation request rules", () => {
  it("keeps GPT Image and Gemini behind stable UI model keys", () => {
    expect(getModelOption("gpt-image-2")).toMatchObject({
      key: "gpt-image-2",
      provider: "openai",
      label: "GPT Image 2",
      providerModel: "gpt-image-2"
    });

    expect(getModelOption("gemini-image")).toMatchObject({
      key: "gemini-image",
      provider: "gemini",
      label: "Gemini"
    });
  });

  it("requires reference images for image editing modes", () => {
    expect(() =>
      normalizeGenerationInput({
        prompt: "make it cinematic",
        mode: "image-to-image",
        model: "gemini-image",
        count: 1,
        size: "1024x1024",
        referenceAssets: []
      })
    ).toThrow(/reference image/i);
  });

  it("normalizes limits before requests reach provider adapters", () => {
    const input = normalizeGenerationInput({
      prompt: "  A red robot holding a skateboard  ",
      mode: "text-to-image",
      model: "gpt-image-2",
      count: 9,
      size: "1920x2560",
      resolution: "2K",
      quality: "high"
    });

    expect(input.prompt).toBe("A red robot holding a skateboard");
    expect(input.count).toBe(4);
    expect(input.size).toBe("1920x2560");
    expect(input.resolution).toBe("2K");
    expect(input.provider).toBe("openai");
    expect(input.providerModel).toBeDefined();
  });

  it("uses GPT Image 2 for every OpenAI image resolution", () => {
    const baseInput = {
      prompt: "A red robot",
      mode: "text-to-image" as const,
      model: "gpt-image-2" as const,
      size: "1024x1024" as const
    };

    expect(
      normalizeGenerationInput({
        ...baseInput,
        resolution: "1K"
      }).providerModel
    ).toBe("gpt-image-2");

    expect(
      normalizeGenerationInput({
        ...baseInput,
        size: "2048x1152",
        resolution: "2K"
      }).providerModel
    ).toBe("gpt-image-2");

    expect(
      normalizeGenerationInput({
        ...baseInput,
        size: "3840x2160",
        resolution: "4K"
      }).providerModel
    ).toBe("gpt-image-2");
  });

  it("uses the configured image request timeouts for each resolution", () => {
    expect(getGenerationTimeoutMs("1K")).toBe(250_000);
    expect(getGenerationTimeoutMs("2K")).toBe(240_000);
    expect(getGenerationTimeoutMs("4K")).toBe(240_000);
  });

  it("rejects malformed generation sizes", () => {
    expect(() =>
      normalizeGenerationInput({
        prompt: "A red robot",
        mode: "text-to-image",
        model: "gpt-image-2",
        size: "large"
      })
    ).toThrow();
  });

  it("rejects GPT Image 2 sizes outside official constraints before provider submission", () => {
    expect(() =>
      normalizeGenerationInput({
        prompt: "A red robot",
        mode: "text-to-image",
        model: "gpt-image-2",
        size: "3840x3840",
        resolution: "4K"
      })
    ).toThrow("8,294,400");

    expect(() =>
      normalizeGenerationInput({
        prompt: "A red robot",
        mode: "text-to-image",
        model: "gpt-image-2",
        size: "576x1024",
        resolution: "1K"
      })
    ).toThrow("655,360");

    expect(() =>
      normalizeGenerationInput({
        prompt: "A red robot",
        mode: "text-to-image",
        model: "gpt-image-2",
        size: "721x1280",
        resolution: "1K"
      })
    ).toThrow("16px");
  });

  it("accepts official-compliant GPT Image 2 sizes used by the studio matrix", () => {
    const baseInput = {
      prompt: "A red robot",
      mode: "text-to-image" as const,
      model: "gpt-image-2" as const,
      quality: "standard" as const
    };

    expect(normalizeGenerationInput({ ...baseInput, resolution: "1K", size: "720x1280" }).size).toBe(
      "720x1280"
    );
    expect(normalizeGenerationInput({ ...baseInput, resolution: "2K", size: "2048x1152" }).size).toBe(
      "2048x1152"
    );
    expect(normalizeGenerationInput({ ...baseInput, resolution: "4K", size: "2880x2880" }).size).toBe(
      "2880x2880"
    );
    expect(normalizeGenerationInput({ ...baseInput, resolution: "4K", size: "3264x2448" }).size).toBe(
      "3264x2448"
    );
    expect(normalizeGenerationInput({ ...baseInput, resolution: "4K", size: "2448x3264" }).size).toBe(
      "2448x3264"
    );
  });

  it("rejects old calculated 4K 4:3 and 3:4 generation sizes with direct guidance", () => {
    const baseInput = {
      prompt: "A red robot",
      mode: "text-to-image" as const,
      model: "gpt-image-2" as const,
      resolution: "4K" as const
    };

    expect(() => normalizeGenerationInput({ ...baseInput, size: "3840x2880" })).toThrow(
      "3264x2448"
    );
    expect(() => normalizeGenerationInput({ ...baseInput, size: "2880x3840" })).toThrow(
      "2448x3264"
    );
  });

  it("documents V1 and V1.1 capabilities separately", () => {
    expect(getGenerationModeCapabilities("text-to-image").release).toBe("v1");
    expect(getGenerationModeCapabilities("image-to-image").release).toBe("v1");
    expect(getGenerationModeCapabilities("inpaint").release).toBe("v1.1");
    expect(getGenerationModeCapabilities("variation").release).toBe("v1.1");
  });
});
