export type DownloadableImage = {
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
};

export async function downloadGeneratedImage(
  image: DownloadableImage,
  index: number,
  dependencies: DownloadDependencies = {}
): Promise<void> {
  const documentRef = dependencies.document ?? document;
  const fetchRef = dependencies.fetch ?? fetch;
  const urlRef = dependencies.url ?? URL;
  const link = documentRef.createElement("a") as DownloadLink;
  let href = image.url;
  let objectUrl: string | null = null;

  if (!image.url.startsWith("data:")) {
    const response = await fetchRef(image.url);
    if (!response.ok) {
      throw new Error(`保存图片失败：${response.status}`);
    }

    objectUrl = urlRef.createObjectURL(await response.blob());
    href = objectUrl;
  }

  link.href = href;
  link.download = buildDownloadFileName(image, index);
  link.rel = "noreferrer";
  link.click();

  if (objectUrl) {
    urlRef.revokeObjectURL(objectUrl);
  }
}

export function buildDownloadFileName(image: DownloadableImage, index: number): string {
  const extension = inferImageExtension(image);
  return `lumio-result-${String(index + 1).padStart(2, "0")}.${extension}`;
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
