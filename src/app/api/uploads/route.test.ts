import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordUploadedAsset } from "@/server/db/repositories";
import { getRequestContext } from "@/server/request-context";
import { uploadBuffer } from "@/server/storage/s3";
import { POST } from "./route";

vi.mock("@/server/db/repositories", () => ({
  recordUploadedAsset: vi.fn()
}));

vi.mock("@/server/request-context", () => ({
  applyContextCookies: vi.fn((response) => response),
  getRequestContext: vi.fn()
}));

vi.mock("@/server/storage/s3", () => ({
  uploadBuffer: vi.fn()
}));

describe("/api/uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a reference image server-side and records the asset", async () => {
    vi.mocked(getRequestContext).mockResolvedValueOnce({
      actor: {
        type: "user",
        userId: "user-1",
        externalUserId: "sub2api:1",
        deviceId: "device-1",
        ipHash: "ip-hash"
      },
      deviceId: "device-1",
      isNewDevice: false,
      ipHash: "ip-hash"
    });
    vi.mocked(uploadBuffer).mockResolvedValueOnce({
      key: "reference/user-1/ref.png",
      url: "https://cdn.example.com/reference/user-1/ref.png",
      mimeType: "image/png"
    });

    const form = new FormData();
    form.set("assetType", "reference");
    form.set("file", new File([Buffer.from("fake image")], "ref.png", { type: "image/png" }));

    const response = await POST(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        body: form
      }) as NextRequest
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      key: "reference/user-1/ref.png",
      url: "https://cdn.example.com/reference/user-1/ref.png",
      mimeType: "image/png"
    });
    expect(uploadBuffer).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
      mimeType: "image/png",
      prefix: "reference/user-1"
    });
    expect(recordUploadedAsset).toHaveBeenCalledWith({
      userId: "user-1",
      anonymousDeviceId: null,
      assetType: "reference",
      storageKey: "reference/user-1/ref.png",
      url: "https://cdn.example.com/reference/user-1/ref.png",
      mimeType: "image/png"
    });
  });

  it("rejects unsupported image types before uploading", async () => {
    vi.mocked(getRequestContext).mockResolvedValueOnce({
      actor: {
        type: "anonymous",
        anonymousDeviceId: "anon-1",
        deviceId: "device-1",
        ipHash: "ip-hash"
      },
      deviceId: "device-1",
      isNewDevice: false,
      ipHash: "ip-hash"
    });
    const form = new FormData();
    form.set("assetType", "reference");
    form.set("file", new File([Buffer.from("fake image")], "ref.gif", { type: "image/gif" }));

    const response = await POST(
      new Request("http://localhost/api/uploads", {
        method: "POST",
        body: form
      }) as NextRequest
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "bad_request",
        message: "Unsupported image type"
      }
    });
    expect(uploadBuffer).not.toHaveBeenCalled();
  });
});
