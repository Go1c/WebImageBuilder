import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOwnedResultAsset } from "@/server/db/repositories";
import { fetchAsset } from "@/server/providers/types";
import { getRequestContext } from "@/server/request-context";
import { GET } from "./route";

vi.mock("@/server/db/repositories", () => ({
  getOwnedResultAsset: vi.fn()
}));

vi.mock("@/server/providers/types", () => ({
  fetchAsset: vi.fn()
}));

vi.mock("@/server/request-context", () => ({
  applyContextCookies: vi.fn((response) => response),
  getRequestContext: vi.fn()
}));

describe("/api/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequestContext).mockResolvedValue({
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
  });

  it("downloads an owned image as an attachment", async () => {
    vi.mocked(getOwnedResultAsset).mockResolvedValueOnce({
      storageKey: "generated/user-1/task-1/result.png",
      url: "https://cdn.example.com/generated/result.png",
      mimeType: "image/png"
    });
    vi.mocked(fetchAsset).mockResolvedValueOnce({
      buffer: Buffer.from("png-bytes"),
      mimeType: "image/png"
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/download?key=generated%2Fuser-1%2Ftask-1%2Fresult.png&filename=lumio-result-01.png"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="lumio-result-01.png"'
    );
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("png-bytes");
    expect(getOwnedResultAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "user",
        userId: "user-1"
      }),
      {
        storageKey: "generated/user-1/task-1/result.png",
        url: undefined
      }
    );
  });

  it("returns not found when the image does not belong to the current actor", async () => {
    vi.mocked(getOwnedResultAsset).mockResolvedValueOnce(null);

    const response = await GET(
      new NextRequest("http://localhost/api/download?url=https%3A%2F%2Fcdn.example.com%2Fimage.png")
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Image not found"
      }
    });
    expect(fetchAsset).not.toHaveBeenCalled();
  });
});
