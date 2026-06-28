import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPromptShare } from "@/server/db/repositories";
import { fetchAsset } from "@/server/providers/types";
import { downloadStoredAsset } from "@/server/storage/s3";
import { GET } from "./route";

vi.mock("@/server/db/repositories", () => ({
  getPromptShare: vi.fn()
}));

vi.mock("@/server/providers/types", () => ({
  fetchAsset: vi.fn()
}));

vi.mock("@/server/storage/s3", () => ({
  downloadStoredAsset: vi.fn()
}));

describe("/api/shares/[id]/image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves an active share image from storage when a key is recorded", async () => {
    vi.mocked(getPromptShare).mockResolvedValueOnce({
      id: "share-1",
      prompt: "A blue circle",
      imageUrl: "https://cdn.example.com/generated/result.png",
      imageStorageKey: "generated/user-1/task-1/result.png",
      imageMimeType: "image/png",
      status: "active",
      createdAt: "2026-06-28T10:00:00.000Z"
    });
    vi.mocked(downloadStoredAsset).mockResolvedValueOnce({
      buffer: Buffer.from("stored-png"),
      mimeType: "image/png"
    });

    const response = await GET(
      new NextRequest("http://localhost/api/shares/share-1/image"),
      { params: Promise.resolve({ id: "share-1" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("stored-png");
    expect(downloadStoredAsset).toHaveBeenCalledWith("generated/user-1/task-1/result.png");
    expect(fetchAsset).not.toHaveBeenCalled();
  });

  it("returns not found for missing or reported shares", async () => {
    vi.mocked(getPromptShare).mockResolvedValueOnce(null);

    const response = await GET(
      new NextRequest("http://localhost/api/shares/missing/image"),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Share image not found"
      }
    });
    expect(downloadStoredAsset).not.toHaveBeenCalled();
    expect(fetchAsset).not.toHaveBeenCalled();
  });
});
