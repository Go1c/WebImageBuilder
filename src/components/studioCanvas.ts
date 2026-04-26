export type CanvasImageCandidate = {
  key?: string;
  url: string;
  mimeType?: string;
};

export type CanvasImage = {
  key?: string;
  url: string;
  mimeType: string;
};

export type CanvasHistoryItem = {
  id: string;
  prompt?: string;
  status?: string;
  createdAt?: string;
  params?: {
    size?: string | null;
  } | null;
  assets: Array<{
    url: string;
    type: string;
    width?: number | null;
    height?: number | null;
  }>;
};

export type CanvasHistoryThumb = {
  id: string;
  url: string;
  mimeType?: string;
  prompt?: string;
  size?: string;
  status?: string;
  createdAt?: string;
};

export type CanvasMeta = {
  size: string;
  timing: string;
  status: string;
};

export function selectCanvasImage(input: {
  images: CanvasImageCandidate[];
  selectedInspirationImage: string | null;
}): CanvasImage | null {
  const generatedImage = input.images[0];

  if (generatedImage) {
    return {
      ...(generatedImage.key ? { key: generatedImage.key } : {}),
      url: generatedImage.url,
      mimeType: generatedImage.mimeType || "image/png"
    };
  }

  if (input.selectedInspirationImage) {
    return {
      url: input.selectedInspirationImage,
      mimeType: "image/jpeg"
    };
  }

  return null;
}

export function selectVisibleCanvasImage(input: {
  canvasImage: CanvasImage | null;
  loading: boolean;
}): CanvasImage | null {
  return input.loading ? null : input.canvasImage;
}

export function getCanvasPlaceholderText(input: { loading: boolean }): string | null {
  return input.loading ? null : "生成预览";
}

export function buildCanvasHistoryThumbs(input: {
  images: CanvasImageCandidate[];
  history: CanvasHistoryItem[];
  canvasPrompt: string | null;
  limit?: number;
}): CanvasHistoryThumb[] {
  const thumbs: CanvasHistoryThumb[] = [];
  const seenUrls = new Set<string>();

  const appendThumb = (thumb: CanvasHistoryThumb) => {
    if (seenUrls.has(thumb.url)) {
      return;
    }

    seenUrls.add(thumb.url);
    thumbs.push(thumb);
  };

  input.images.forEach((image, index) => {
    appendThumb({
      id: `generated-${image.key || index}`,
      url: image.url,
      mimeType: image.mimeType,
      prompt: input.canvasPrompt || undefined
    });
  });

  input.history.forEach((item) => {
    item.assets
      .filter((asset) => asset.type === "result")
      .forEach((asset, index) => {
        const size = getHistoryAssetSize(item, asset);
        appendThumb({
          id: `${item.id}-${index}`,
          url: asset.url,
          prompt: item.prompt,
          ...(size ? { size } : {}),
          ...(item.status ? { status: item.status } : {}),
          ...(item.createdAt ? { createdAt: item.createdAt } : {})
        });
      });
  });

  return thumbs.slice(0, input.limit ?? 4);
}

export function buildCanvasMeta(input: {
  activeSizeMeta: string;
  loading: boolean;
  loadingSeconds: number;
  selectedHistoryThumb: CanvasHistoryThumb | null;
}): CanvasMeta {
  if (input.selectedHistoryThumb) {
    return {
      size: input.selectedHistoryThumb.size || input.activeSizeMeta,
      timing: "历史",
      status: getHistoryStatusLabel(input.selectedHistoryThumb.status)
    };
  }

  return {
    size: input.activeSizeMeta,
    timing: input.loading ? `${input.loadingSeconds || 1}.0s` : "6.2s",
    status: input.loading ? "生成中" : "刚刚"
  };
}

function getHistoryAssetSize(
  item: CanvasHistoryItem,
  asset: CanvasHistoryItem["assets"][number]
): string | undefined {
  const paramSize = formatCanvasSize(item.params?.size);

  if (paramSize) {
    return paramSize;
  }

  if (asset.width && asset.height) {
    return `${asset.width} × ${asset.height}`;
  }

  return undefined;
}

function formatCanvasSize(size: string | null | undefined): string | undefined {
  const match = size?.match(/^(\d+)x(\d+)$/i);

  if (!match) {
    return undefined;
  }

  return `${match[1]} × ${match[2]}`;
}

function getHistoryStatusLabel(status: string | undefined): string {
  switch (status) {
    case "succeeded":
      return "已完成";
    case "failed":
      return "生成失败";
    case "queued":
    case "running":
      return "生成中";
    default:
      return "历史";
  }
}
