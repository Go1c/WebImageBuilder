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

  it("downloads remote images directly without requiring CORS fetch", async () => {
    const link = createFakeLink();
    const fetchMock = vi.fn();

    await downloadGeneratedImage(
      {
        url: "https://cdn.lumio.games/generated/image.png",
        mimeType: "image/png"
      },
      1,
      {
        document: createFakeDocument(link),
        fetch: fetchMock
      }
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(link.href).toBe("https://cdn.lumio.games/generated/image.png");
    expect(link.download).toBe("lumio-result-02.png");
    expect(link.click).toHaveBeenCalledOnce();
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
