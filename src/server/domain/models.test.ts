import { describe, expect, it } from "vitest";
import {
  clampResolutionForModel,
  DEFAULT_IMAGE_MODEL,
  getGenerationTimeoutMs,
  getGenerationModeCapabilities,
  getGrokBillingSize,
  getModelOption,
  listModelOptionsByGroup,
  nextStudioModelForResolutionChange,
  normalizeGenerationInput
} from "./models";

describe("model and generation request rules", () => {
  it("exposes the selectable concrete image model keys", () => {
    expect(getModelOption("gpt-image-2")).toMatchObject({
      key: "gpt-image-2",
      provider: "openai",
      label: "gpt-image-2",
      providerModel: "gpt-image-2"
    });

    expect(getModelOption("gpt-image-2-2k")).toMatchObject({
      key: "gpt-image-2-2k",
      provider: "openai",
      providerModel: "gpt-image-2-2k"
    });

    expect(getModelOption("gpt-image-2-4k")).toMatchObject({
      key: "gpt-image-2-4k",
      provider: "openai",
      providerModel: "gpt-image-2-4k"
    });

    expect(getModelOption("gemini-3.1-flash-image-preview")).toMatchObject({
      key: "gemini-3.1-flash-image-preview",
      provider: "gemini",
      providerModel: "gemini-3.1-flash-image-preview"
    });

    expect(getModelOption("gpt-image-2.5")).toMatchObject({
      key: "gpt-image-2.5",
      group: "GPT",
      provider: "openai",
      providerModel: "gpt-image-2.5"
    });

    expect(getModelOption("gemini-3-pro-image")).toMatchObject({
      key: "gemini-3-pro-image",
      group: "Gemini",
      provider: "gemini"
    });

    expect(getModelOption("gemini-3.1-flash-image")).toMatchObject({
      key: "gemini-3.1-flash-image",
      group: "Gemini",
      provider: "gemini"
    });

    expect(getModelOption("grok-imagine-image-quality")).toMatchObject({
      key: "grok-imagine-image-quality",
      group: "Grok",
      provider: "grok",
      providerModel: "grok-imagine-image-quality"
    });

    expect(getModelOption("grok-imagine-image")).toMatchObject({
      provider: "grok",
      group: "Grok"
    });

    expect(getModelOption("grok-imagine")).toMatchObject({
      provider: "grok",
      group: "Grok"
    });
  });

  it("groups selectable models as GPT, Gemini, then Grok", () => {
    const groups = listModelOptionsByGroup();

    expect(groups.map((entry) => entry.group)).toEqual(["GPT", "Gemini", "Grok"]);
    expect(DEFAULT_IMAGE_MODEL).toBe("gpt-image-2.5");
    expect(groups[0].models.map((model) => model.key)).toEqual([
      "gpt-image-2.5",
      "gpt-image-2",
      "gpt-image-2-2k",
      "gpt-image-2-4k"
    ]);
    expect(groups[1].models.map((model) => model.key)).toEqual([
      "gemini-3.1-flash-image-preview",
      "gemini-3-pro-image",
      "gemini-3.1-flash-image"
    ]);
    expect(groups[2].models.map((model) => model.key)).toEqual([
      "grok-imagine-image-quality",
      "grok-imagine-image",
      "grok-imagine"
    ]);
  });

  it("rejects unknown generation models", () => {
    expect(() =>
      normalizeGenerationInput({
        prompt: "A red robot",
        mode: "text-to-image",
        model: "grok-imagine-edit",
        size: "1024x1024"
      })
    ).toThrow();
  });

  it("requires reference images for image editing modes", () => {
    expect(() =>
      normalizeGenerationInput({
        prompt: "make it cinematic",
        mode: "image-to-image",
        model: "gemini-3.1-flash-image-preview",
        count: 1,
        size: "1024x1024",
        referenceAssets: []
      })
    ).toThrow(/reference image/i);
  });

  it("normalizes generation input before requests reach provider adapters", () => {
    const input = normalizeGenerationInput({
      prompt: "  A red robot holding a skateboard  ",
      mode: "text-to-image",
      model: "gpt-image-2",
      count: 4,
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

  it("rejects generation counts above the supported 1-4 range", () => {
    expect(() =>
      normalizeGenerationInput({
        prompt: "A red robot",
        mode: "text-to-image",
        model: "gpt-image-2",
        count: 5,
        size: "1024x1024"
      })
    ).toThrow();
  });

  it("uses the selected concrete OpenAI model as the provider model", () => {
    const baseInput = {
      prompt: "A red robot",
      mode: "text-to-image" as const,
      size: "1024x1024" as const
    };

    expect(
      normalizeGenerationInput({
        ...baseInput,
        model: "gpt-image-2",
        resolution: "1K"
      }).providerModel
    ).toBe("gpt-image-2");

    expect(
      normalizeGenerationInput({
        ...baseInput,
        model: "gpt-image-2-2k",
        size: "2048x1152",
        resolution: "2K"
      }).providerModel
    ).toBe("gpt-image-2-2k");

    expect(
      normalizeGenerationInput({
        ...baseInput,
        model: "gpt-image-2-4k",
        size: "3840x2160",
        resolution: "4K"
      }).providerModel
    ).toBe("gpt-image-2-4k");
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

  it("does not apply GPT Image 2 pixel limits to Grok models", () => {
    expect(
      normalizeGenerationInput({
        prompt: "A red robot",
        mode: "text-to-image",
        model: "grok-imagine-image-quality",
        size: "576x1024",
        resolution: "1K"
      }).provider
    ).toBe("grok");
  });

  it("maps Grok billing size to 1K or 2K and clamps 4K", () => {
    expect(getGrokBillingSize("1K")).toBe("1K");
    expect(getGrokBillingSize("2K")).toBe("2K");
    expect(getGrokBillingSize("4K")).toBe("2K");
    expect(clampResolutionForModel("grok-imagine-image", "4K")).toBe("2K");
    expect(clampResolutionForModel("gpt-image-2", "4K")).toBe("4K");
    expect(clampResolutionForModel("gemini-3-pro-image", "4K")).toBe("4K");
  });

  it("only remaps GPT Image 2 family models when the studio resolution changes", () => {
    expect(nextStudioModelForResolutionChange("gpt-image-2", "2K")).toBe("gpt-image-2-2k");
    expect(nextStudioModelForResolutionChange("gpt-image-2-4k", "1K")).toBe("gpt-image-2");
    expect(nextStudioModelForResolutionChange("gpt-image-2.5", "4K")).toBe("gpt-image-2.5");
    expect(nextStudioModelForResolutionChange("gemini-3-pro-image", "2K")).toBe("gemini-3-pro-image");
    expect(nextStudioModelForResolutionChange("grok-imagine-image-quality", "2K")).toBe(
      "grok-imagine-image-quality"
    );
  });

  it("documents V1 and V1.1 capabilities separately", () => {
    expect(getGenerationModeCapabilities("text-to-image").release).toBe("v1");
    expect(getGenerationModeCapabilities("image-to-image").release).toBe("v1");
    expect(getGenerationModeCapabilities("inpaint").release).toBe("v1.1");
    expect(getGenerationModeCapabilities("variation").release).toBe("v1.1");
  });
});
