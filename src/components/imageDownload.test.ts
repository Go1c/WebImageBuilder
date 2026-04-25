import { describe, expect, it, vi } from "vitest";
import { buildDownloadFileName, downloadGeneratedImage } from "./imageDownload";

describe("image download helper", () => {
  it("downloads data URL images without opening a new tab", async () => {
    const link = createFakeLink();

    await downloadGeneratedImage(
      {
        url: "data:image/png;base64,ZmFrZQ==",
        mimeType: "image/png"
      },
      0,
      {
        document: createFakeDocument(link)
      }
    );

    expect(link.href).toBe("data:image/png;base64,ZmFrZQ==");
    expect(link.download).toBe("lumio-result-01.png");
    expect(link.click).toHaveBeenCalledOnce();
  });

  it("downloads remote images through an object URL", async () => {
    const link = createFakeLink();
    const fetchMock = vi.fn(async () => new Response(new Blob(["fake"], { type: "image/webp" })));
    const createObjectURL = vi.fn(() => "blob:download-url");
    const revokeObjectURL = vi.fn();

    await downloadGeneratedImage(
      {
        url: "https://example.com/image.webp",
        mimeType: "image/webp"
      },
      2,
      {
        document: createFakeDocument(link),
        fetch: fetchMock,
        url: {
          createObjectURL,
          revokeObjectURL
        }
      }
    );

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/image.webp");
    expect(link.href).toBe("blob:download-url");
    expect(link.download).toBe("lumio-result-03.webp");
    expect(link.click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:download-url");
  });

  it("builds stable download file names", () => {
    expect(buildDownloadFileName({ url: "data:image/jpeg;base64,abc" }, 3)).toBe(
      "lumio-result-04.jpg"
    );
  });
});

function createFakeLink() {
  return {
    href: "",
    download: "",
    rel: "",
    click: vi.fn()
  };
}

function createFakeDocument(link: ReturnType<typeof createFakeLink>) {
  return {
    createElement: vi.fn(() => link)
  };
}
