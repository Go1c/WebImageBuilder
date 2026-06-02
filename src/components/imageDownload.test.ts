import { describe, expect, it, vi } from "vitest";
import { buildDownloadFileName, downloadGeneratedImage } from "./imageDownload";

describe("image download helper", () => {
  it("downloads data URL images directly without opening a new tab", async () => {
    const link = createFakeLink();

    const result = await downloadGeneratedImage(
      {
        url: "data:image/png;base64,ZmFrZQ==",
        mimeType: "image/png"
      },
      0,
      {
        document: createFakeDocument(link),
        now: new Date(2026, 3, 26, 19, 51, 30)
      }
    );

    expect(link.href).toBe("data:image/png;base64,ZmFrZQ==");
    expect(link.download).toBe("lumio-result-20260426-195130-01.png");
    expect(link.click).toHaveBeenCalledOnce();
    expect(result).toEqual({
      mode: "direct",
      fileName: "lumio-result-20260426-195130-01.png"
    });
  });

  it("opens the browser save dialog when the file picker API is available", async () => {
    const link = createFakeLink();
    const callOrder: string[] = [];
    const fetchMock = vi.fn(async () => {
      callOrder.push("fetch");
      return new Response(Buffer.from("fake image"), {
        status: 200,
        headers: {
          "Content-Type": "image/png"
        }
      });
    });
    const writable = {
      write: vi.fn(async () => {}),
      close: vi.fn(async () => {})
    };
    const showSaveFilePicker = vi.fn(async () => {
      callOrder.push("picker");
      return {
        createWritable: vi.fn(async () => writable)
      };
    });

    const result = await downloadGeneratedImage(
      {
        key: "generated/user-1/task-1/image.png",
        url: "https://cdn.lumio.games/generated/image.png",
        mimeType: "image/png"
      },
      0,
      {
        document: createFakeDocument(link),
        fetch: fetchMock,
        showSaveFilePicker,
        now: new Date(2026, 3, 26, 19, 51, 30)
      }
    );

    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: "lumio-result-20260426-195130-01.png",
      types: [
        {
          description: "Image",
          accept: {
            "image/png": [".png"]
          }
        }
      ]
    });
    expect(writable.write).toHaveBeenCalledOnce();
    expect(writable.close).toHaveBeenCalledOnce();
    expect(link.click).not.toHaveBeenCalled();
    expect(callOrder).toEqual(["picker", "fetch"]);
    expect(result).toEqual({
      mode: "picker",
      fileName: "lumio-result-20260426-195130-01.png"
    });
  });

  it("downloads owned remote images through the app download endpoint", async () => {
    vi.useFakeTimers();
    const link = createFakeLink();
    const fetchMock = vi.fn(async () =>
      new Response(Buffer.from("fake image"), {
        status: 200,
        headers: {
          "Content-Type": "image/png"
        }
      })
    );
    const urlApi = createFakeUrlApi();

    try {
      const result = await downloadGeneratedImage(
        {
          key: "generated/user-1/task-1/image.png",
          url: "https://cdn.lumio.games/generated/image.png",
          mimeType: "image/png"
        },
        1,
        {
          document: createFakeDocument(link),
          fetch: fetchMock,
          url: urlApi,
          now: new Date(2026, 3, 26, 19, 51, 30)
        }
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/download?key=generated%2Fuser-1%2Ftask-1%2Fimage.png&filename=lumio-result-20260426-195130-02.png",
        { cache: "no-store" }
      );
      expect(urlApi.createObjectURL).toHaveBeenCalledOnce();
      expect(link.href).toBe("blob:download-1");
      expect(link.download).toBe("lumio-result-20260426-195130-02.png");
      expect(link.click).toHaveBeenCalledOnce();
      expect(result).toEqual({
        mode: "blob",
        fileName: "lumio-result-20260426-195130-02.png"
      });

      await vi.runAllTimersAsync();
      expect(urlApi.revokeObjectURL).toHaveBeenCalledWith("blob:download-1");
    } finally {
      vi.useRealTimers();
    }
  });

  it("falls back to fetching the original image when the app download endpoint cannot serve it", async () => {
    const link = createFakeLink();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "not_found" } }), {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        })
      )
      .mockResolvedValueOnce(
        new Response(Buffer.from("fake image"), {
          status: 200,
          headers: {
            "Content-Type": "image/png"
          }
        })
      );
    const urlApi = createFakeUrlApi();

    const result = await downloadGeneratedImage(
      {
        url: "https://cdn.lumio.games/generated/image.png",
        mimeType: "image/png"
      },
      1,
      {
        document: createFakeDocument(link),
        fetch: fetchMock,
        url: urlApi,
        now: new Date(2026, 3, 26, 19, 51, 30)
      }
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/download?url=https%3A%2F%2Fcdn.lumio.games%2Fgenerated%2Fimage.png&filename=lumio-result-20260426-195130-02.png",
      { cache: "no-store" }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://cdn.lumio.games/generated/image.png", {
      cache: "no-store"
    });
    expect(link.href).toBe("blob:download-1");
    expect(link.download).toBe("lumio-result-20260426-195130-02.png");
    expect(link.click).toHaveBeenCalledOnce();
    expect(result).toEqual({
      mode: "blob",
      fileName: "lumio-result-20260426-195130-02.png"
    });
  });

  it("opens the original image URL in a new tab when every download path fails", async () => {
    const link = createFakeLink();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network failed"));
    const openWindow = vi.fn(() => ({}));

    const result = await downloadGeneratedImage(
      {
        url: "https://cdn.lumio.games/generated/image.png",
        mimeType: "image/png"
      },
      2,
      {
        document: createFakeDocument(link),
        fetch: fetchMock,
        openWindow,
        url: createFakeUrlApi(),
        now: new Date(2026, 3, 26, 19, 51, 30)
      }
    );

    expect(link.click).not.toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith(
      "https://cdn.lumio.games/generated/image.png",
      "_blank",
      "noopener,noreferrer"
    );
    expect(result).toEqual({
      mode: "opened",
      fileName: "lumio-result-20260426-195130-03.png"
    });
  });

  it("treats noopener new-tab fallback as opened even when the browser returns null", async () => {
    const link = createFakeLink();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network failed"));
    const openWindow = vi.fn(() => null);

    const result = await downloadGeneratedImage(
      {
        url: "https://cdn.lumio.games/generated/image.png",
        mimeType: "image/png"
      },
      3,
      {
        document: createFakeDocument(link),
        fetch: fetchMock,
        openWindow,
        url: createFakeUrlApi(),
        now: new Date(2026, 3, 26, 19, 51, 30)
      }
    );

    expect(openWindow).toHaveBeenCalledWith(
      "https://cdn.lumio.games/generated/image.png",
      "_blank",
      "noopener,noreferrer"
    );
    expect(result).toEqual({
      mode: "opened",
      fileName: "lumio-result-20260426-195130-04.png"
    });
  });

  it("builds stable download file names", () => {
    expect(buildDownloadFileName({ url: "data:image/jpeg;base64,abc" }, 3, new Date(2026, 3, 26, 19, 51, 30))).toBe(
      "lumio-result-20260426-195130-04.jpg"
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

function createFakeUrlApi() {
  return {
    createObjectURL: vi.fn(() => "blob:download-1"),
    revokeObjectURL: vi.fn()
  };
}