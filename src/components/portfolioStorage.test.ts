import { describe, expect, it, vi } from "vitest";
import {
  createPortfolioAssetUrl,
  isPortfolioAssetUrl,
  loadSavedPortfolioItems,
  savePortfolioItems,
  type PortfolioAssetStore,
  type PortfolioStorage
} from "./portfolioStorage";
import type { LocalPortfolioItem } from "./studioActions";

describe("portfolio storage", () => {
  it("stores inline image data outside localStorage before persisting portfolio metadata", async () => {
    const inlineUrl = `data:image/png;base64,${"a".repeat(1024)}`;
    const storage = createMemoryStorage();
    const assetStore = createMemoryAssetStore();
    const item: LocalPortfolioItem = {
      id: "portfolio-inline",
      url: inlineUrl,
      mimeType: "image/png",
      prompt: "large local result",
      savedAt: "2026-04-26T12:00:00.000Z"
    };

    const savedItems = await savePortfolioItems({
      items: [item],
      storage,
      assetStore
    });

    const rawStorageValue = storage.values.get("lumio:portfolio") || "";
    expect(rawStorageValue).not.toContain(inlineUrl);
    expect(rawStorageValue).toContain(createPortfolioAssetUrl(item.id));
    expect(assetStore.putAsset).toHaveBeenCalledWith({
      key: item.id,
      url: inlineUrl,
      mimeType: "image/png"
    });
    expect(savedItems).toEqual([item]);
  });

  it("hydrates saved inline portfolio images from the asset store", async () => {
    const inlineUrl = "data:image/png;base64,ZmFrZQ==";
    const storage = createMemoryStorage();
    const assetStore = createMemoryAssetStore();
    const persistedItem: LocalPortfolioItem = {
      id: "portfolio-inline",
      url: createPortfolioAssetUrl("portfolio-inline"),
      mimeType: "image/png",
      prompt: "large local result",
      savedAt: "2026-04-26T12:00:00.000Z"
    };
    storage.setItem("lumio:portfolio", JSON.stringify([persistedItem]));
    assetStore.assets.set("portfolio-inline", inlineUrl);

    await expect(loadSavedPortfolioItems({ storage, assetStore })).resolves.toEqual([
      {
        ...persistedItem,
        url: inlineUrl
      }
    ]);
    expect(isPortfolioAssetUrl(persistedItem.url)).toBe(true);
  });
});

function createMemoryStorage(): PortfolioStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();

  return {
    values,
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => {
      values.set(key, value);
    }
  };
}

function createMemoryAssetStore(): PortfolioAssetStore & { assets: Map<string, string> } {
  const assets = new Map<string, string>();

  return {
    assets,
    getAssetUrl: vi.fn(async (key: string) => assets.get(key) || null),
    putAsset: vi.fn(async ({ key, url }) => {
      assets.set(key, url);
    })
  };
}
