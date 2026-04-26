import { describe, expect, it } from "vitest";
import {
  buildLocalPortfolioItem,
  buildReferenceAssetDescriptor,
  getStudioActionStates,
  getZoomAction,
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
    const repeatedItems = Array.from({ length: 5 }).reduce(
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
      loading: true
    });

    expect(states.save).toEqual({
      enabled: false,
      label: "Save to portfolio",
      reason: "Wait for generation to finish before saving."
    });
    expect(states.referenceReuse).toEqual({
      enabled: false,
      label: "Use as reference",
      reason: "Wait for generation to finish before reusing this image as a reference."
    });
    expect(states.download).toEqual({
      enabled: false,
      label: "Download",
      reason: "Wait for generation to finish before downloading."
    });
    expect(states.delete).toEqual({
      enabled: false,
      label: "Delete",
      reason: "Wait for generation to finish before deleting."
    });
    expect(states.regenerate).toEqual({
      enabled: false,
      label: "Regenerate",
      reason: "Wait for the current generation to finish before regenerating."
    });
    expect(states.zoom).toEqual({
      enabled: false,
      label: "Open image",
      reason: "Wait for generation to finish before opening the image."
    });
  });

  it("computes image-dependent disabled action states when no canvas image exists", () => {
    expect(getStudioActionStates({ image: null, loading: false })).toEqual({
      save: {
        enabled: false,
        label: "Save to portfolio",
        reason: "No canvas image is available to save."
      },
      referenceReuse: {
        enabled: false,
        label: "Use as reference",
        reason: "No canvas image is available to use as a reference."
      },
      download: {
        enabled: false,
        label: "Download",
        reason: "No canvas image is available to download."
      },
      delete: {
        enabled: false,
        label: "Delete",
        reason: "No canvas image is available to delete."
      },
      regenerate: {
        enabled: false,
        label: "Regenerate",
        reason: "No canvas image is available to regenerate."
      },
      zoom: {
        enabled: false,
        label: "Open image",
        reason: "No canvas image is available to zoom."
      }
    });
  });
});
