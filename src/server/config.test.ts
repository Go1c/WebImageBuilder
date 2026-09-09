import { describe, expect, it } from "vitest";
import { getAppConfig } from "./config";

describe("app config", () => {
  it("reads a custom OpenAI-compatible image API base URL", () => {
    const config = getAppConfig({
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://api.lumio.games/"
    });

    expect(config.openaiBaseUrl).toBe("https://api.lumio.games");
    expect(config.grokApiKey).toBeUndefined();
  });

  it("reads an optional Grok image API key separately from OpenAI", () => {
    const config = getAppConfig({
      OPENAI_API_KEY: "openai-key",
      GROK_API_KEY: "grok-key"
    });

    expect(config.openaiApiKey).toBe("openai-key");
    expect(config.grokApiKey).toBe("grok-key");
  });

  it("keeps local fallback mode opt-in", () => {
    expect(getAppConfig({}).localMode).toBe(false);
    expect(getAppConfig({ LUMIO_LOCAL_MODE: "true" }).localMode).toBe(true);
  });
});
