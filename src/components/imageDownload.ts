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

export type DownloadDependencies = {
  document?: DownloadDocument;
  fetch?: typeof fetch;
  url?: DownloadUrlApi;
  now?: Date;
};

export async function downloadGeneratedImage(
  image: DownloadableImage,
  index: number,
  dependencies: DownloadDependencies = {}
): Promise<void> {
  const fileName = buildDownloadFileName(image, index, dependencies.now);
  const documentRef = dependencies.document ?? document;
  const fetchRef = dependencies.fetch ?? fetch;
  const urlRef = dependencies.url ?? URL;

  if (isDirectDownloadUrl(image.url)) {
    clickDownloadLink(documentRef, image.url, fileName);
    return;
  }

  const ownedDownloadUrl = buildOwnedAssetDownloadUrl(image, fileName);
  if (
    ownedDownloadUrl &&
    (await tryBlobDownload(ownedDownloadUrl, fileName, {
      document: documentRef,
      fetch: fetchRef,
      url: urlRef
    }))
  ) {
    return;
  }

  if (
    (image.url.startsWith("http://") ||
      image.url.startsWith("https://") ||
      image.url.startsWith("/")) &&
    (await tryBlobDownload(image.url, fileName, {
      document: documentRef,
      fetch: fetchRef,
      url: urlRef
    }))
  ) {
    return;
  }

  clickDownloadLink(documentRef, image.url, fileName);
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

async function tryBlobDownload(
  requestUrl: string,
  fileName: string,
  dependencies: Required<Pick<DownloadDependencies, "document" | "fetch" | "url">>
): Promise<boolean> {
  try {
    const response = await dependencies.fetch(requestUrl, { cache: "no-store" });
    if (!response.ok) {
      return false;
    }

    const blob = await response.blob();
    const objectUrl = dependencies.url.createObjectURL(blob);
    clickDownloadLink(dependencies.document, objectUrl, fileName);
    globalThis.setTimeout(() => {
      dependencies.url.revokeObjectURL(objectUrl);
    }, 0);
    return true;
  } catch {
    return false;
  }
}

function clickDownloadLink(documentRef: DownloadDocument, href: string, fileName: string): void {
  const link = documentRef.createElement("a") as DownloadLink;
  link.href = href;
  link.download = fileName;
  link.rel = "noreferrer";
  link.click();
}

function isDirectDownloadUrl(url: string): boolean {
  return url.startsWith("data:") || url.startsWith("blob:");
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
