import { describe, expect, it } from "vitest";
import {
  buildCanvasMeta,
  buildCanvasHistoryThumbs,
  buildPreviewAssetUrl,
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

  it("selects the requested generated image when multiple results are visible", () => {
    expect(
      selectCanvasImage({
        images: [
          { key: "result-1", url: "https://cdn.lumio.games/result-1.png" },
          { key: "result-2", url: "https://cdn.lumio.games/result-2.png" }
        ],
        selectedImageIndex: 1,
        selectedInspirationImage: null
      })
    ).toEqual({
      key: "result-2",
      url: "https://cdn.lumio.games/result-2.png",
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
        taskId: "task-older",
        url: "https://cdn.lumio.games/older.png",
        originalUrl: "https://cdn.lumio.games/older.png",
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
        taskId: "task-older",
        url: "https://cdn.lumio.games/older.png",
        originalUrl: "https://cdn.lumio.games/older.png",
        prompt: "older icon",
        size: "2560 × 1920",
        status: "succeeded",
        createdAt: "2026-04-26T10:30:00.000Z"
      }
    ]);
  });

  it("builds inline preview URLs for stored assets that are not directly renderable", () => {
    expect(
      buildPreviewAssetUrl({
        storageKey: "generated/user-1/task-1/result.png",
        url: "s3://bucket/generated/user-1/task-1/result.png"
      })
    ).toBe(
      "/api/download?key=generated%2Fuser-1%2Ftask-1%2Fresult.png&disposition=inline"
    );
  });

  it("uses inline download previews for persisted s3 history thumbs", () => {
    expect(
      buildCanvasHistoryThumbs({
        canvasPrompt: null,
        images: [],
        history: [
          {
            id: "task-s3",
            prompt: "stored icon",
            status: "succeeded",
            assets: [
              {
                type: "result",
                storageKey: "generated/user-1/task-s3/result.png",
                url: "s3://bucket/generated/user-1/task-s3/result.png",
                mimeType: "image/png"
              }
            ]
          }
        ]
      })
    ).toEqual([
      {
        id: "task-s3-0",
        taskId: "task-s3",
        key: "generated/user-1/task-s3/result.png",
        url: "/api/download?key=generated%2Fuser-1%2Ftask-s3%2Fresult.png&disposition=inline",
        originalUrl: "s3://bucket/generated/user-1/task-s3/result.png",
        mimeType: "image/png",
        prompt: "stored icon",
        status: "succeeded"
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
