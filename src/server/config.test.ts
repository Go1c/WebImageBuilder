import { describe, expect, it } from "vitest";
import { getAppConfig } from "./config";

describe("app config", () => {
  it("reads a custom OpenAI-compatible image API base URL", () => {
    const config = getAppConfig({
      OPENAI_API_KEY: "test-key",
      OPENAI_BASE_URL: "https://img.fkcodex.com/"
    });

    expect(config.openaiBaseUrl).toBe("https://img.fkcodex.com");
  });

  it("keeps local fallback mode opt-in", () => {
    expect(getAppConfig({}).localMode).toBe(false);
    expect(getAppConfig({ LUMIO_LOCAL_MODE: "true" }).localMode).toBe(true);
  });
});
