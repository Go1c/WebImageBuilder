export type StudioActionImage = {
  key?: string;
  url: string;
  originalUrl?: string;
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
  share: StudioActionState;
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
      url: input.image.originalUrl || input.image.url,
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
  canShare?: boolean;
  loading: boolean;
}): StudioActionStates {
  return {
    save: getImageActionState({
      label: "保存到作品集",
      image: input.image,
      loading: false,
      loadingReason: "生成完成后才能保存。",
      missingImageReason: "画布上没有可保存的图片。"
    }),
    share: getShareActionState({
      image: input.image,
      canShare: Boolean(input.canShare)
    }),
    referenceReuse: getImageActionState({
      label: "用作参考图",
      image: input.image,
      loading: false,
      loadingReason: "生成完成后才能用作参考图。",
      missingImageReason: "画布上没有可用作参考图的图片。"
    }),
    download: getImageActionState({
      label: "下载图片",
      image: input.image,
      loading: false,
      loadingReason: "生成完成后才能下载。",
      missingImageReason: "画布上没有可下载的图片。"
    }),
    delete: getImageActionState({
      label: "删除当前图片",
      image: input.image,
      loading: input.loading,
      loadingReason: "生成完成后才能删除。",
      missingImageReason: "画布上没有可删除的图片。"
    }),
    regenerate: getRegenerateActionState(input.loading, input.canRegenerate),
    zoom: getImageActionState({
      label: "打开大图",
      image: input.image,
      loading: false,
      loadingReason: "生成完成后才能打开大图。",
      missingImageReason: "画布上没有可打开的大图。"
    })
  };
}

function getShareActionState(input: {
  image: StudioActionImage | null;
  canShare: boolean;
}): StudioActionState {
  if (!input.image) {
    return {
      enabled: false,
      label: "分享提示词",
      reason: "画布上没有可分享的图片。"
    };
  }

  if (!input.canShare) {
    return {
      enabled: false,
      label: "分享提示词",
      reason: "只有生成完成的图片可以分享。"
    };
  }

  return {
    enabled: true,
    label: "分享提示词"
  };
}

function getRegenerateActionState(loading: boolean, canRegenerate: boolean): StudioActionState {
  if (loading) {
    return {
      enabled: false,
      label: "重新生成",
      reason: "当前生成完成后才能重新生成。"
    };
  }

  if (!canRegenerate) {
    return {
      enabled: false,
      label: "重新生成",
      reason: "没有可用于重新生成的提示词。"
    };
  }

  return {
    enabled: true,
    label: "重新生成"
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
