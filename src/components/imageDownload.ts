export type DownloadableImage = {
  key?: string;
  url: string;
  mimeType?: string;
};

type DownloadLink = {
  href: string;
  download: string;
  rel: string;
  click: () => void;
};

type DownloadDocument = {
  createElement: (tagName: "a") => DownloadLink;
};

type DownloadUrlApi = {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
};

type FilePickerWritable = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

type FilePickerHandle = {
  createWritable: () => Promise<FilePickerWritable>;
};

type ShowSaveFilePicker = (options: {
  suggestedName: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<FilePickerHandle>;

export type DownloadGeneratedImageResult =
  | {
      mode: "picker" | "blob" | "direct";
      fileName: string;
    }
  | {
      mode: "opened";
      fileName: string;
    };

export type DownloadDependencies = {
  document?: DownloadDocument;
  fetch?: typeof fetch;
  openWindow?: (url: string, target: string, features: string) => unknown;
  url?: DownloadUrlApi;
  showSaveFilePicker?: ShowSaveFilePicker;
  now?: Date;
};

export async function downloadGeneratedImage(
  image: DownloadableImage,
  index: number,
  dependencies: DownloadDependencies = {}
): Promise<DownloadGeneratedImageResult> {
  const fileName = buildDownloadFileName(image, index, dependencies.now);
  const documentRef = dependencies.document ?? document;
  const fetchRef = dependencies.fetch ?? (typeof fetch === "function" ? fetch : undefined);
  const urlRef = dependencies.url ?? (typeof URL !== "undefined" ? URL : undefined);
  const showSaveFilePickerRef = dependencies.showSaveFilePicker ?? readShowSaveFilePicker();
  const downloadUrls = buildDownloadAttemptUrls(image, fileName);
  const filePickerHandle = showSaveFilePickerRef
    ? await tryOpenSaveFileHandle(fileName, image.mimeType, showSaveFilePickerRef)
    : null;

  if (isDirectDownloadUrl(image.url) && !filePickerHandle) {
    clickDownloadLink(documentRef, image.url, fileName);
    return { mode: "direct", fileName };
  }

  if (fetchRef && urlRef) {
    for (const downloadUrl of downloadUrls) {
      const blob = await tryFetchDownloadBlob(downloadUrl, fetchRef);
      if (!blob) {
        continue;
      }

      if (filePickerHandle && (await tryWriteFilePickerHandle(filePickerHandle, blob))) {
        return { mode: "picker", fileName };
      }

      saveBlobWithAnchor(documentRef, urlRef, blob, fileName);
      return { mode: "blob", fileName };
    }
  }

  return openOriginalImageUrl(image.url, fileName, dependencies);
}

export function buildDownloadFileName(image: DownloadableImage, index: number, now = new Date()): string {
  const extension = inferImageExtension(image);
  return `lumio-result-${formatDownloadTimestamp(now)}-${String(index + 1).padStart(2, "0")}.${extension}`;
}

function formatDownloadTimestamp(value: Date): string {
  const year = value.getFullYear();
  const month = padDatePart(value.getMonth() + 1);
  const day = padDatePart(value.getDate());
  const hours = padDatePart(value.getHours());
  const minutes = padDatePart(value.getMinutes());
  const seconds = padDatePart(value.getSeconds());

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function inferImageExtension(image: DownloadableImage): string {
  const mimeType = image.mimeType || image.url.match(/^data:([^;,]+)/)?.[1];

  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) {
    return "jpg";
  }

  if (mimeType?.includes("webp")) {
    return "webp";
  }

  if (mimeType?.includes("png")) {
    return "png";
  }

  const pathExtension = image.url.split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1];
  return pathExtension || "png";
}

async function tryFetchDownloadBlob(
  requestUrl: string,
  fetchRef: typeof fetch
): Promise<Blob | null> {
  try {
    const response = await fetchRef(requestUrl, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    return response.blob();
  } catch {
    return null;
  }
}

function clickDownloadLink(documentRef: DownloadDocument, href: string, fileName: string): void {
  const link = documentRef.createElement("a") as DownloadLink;
  link.href = href;
  link.download = fileName;
  link.rel = "noreferrer";
  link.click();
}

function openOriginalImageUrl(
  imageUrl: string,
  fileName: string,
  dependencies: DownloadDependencies
): DownloadGeneratedImageResult {
  const openWindow =
    dependencies.openWindow ??
    (typeof window !== "undefined" && typeof window.open === "function"
      ? window.open.bind(window)
      : undefined);

  if (!openWindow) {
    throw new Error("浏览器无法打开原图链接，请手动复制图片地址后保存。");
  }

  // With noopener, Chrome may return null even when it opens the tab.
  openWindow(imageUrl, "_blank", "noopener,noreferrer");

  return { mode: "opened", fileName };
}

function isDirectDownloadUrl(url: string): boolean {
  return url.startsWith("data:") || url.startsWith("blob:");
}

function buildDownloadAttemptUrls(image: DownloadableImage, fileName: string): string[] {
  const urls = new Set<string>();
  const ownedAssetDownloadUrl = buildOwnedAssetDownloadUrl(image, fileName);

  if (ownedAssetDownloadUrl) {
    urls.add(ownedAssetDownloadUrl);
  }

  if (
    isDirectDownloadUrl(image.url) ||
    image.url.startsWith("http://") ||
    image.url.startsWith("https://") ||
    image.url.startsWith("/")
  ) {
    urls.add(image.url);
  }

  return Array.from(urls);
}

function buildOwnedAssetDownloadUrl(image: DownloadableImage, fileName: string): string | null {
  const searchParams = new URLSearchParams();

  if (image.key) {
    searchParams.set("key", image.key);
  } else if (image.url.startsWith("http://") || image.url.startsWith("https://")) {
    searchParams.set("url", image.url);
  } else {
    return null;
  }

  searchParams.set("filename", fileName);
  return `/api/download?${searchParams.toString()}`;
}

function saveBlobWithAnchor(
  documentRef: DownloadDocument,
  urlRef: DownloadUrlApi,
  blob: Blob,
  fileName: string
): void {
  const objectUrl = urlRef.createObjectURL(blob);
  clickDownloadLink(documentRef, objectUrl, fileName);
  globalThis.setTimeout(() => {
    urlRef.revokeObjectURL(objectUrl);
  }, 0);
}

async function tryOpenSaveFileHandle(
  fileName: string,
  mimeType: string | undefined,
  showSaveFilePicker: ShowSaveFilePicker
): Promise<FilePickerHandle | null> {
  try {
    return await showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: "Image",
          accept: {
            [mimeType || "application/octet-stream"]: [buildAcceptedExtension(fileName)]
          }
        }
      ]
    });
  } catch {
    return null;
  }
}

async function tryWriteFilePickerHandle(
  handle: FilePickerHandle,
  blob: Blob
): Promise<boolean> {
  try {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

function buildAcceptedExtension(fileName: string): string {
  const extension = fileName.match(/(\.[a-z0-9]+)$/i)?.[1];
  return extension || ".png";
}

function readShowSaveFilePicker(): ShowSaveFilePicker | undefined {
  const candidate = globalThis as typeof globalThis & {
    showSaveFilePicker?: ShowSaveFilePicker;
  };

  return candidate.showSaveFilePicker;
}