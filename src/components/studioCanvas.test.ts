import { describe, expect, it } from "vitest";
import { buildCanvasHistoryThumbs, selectCanvasImage, selectVisibleCanvasImage } from "./studioCanvas";

describe("studio canvas helpers", () => {
  it("does not select a default image before the user generates or chooses one", () => {
    expect(selectCanvasImage({ images: [], selectedInspirationImage: null })).toBeNull();
  });

  it("prefers generated images over selected inspiration images", () => {
    expect(
      selectCanvasImage({
        images: [{ url: "https://cdn.lumio.games/result.png", mimeType: "image/png" }],
        selectedInspirationImage: "/prompt-library/case1.jpg"
      })
    ).toEqual({
      url: "https://cdn.lumio.games/result.png",
      mimeType: "image/png"
    });
  });

  it("preserves generated image keys for later reference reuse", () => {
    expect(
      selectCanvasImage({
        images: [
          {
            key: "generated/result-key",
            url: "https://cdn.lumio.games/result.png",
            mimeType: "image/png"
          }
        ],
        selectedInspirationImage: null
      })
    ).toEqual({
      key: "generated/result-key",
      url: "https://cdn.lumio.games/result.png",
      mimeType: "image/png"
    });
  });

  it("hides the previous canvas image while a new generation is loading", () => {
    expect(
      selectVisibleCanvasImage({
        canvasImage: {
          key: "previous",
          url: "https://cdn.lumio.games/previous.png",
          mimeType: "image/png"
        },
        loading: true
      })
    ).toBeNull();
  });

  it("deduplicates generated and persisted history thumbs by URL", () => {
    expect(
      buildCanvasHistoryThumbs({
        canvasPrompt: "hero icon",
        images: [
          {
            key: "current",
            url: "https://cdn.lumio.games/current.png",
            mimeType: "image/png"
          }
        ],
        history: [
          {
            id: "task-current",
            prompt: "hero icon",
            assets: [{ type: "result", url: "https://cdn.lumio.games/current.png" }]
          },
          {
            id: "task-older",
            prompt: "older icon",
            assets: [{ type: "result", url: "https://cdn.lumio.games/older.png" }]
          }
        ]
      })
    ).toEqual([
      {
        id: "generated-current",
        url: "https://cdn.lumio.games/current.png",
        mimeType: "image/png",
        prompt: "hero icon"
      },
      {
        id: "task-older-0",
        url: "https://cdn.lumio.games/older.png",
        prompt: "older icon"
      }
    ]);
  });
});
