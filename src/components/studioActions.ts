export type StudioActionImage = {
  key?: string;
  url: string;
  mimeType: string;
};

export type LocalPortfolioItem = {
  id: string;
  url: string;
  mimeType: string;
  prompt: string;
  savedAt: string;
};

export type ReferenceAssetDescriptor = {
  key: string;
  url: string;
  mimeType: string;
  prompt: string;
  source: "canvas";
};

export type ReferenceAssetResult =
  | {
      ok: true;
      reference: ReferenceAssetDescriptor;
    }
  | {
      ok: false;
      reason: string;
    };

export type ZoomActionResult =
  | {
      enabled: true;
      url: string;
    }
  | {
      enabled: false;
      reason: string;
    };

export type StudioActionState = {
  enabled: boolean;
  label: string;
  reason?: string;
};

export type StudioActionStates = {
  save: StudioActionState;
  referenceReuse: StudioActionState;
  download: StudioActionState;
  delete: StudioActionState;
  regenerate: StudioActionState;
  zoom: StudioActionState;
};

type PortfolioInput = {
  image: StudioActionImage;
  prompt: string | null | undefined;
  savedAt: string;
};

export function buildLocalPortfolioItem(input: PortfolioInput): LocalPortfolioItem {
  return {
    id: buildStablePortfolioId(input.image.url),
    url: input.image.url,
    mimeType: input.image.mimeType,
    prompt: input.prompt || "",
    savedAt: input.savedAt
  };
}

export function upsertLocalPortfolioItem(
  items: LocalPortfolioItem[],
  item: LocalPortfolioItem,
  maxItems = 100
): LocalPortfolioItem[] {
  const remainingItems = items.filter((existingItem) => existingItem.url !== item.url);
  return [item, ...remainingItems].slice(0, maxItems);
}

export function buildReferenceAssetDescriptor(input: {
  image: StudioActionImage | null;
  prompt: string | null | undefined;
}): ReferenceAssetResult {
  if (!input.image) {
    return {
      ok: false,
      reason: "No canvas image is available to use as a reference."
    };
  }

  return {
    ok: true,
    reference: {
      key: input.image.key || buildStableCanvasAssetKey(input.image.url),
      url: input.image.url,
      mimeType: input.image.mimeType,
      prompt: input.prompt || "",
      source: "canvas"
    }
  };
}

export function getZoomAction(input: { image: StudioActionImage | null }): ZoomActionResult {
  if (!input.image) {
    return {
      enabled: false,
      reason: "No canvas image is available to zoom."
    };
  }

  return {
    enabled: true,
    url: input.image.url
  };
}

export function getStudioActionStates(input: {
  image: StudioActionImage | null;
  canRegenerate: boolean;
  loading: boolean;
}): StudioActionStates {
  return {
    save: getImageActionState({
      label: "Save to portfolio",
      image: input.image,
      loading: input.loading,
      loadingReason: "Wait for generation to finish before saving.",
      missingImageReason: "No canvas image is available to save."
    }),
    referenceReuse: getImageActionState({
      label: "Use as reference",
      image: input.image,
      loading: input.loading,
      loadingReason: "Wait for generation to finish before reusing this image as a reference.",
      missingImageReason: "No canvas image is available to use as a reference."
    }),
    download: getImageActionState({
      label: "Download",
      image: input.image,
      loading: input.loading,
      loadingReason: "Wait for generation to finish before downloading.",
      missingImageReason: "No canvas image is available to download."
    }),
    delete: getImageActionState({
      label: "Delete",
      image: input.image,
      loading: input.loading,
      loadingReason: "Wait for generation to finish before deleting.",
      missingImageReason: "No canvas image is available to delete."
    }),
    regenerate: getRegenerateActionState(input.loading, input.canRegenerate),
    zoom: getImageActionState({
      label: "Open image",
      image: input.image,
      loading: input.loading,
      loadingReason: "Wait for generation to finish before opening the image.",
      missingImageReason: "No canvas image is available to zoom."
    })
  };
}

function getRegenerateActionState(loading: boolean, canRegenerate: boolean): StudioActionState {
  if (loading) {
    return {
      enabled: false,
      label: "Regenerate",
      reason: "Wait for the current generation to finish before regenerating."
    };
  }

  if (!canRegenerate) {
    return {
      enabled: false,
      label: "Regenerate",
      reason: "No prompt is available to regenerate."
    };
  }

  return {
    enabled: true,
    label: "Regenerate"
  };
}

function getImageActionState(input: {
  label: string;
  image: StudioActionImage | null;
  loading: boolean;
  loadingReason: string;
  missingImageReason: string;
}): StudioActionState {
  if (input.loading) {
    return {
      enabled: false,
      label: input.label,
      reason: input.loadingReason
    };
  }

  if (!input.image) {
    return {
      enabled: false,
      label: input.label,
      reason: input.missingImageReason
    };
  }

  return {
    enabled: true,
    label: input.label
  };
}

function buildStablePortfolioId(url: string): string {
  return `portfolio-${hashString(url)}`;
}

function buildStableCanvasAssetKey(url: string): string {
  return `canvas-${hashString(url)}`;
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}
