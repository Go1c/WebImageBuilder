import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uploadBuffer } from "./s3";

describe("local storage fallback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      LUMIO_LOCAL_MODE: "true",
      S3_BUCKET: "",
      S3_ACCESS_KEY_ID: "",
      S3_SECRET_ACCESS_KEY: ""
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns a data URL when S3 is not configured", async () => {
    const asset = await uploadBuffer({
      buffer: Buffer.from("fake image"),
      mimeType: "image/png",
      prefix: "generated/local-test"
    });

    expect(asset.key).toMatch(/^local\/generated\/local-test\//);
    expect(asset.url).toBe(`data:image/png;base64,${Buffer.from("fake image").toString("base64")}`);
    expect(asset.mimeType).toBe("image/png");
  });
});
