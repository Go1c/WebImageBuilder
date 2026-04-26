import type { LocalPortfolioItem } from "./studioActions";

export const portfolioStorageKey = "lumio:portfolio";

const portfolioAssetUrlPrefix = "lumio-portfolio-asset:";
const dbName = "lumio-image-studio";
const dbVersion = 1;
const assetStoreName = "portfolio-assets";

export type PortfolioStorage = Pick<Storage, "getItem" | "setItem">;

export type PortfolioAssetStore = {
  getAssetUrl: (key: string) => Promise<string | null>;
  putAsset: (asset: { key: string; url: string; mimeType: string }) => Promise<void>;
};

type PortfolioAssetRecord = {
  key: string;
  url: string;
  mimeType: string;
  updatedAt: string;
};

export function createPortfolioAssetUrl(key: string): string {
  return `${portfolioAssetUrlPrefix}${key}`;
}

export function isPortfolioAssetUrl(url: string): boolean {
  return url.startsWith(portfolioAssetUrlPrefix);
}

export function getPortfolioAssetKey(url: string): string | null {
  return isPortfolioAssetUrl(url) ? url.slice(portfolioAssetUrlPrefix.length) : null;
}

export async function loadSavedPortfolioItems({
  storage,
  assetStore
}: {
  storage: PortfolioStorage;
  assetStore: PortfolioAssetStore;
}): Promise<LocalPortfolioItem[]> {
  const items = parsePortfolioItems(storage.getItem(portfolioStorageKey));
  return hydratePortfolioItems(items, assetStore);
}

export async function savePortfolioItems({
  items,
  storage,
  assetStore
}: {
  items: LocalPortfolioItem[];
  storage: PortfolioStorage;
  assetStore: PortfolioAssetStore;
}): Promise<LocalPortfolioItem[]> {
  const storedItems = await persistInlinePortfolioAssets(items, assetStore);
  storage.setItem(portfolioStorageKey, JSON.stringify(storedItems));
  return hydratePortfolioItems(storedItems, assetStore);
}

export function createIndexedDbPortfolioAssetStore(): PortfolioAssetStore {
  return {
    async getAssetUrl(key) {
      const db = await openPortfolioDatabase();
      const record = await runObjectStoreRequest<PortfolioAssetRecord | undefined>(
        db,
        "readonly",
        (store) => store.get(key)
      );
      return record?.url || null;
    },
    async putAsset(asset) {
      const db = await openPortfolioDatabase();
      await runObjectStoreRequest(db, "readwrite", (store) =>
        store.put({
          key: asset.key,
          url: asset.url,
          mimeType: asset.mimeType,
          updatedAt: new Date().toISOString()
        })
      );
    }
  };
}

async function persistInlinePortfolioAssets(
  items: LocalPortfolioItem[],
  assetStore: PortfolioAssetStore
): Promise<LocalPortfolioItem[]> {
  const storedItems: LocalPortfolioItem[] = [];

  for (const item of items) {
    if (isInlineImageUrl(item.url)) {
      await assetStore.putAsset({
        key: item.id,
        url: item.url,
        mimeType: item.mimeType
      });
      storedItems.push({
        ...item,
        url: createPortfolioAssetUrl(item.id)
      });
      continue;
    }

    storedItems.push(item);
  }

  return storedItems;
}

async function hydratePortfolioItems(
  items: LocalPortfolioItem[],
  assetStore: PortfolioAssetStore
): Promise<LocalPortfolioItem[]> {
  const hydratedItems: LocalPortfolioItem[] = [];

  for (const item of items) {
    const assetKey = getPortfolioAssetKey(item.url);
    if (!assetKey) {
      hydratedItems.push(item);
      continue;
    }

    const assetUrl = await assetStore.getAssetUrl(assetKey);
    hydratedItems.push({
      ...item,
      url: assetUrl || item.url
    });
  }

  return hydratedItems;
}

function parsePortfolioItems(rawItems: string | null): LocalPortfolioItem[] {
  try {
    const parsedItems = rawItems ? (JSON.parse(rawItems) as LocalPortfolioItem[]) : [];
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return [];
  }
}

function isInlineImageUrl(url: string): boolean {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(url);
}

let portfolioDatabasePromise: Promise<IDBDatabase> | null = null;

function openPortfolioDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("浏览器不支持本地大图作品集存储"));
  }

  if (portfolioDatabasePromise) {
    return portfolioDatabasePromise;
  }

  portfolioDatabasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(assetStoreName)) {
        db.createObjectStore(assetStoreName, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("打开本地作品集存储失败"));
    request.onblocked = () => reject(new Error("本地作品集存储被其他页面占用，请关闭重复页面后重试"));
  });

  return portfolioDatabasePromise;
}

function runObjectStoreRequest<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(assetStoreName, mode);
    const request = createRequest(transaction.objectStore(assetStoreName));

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error || new Error("读写本地作品集图片失败"));
    transaction.onerror = () => reject(transaction.error || new Error("读写本地作品集图片失败"));
  });
}
