import { describe, expect, it } from "vitest";
import {
  buildLocalPortfolioItem,
  buildReferenceAssetDescriptor,
  getStudioActionStates,
  getZoomAction,
  type LocalPortfolioItem,
  upsertLocalPortfolioItem
} from "./studioActions";

describe("studio action helpers", () => {
  it("builds a stable portfolio item from the current canvas image", () => {
    const image = {
      url: "https://cdn.lumio.games/generated/city.png",
      mimeType: "image/png"
    };

    const item = buildLocalPortfolioItem({
      image,
      prompt: "cinematic city",
      savedAt: "2026-04-26T09:30:00.000Z"
    });
    const laterItem = buildLocalPortfolioItem({
      image,
      prompt: "updated prompt",
      savedAt: "2026-04-26T10:30:00.000Z"
    });

    expect(item).toEqual({
      id: item.id,
      url: "https://cdn.lumio.games/generated/city.png",
      mimeType: "image/png",
      prompt: "cinematic city",
      savedAt: "2026-04-26T09:30:00.000Z"
    });
    expect(item.id).toMatch(/^portfolio-/);
    expect(laterItem.id).toBe(item.id);
  });

  it("updates an existing portfolio item instead of appending duplicate URLs", () => {
    const first = buildLocalPortfolioItem({
      image: { url: "https://cdn.lumio.games/generated/city.png", mimeType: "image/png" },
      prompt: "first prompt",
      savedAt: "2026-04-26T09:30:00.000Z"
    });
    const duplicate = buildLocalPortfolioItem({
      image: { url: "https://cdn.lumio.games/generated/city.png", mimeType: "image/png" },
      prompt: "latest prompt",
      savedAt: "2026-04-26T10:30:00.000Z"
    });
    const other = buildLocalPortfolioItem({
      image: { url: "https://cdn.lumio.games/generated/other.webp", mimeType: "image/webp" },
      prompt: "other prompt",
      savedAt: "2026-04-26T08:30:00.000Z"
    });

    const items = upsertLocalPortfolioItem([other, first], duplicate);
    const repeatedItems = Array.from({ length: 5 }).reduce<LocalPortfolioItem[]>(
      (currentItems) => upsertLocalPortfolioItem(currentItems, duplicate),
      items
    );

    expect(items).toEqual([
      {
        ...duplicate,
        prompt: "latest prompt",
        savedAt: "2026-04-26T10:30:00.000Z"
      },
      other
    ]);
    expect(repeatedItems.filter((item) => item.url === duplicate.url)).toHaveLength(1);
  });

  it("returns a reusable reference descriptor when a canvas image exists", () => {
    expect(
      buildReferenceAssetDescriptor({
        image: {
          key: "generated/result-key",
          url: "https://cdn.lumio.games/generated/city.png",
          mimeType: "image/png"
        },
        prompt: "cinematic city"
      })
    ).toEqual({
      ok: true,
      reference: {
        key: "generated/result-key",
        url: "https://cdn.lumio.games/generated/city.png",
        mimeType: "image/png",
        prompt: "cinematic city",
        source: "canvas"
      }
    });
  });

  it("returns a clear reference reuse reason when no canvas image exists", () => {
    expect(buildReferenceAssetDescriptor({ image: null, prompt: "cinematic city" })).toEqual({
      ok: false,
      reason: "No canvas image is available to use as a reference."
    });
  });

  it("returns the zoom URL when a canvas image exists", () => {
    expect(
      getZoomAction({
        image: {
          url: "https://cdn.lumio.games/generated/city.png",
          mimeType: "image/png"
        }
      })
    ).toEqual({
      enabled: true,
      url: "https://cdn.lumio.games/generated/city.png"
    });
  });

  it("returns a disabled zoom reason when no canvas image exists", () => {
    expect(getZoomAction({ image: null })).toEqual({
      enabled: false,
      reason: "No canvas image is available to zoom."
    });
  });

  it("computes disabled action states with explicit reasons while loading", () => {
    const states = getStudioActionStates({
      image: {
        url: "https://cdn.lumio.games/generated/city.png",
        mimeType: "image/png"
      },
      canRegenerate: true,
      loading: true
    });

    expect(states.save).toEqual({
      enabled: false,
      label: "保存到作品集",
      reason: "生成完成后才能保存。"
    });
    expect(states.share).toEqual({
      enabled: false,
      label: "分享提示词",
      reason: "生成完成后才能分享。"
    });
    expect(states.referenceReuse).toEqual({
      enabled: false,
      label: "用作参考图",
      reason: "生成完成后才能用作参考图。"
    });
    expect(states.download).toEqual({
      enabled: false,
      label: "下载图片",
      reason: "生成完成后才能下载。"
    });
    expect(states.delete).toEqual({
      enabled: false,
      label: "删除当前图片",
      reason: "生成完成后才能删除。"
    });
    expect(states.regenerate).toEqual({
      enabled: false,
      label: "重新生成",
      reason: "当前生成完成后才能重新生成。"
    });
    expect(states.zoom).toEqual({
      enabled: false,
      label: "打开大图",
      reason: "生成完成后才能打开大图。"
    });
  });

  it("enables image actions for library preview images", () => {
    const states = getStudioActionStates({
      image: {
        url: "/prompt-library/case1.jpg",
        mimeType: "image/jpeg"
      },
      canRegenerate: true,
      loading: false
    });

    expect(states.save).toEqual({ enabled: true, label: "保存到作品集" });
    expect(states.share).toEqual({
      enabled: false,
      label: "分享提示词",
      reason: "只有生成完成的图片可以分享。"
    });
    expect(states.referenceReuse).toEqual({ enabled: true, label: "用作参考图" });
    expect(states.download).toEqual({ enabled: true, label: "下载图片" });
    expect(states.delete).toEqual({ enabled: true, label: "删除当前图片" });
    expect(states.regenerate).toEqual({ enabled: true, label: "重新生成" });
  });

  it("enables sharing only when the canvas image is tied to a generated task", () => {
    const states = getStudioActionStates({
      image: {
        key: "generated/result-key",
        url: "https://cdn.lumio.games/generated/city.png",
        mimeType: "image/png"
      },
      canRegenerate: true,
      canShare: true,
      loading: false
    });

    expect(states.share).toEqual({
      enabled: true,
      label: "分享提示词"
    });
  });

  it("disables sharing when the generated task is not available", () => {
    const states = getStudioActionStates({
      image: {
        key: "generated/result-key",
        url: "https://cdn.lumio.games/generated/city.png",
        mimeType: "image/png"
      },
      canRegenerate: true,
      canShare: false,
      loading: false
    });

    expect(states.share).toEqual({
      enabled: false,
      label: "分享提示词",
      reason: "只有生成完成的图片可以分享。"
    });
  });

  it("enables regenerate without a canvas image when regeneration is available", () => {
    const states = getStudioActionStates({
      image: null,
      canRegenerate: true,
      loading: false
    });

    expect(states.regenerate).toEqual({
      enabled: true,
      label: "重新生成"
    });
  });

  it("computes image-dependent disabled action states when no canvas image exists", () => {
    expect(getStudioActionStates({ image: null, canRegenerate: false, loading: false })).toEqual({
      save: {
        enabled: false,
        label: "保存到作品集",
        reason: "画布上没有可保存的图片。"
      },
      share: {
        enabled: false,
        label: "分享提示词",
        reason: "画布上没有可分享的图片。"
      },
      referenceReuse: {
        enabled: false,
        label: "用作参考图",
        reason: "画布上没有可用作参考图的图片。"
      },
      download: {
        enabled: false,
        label: "下载图片",
        reason: "画布上没有可下载的图片。"
      },
      delete: {
        enabled: false,
        label: "删除当前图片",
        reason: "画布上没有可删除的图片。"
      },
      regenerate: {
        enabled: false,
        label: "重新生成",
        reason: "没有可用于重新生成的提示词。"
      },
      zoom: {
        enabled: false,
        label: "打开大图",
        reason: "画布上没有可打开的大图。"
      }
    });
  });
});
