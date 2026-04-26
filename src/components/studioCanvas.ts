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
