import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ModelKey, NormalizedGenerationInput, Provider } from "../domain/models";
import { getImageProvider } from "./index";

const live = process.env.LIVE_IMAGE_SMOKE === "1";
if (live) {
  applyEnvLocal();
}

describe.skipIf(!live)("live Lumio image providers", { timeout: 180_000, sequential: true }, () => {

  it.each([
    {
      family: "Grok",
      keyName: "GROK_API_KEY",
      provider: "grok" as Provider,
      model: "grok-imagine-image-quality" as ModelKey
    },
    {
      family: "GPT",
      keyName: "OPENAI_API_KEY",
      provider: "openai" as Provider,
      model: "gpt-image-2.5" as ModelKey
    },
    {
      family: "Gemini",
      keyName: "GEMINI_API_KEY",
      provider: "gemini" as Provider,
      model: "gemini-3.1-flash-image" as ModelKey
    }
  ])("$family generates an image with the configured key", async ({ family, keyName, provider, model }) => {
    expect(process.env[keyName], `${family} missing ${keyName} in .env.local`).toBeTruthy();
    expect(String(process.env[keyName])).not.toContain(" ");

    const started = Date.now();
    const images = await getImageProvider(provider).generate(buildInput(model, provider));
    const elapsedMs = Date.now() - started;

    expect(images, family).toHaveLength(1);
    expect(images[0].buffer.length, family).toBeGreaterThan(8_000);
    expect(images[0].mimeType, family).toMatch(/^image\//);
    console.log(
      `[live-smoke] ${family} ${model} ${images[0].mimeType} ${images[0].buffer.length} bytes in ${elapsedMs}ms`
    );
  });
});

function buildInput(model: ModelKey, provider: Provider): NormalizedGenerationInput {
  return {
    prompt: "a red apple, studio lighting, simple still life",
    mode: "text-to-image",
    model,
    provider,
    providerModel: model,
    size: "1024x1024",
    resolution: "1K",
    quality: "standard",
    count: 1,
    referenceAssets: []
  };
}

function applyEnvLocal() {
  if (!existsSync(".env.local")) {
    return;
  }

  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
