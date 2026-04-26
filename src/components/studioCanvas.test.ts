import { describe, expect, it } from "vitest";
import {
  buildCanvasMeta,
  buildCanvasHistoryThumbs,
  getCanvasLoadingWarningText,
  getCanvasPlaceholderText,
  selectCanvasImage,
  selectVisibleCanvasImage
} from "./studioCanvas";

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

  it("does not show the empty preview label behind the loading state", () => {
    expect(getCanvasPlaceholderText({ loading: true })).toBeNull();
    expect(getCanvasPlaceholderText({ loading: false })).toBe("生成预览");
  });

  it("shows a refresh warning only while generation is loading", () => {
    expect(getCanvasLoadingWarningText({ loading: true })).toBe("受网络延迟等原因，生图过程中请勿刷新浏览器，可能会多次扣费。");
    expect(getCanvasLoadingWarningText({ loading: false })).toBeNull();
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

  it("preserves history metadata for selected canvas thumbs", () => {
    expect(
      buildCanvasHistoryThumbs({
        canvasPrompt: null,
        images: [],
        history: [
          {
            id: "task-older",
            prompt: "older icon",
            status: "succeeded",
            createdAt: "2026-04-26T10:30:00.000Z",
            params: { size: "2560x1920" },
            assets: [{ type: "result", url: "https://cdn.lumio.games/older.png" }]
          }
        ]
      })
    ).toEqual([
      {
        id: "task-older-0",
        url: "https://cdn.lumio.games/older.png",
        prompt: "older icon",
        size: "2560 × 1920",
        status: "succeeded",
        createdAt: "2026-04-26T10:30:00.000Z"
      }
    ]);
  });

  it("uses the selected history thumb meta instead of the active loading state", () => {
    expect(
      buildCanvasMeta({
        activeSizeMeta: "1024 × 1024",
        loading: true,
        loadingSeconds: 8,
        selectedHistoryThumb: {
          id: "task-older-0",
          url: "https://cdn.lumio.games/older.png",
          size: "2560 × 1920",
          status: "succeeded",
          createdAt: "2026-04-26T10:30:00.000Z"
        }
      })
    ).toEqual({
      size: "2560 × 1920",
      timing: "历史",
      status: "已完成"
    });
  });
});
