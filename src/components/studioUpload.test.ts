import { describe, expect, it, vi } from "vitest";
import { uploadStudioAsset } from "./studioUpload";

describe("studio upload", () => {
  it("uploads reference files through the same-origin upload route", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        key: "reference/user-1/ref.png",
        url: "https://cdn.example.com/reference/user-1/ref.png",
        mimeType: "image/png"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadStudioAsset(
      new File([Buffer.from("fake image")], "ref.png", { type: "image/png" }),
      "reference"
    );

    expect(result).toEqual({
      key: "reference/user-1/ref.png",
      url: "https://cdn.example.com/reference/user-1/ref.png",
      mimeType: "image/png"
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/uploads",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData)
      })
    );

    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(body.get("assetType")).toBe("reference");
    expect(body.get("file")).toBeInstanceOf(File);
  });

  it("surfaces structured upload API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: "bad_request",
              message: "Unsupported image type"
            }
          },
          { status: 400 }
        )
      )
    );

    await expect(
      uploadStudioAsset(new File([Buffer.from("fake image")], "ref.gif", { type: "image/gif" }), "reference")
    ).rejects.toThrow("请求失败：400 - Unsupported image type");
  });
});
