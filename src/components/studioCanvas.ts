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
  assets: Array<{
    url: string;
    type: string;
  }>;
};

export type CanvasHistoryThumb = {
  id: string;
  url: string;
  mimeType?: string;
  prompt?: string;
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
        appendThumb({
          id: `${item.id}-${index}`,
          url: asset.url,
          prompt: item.prompt
        });
      });
  });

  return thumbs.slice(0, input.limit ?? 4);
}
