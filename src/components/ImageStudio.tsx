"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent,
  type ReactNode
} from "react";
import type { GenerationMode, ModelKey } from "@/server/domain/models";
import AppShell, { AccountMenu, ThemeToggle } from "./AppShell";
import { readApiErrorDetail, readApiJson, type ApiErrorDetail } from "./apiErrors";
import { buildGenerationRequestPreview } from "./generationRequestPreview";
import { estimateGenerationProgress } from "./generationProgress";
import { downloadGeneratedImage } from "./imageDownload";
import {
  formatSub2ApiBalance,
  getSub2ApiAccountLabel,
  type Sub2ApiSessionView
} from "./sub2ApiAccount";
import {
  buildSub2ApiLoginUrl,
  readSub2ApiAuthFromUrl,
  stripSub2ApiAuthParamsFromUrl,
  type Sub2ApiAuthHandoff
} from "./sub2ApiLogin";
import {
  buildPromptEnhancementMetadata,
  type PromptEnhancementMetadata,
  type PromptStylePresetKey
} from "./promptEnhancers";
import { getPromptLibraryImageLoading } from "./promptLibraryImages";
import { promptLibraryItems as staticPromptLibraryItems, type PromptLibraryItem } from "./promptLibrary";
import { fetchPromptLibrary } from "./promptLibrarySource";
import {
  createIndexedDbPortfolioAssetStore,
  loadSavedPortfolioItems,
  savePortfolioItems
} from "./portfolioStorage";
import {
  buildCustomGenerationSize,
  buildGenerationSize,
  getCustomSizeUnsupportedMessage,
  getEffectiveResolutionTier,
  getGenerationRequestTimeoutMs,
  getRecommendedRatioForResolution,
  getUnsupportedGenerationSizeReason,
  imageResolutionOptions,
  validateCustomGenerationSize,
  type AspectRatioLabel,
  type ImageResolutionTier
} from "./studioSize";
import {
  buildLocalPortfolioItem,
  buildReferenceAssetDescriptor,
  getStudioActionStates,
  upsertLocalPortfolioItem,
  type LocalPortfolioItem,
  type ReferenceAssetDescriptor,
  type StudioActionState
} from "./studioActions";
import {
  buildCanvasMeta,
  buildCanvasHistoryThumbs,
  buildPreviewAssetUrl,
  getCanvasLoadingWarningText,
  getCanvasPlaceholderText,
  selectCanvasImage,
  selectVisibleCanvasImage
} from "./studioCanvas";
import { appendPromptToken, readPromptFromUrl } from "./studioPrompt";
import {
  appendReferenceFiles,
  appendReusedReference,
  buildReferencePreviewItems,
  removeReferenceFileAt,
  removeReusedReferenceAt,
  type ReferencePreviewItem
} from "./studioReferences";
import { formatGlobalGenerationTotal } from "./studioStats";
import { tipFromActionFailure, tipFromApiError, type StudioTip } from "./studioTips";
import { uploadStudioAsset } from "./studioUpload";
import { SharePromptDialog, type PromptShareDialogData } from "./SharePromptDialog";

type AssetRef = {
  key: string;
  url: string;
  mimeType?: string;
};

type QuotaResponse = {
  actorType: "anonymous" | "user";
  quota: {
    remaining: number;
    freeTotal: number;
    sources: {
      anonymous: number;
      login: number;
      invite: number;
      paid: number;
    };
  };
  ipDailyUsed: number;
};

type StatsResponse = {
  totalGenerations: number;
};

type HistoryItem = {
  id: string;
  mode: string;
  modelKey: string;
  prompt: string;
  params?: {
    size?: string | null;
  } | null;
  status: string;
  createdAt: string;
  assets: Array<{
    url: string;
    type: string;
    storageKey?: string | null;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
  }>;
};

type GeneratedImage = {
  key: string;
  taskId?: string;
  url: string;
  originalUrl?: string;
  mimeType: string;
};

type GenerationSlotStatus = "queued" | "running" | "succeeded" | "failed";

type GenerationSlot = {
  id: string;
  index: number;
  status: GenerationSlotStatus;
  startedAtMs?: number;
  completedAtMs?: number;
  taskId?: string;
  image?: GeneratedImage;
  errorMessage?: string;
};

type HistoryThumb = {
  id: string;
  taskId?: string;
  key?: string;
  url: string;
  originalUrl?: string;
  mimeType?: string;
  prompt?: string;
  size?: string;
  status?: string;
  createdAt?: string;
};

type SavedPortfolioItem = LocalPortfolioItem;

type HeaderPanel = "tutorials" | "invite" | "auth" | null;

type Sub2ApiSessionResponse = Sub2ApiSessionView;

type StudioIconName =
  | "sparkle"
  | "grid"
  | "cube"
  | "person"
  | "layers"
  | "image"
  | "aperture"
  | "wand"
  | "arrowUp"
  | "plus"
  | "coin"
  | "gift"
  | "search"
  | "copy"
  | "share"
  | "check"
  | "trash"
  | "imagePlus"
  | "download"
  | "refresh"
  | "expand";

const emptySub2ApiSession: Sub2ApiSessionResponse = {
  authenticated: false,
  user: null
};
const urlOnlyReferenceSupportNote =
  "Canvas reuse is sent as a URL reference asset; uploaded files remain the most reliable provider reference path.";

const CANVAS_EMPTY_EXAMPLE_PROMPTS = [
  "深空银河核心，璀璨星云与尘埃，长曝光摄影质感",
  "赛博朋克霓虹街道上漫步的白猫，电影感光线",
  "国风美食图鉴，热气腾腾的火锅，工笔插画风格"
];

type GenerationCount = 1 | 2 | 3 | 4;

const studioModelOptions: Array<{ key: ModelKey; label: string }> = [
  { key: "gpt-image-2", label: "gpt-image-2" },
  { key: "gpt-image-2-2k", label: "gpt-image-2-2k" },
  { key: "gpt-image-2-4k", label: "gpt-image-2-4k" },
  { key: "gemini-3.1-flash-image-preview", label: "gemini-3.1-flash-image-preview" }
];

const generationCountOptions: GenerationCount[] = [1, 2, 3, 4];
const image2ModelByResolution: Record<ImageResolutionTier, ModelKey> = {
  "1K": "gpt-image-2",
  "2K": "gpt-image-2-2k",
  "4K": "gpt-image-2-4k"
};

const ratioOptions: Array<{ label: AspectRatioLabel }> = [
  { label: "1:1" },
  { label: "3:4" },
  { label: "4:3" },
  { label: "16:9" },
  { label: "9:16" }
];
const defaultCustomResolution = {
  width: "1024",
  height: "1024"
};

const keywordTags = ["柔光", "高对比", "微距", "广角", "黄金时刻", "蒸汽朋克", "极简", "未来感", "怀旧", "童趣"];
const libraryTabs = ["热门", "人物", "场景", "风格", "我的"];

const GENERATION_POLL_INTERVAL_MS = 3_000;

type GenerationTaskView = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  errorMessage?: string | null;
  prompt?: string;
  assets: Array<{
    id: string;
    type: string;
    storageKey?: string | null;
    url: string;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
  }>;
};

type GenerateSubmitResponse = {
  taskId: string;
  status: "queued" | "running" | "succeeded" | "failed" | string;
  quota: QuotaResponse["quota"];
  images?: Array<{
    key: string;
    url: string;
    mimeType?: string | null;
  }>;
};

class GenerationPollTimeoutError extends Error {
  constructor() {
    super("生成轮询超时");
    this.name = "GenerationPollTimeoutError";
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// Polls GET /api/tasks/:id until the task reaches a terminal status. Transient
// read failures (e.g. a 404 right after creation) are tolerated until the
// budget runs out, at which point the generation is reported as still running
// in the background.
async function pollGenerationTask(
  taskId: string,
  options: { budgetMs: number; intervalMs: number; signal?: AbortSignal }
): Promise<GenerationTaskView> {
  const deadline = Date.now() + options.budgetMs;

  for (;;) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        cache: "no-store",
        signal: options.signal
      });
      if (response.ok) {
        const body = await readApiJson<{ task: GenerationTaskView }>(
          response,
          "任务状态接口返回了非 JSON 响应，请刷新页面后重试"
        );
        if (body.task.status === "succeeded" || body.task.status === "failed") {
          return body.task;
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      // Swallow transient network errors and keep polling until the deadline.
    }

    if (Date.now() >= deadline) {
      throw new GenerationPollTimeoutError();
    }

    await wait(options.intervalMs, options.signal);
  }
}

async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    const index = nextIndex;
    nextIndex += 1;

    if (index >= items.length) {
      return;
    }

    await worker(items[index]);
    await runNext();
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runNext())
  );
}

function buildGeneratedImageFromAsset(asset: {
  id?: string;
  key?: string;
  storageKey?: string | null;
  url: string;
  mimeType?: string | null;
}): GeneratedImage {
  const storageKey = asset.storageKey || asset.key || undefined;

  return {
    key: storageKey || asset.id || asset.url,
    url: buildPreviewAssetUrl({ storageKey, url: asset.url }),
    originalUrl: asset.url,
    mimeType: asset.mimeType || "image/png"
  };
}

function buildGenerationSlots(count: GenerationCount): GenerationSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `generation-slot-${Date.now()}-${index}`,
    index,
    status: "queued"
  }));
}

function getGenerationSlotStatusLabel(status: GenerationSlotStatus): string {
  switch (status) {
    case "queued":
      return "等待中";
    case "running":
      return "生成中";
    case "succeeded":
      return "已完成";
    case "failed":
      return "生成失败";
    default:
      return "生成中";
  }
}

function getGenerationSlotElapsedSeconds(slot: GenerationSlot): number {
  if (!slot.startedAtMs) {
    return 0;
  }

  const endedAtMs = slot.completedAtMs || Date.now();
  return Math.max(1, Math.floor((endedAtMs - slot.startedAtMs) / 1000));
}

function buildVariationPrompt(prompt: string, index: number, count: number): string {
  if (count <= 1) {
    return prompt;
  }

  return `${prompt}\n\nVariation ${index + 1}: choose a distinct composition, lighting, color palette, camera angle, or detail treatment while preserving the user's core intent.`;
}

export function ImageStudio({ initialPrompt = "" }: { initialPrompt?: string } = {}) {
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const libraryPanelRef = useRef<HTMLElement | null>(null);
  const generationRunIdRef = useRef(0);
  const [mode, setMode] = useState<GenerationMode>("text-to-image");
  const [model, setModel] = useState<ModelKey>("gpt-image-2");
  const [generationCount, setGenerationCount] = useState<GenerationCount>(1);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [ratioLabel, setRatioLabel] = useState<AspectRatioLabel>("1:1");
  const [imageResolution, setImageResolution] = useState<ImageResolutionTier>("1K");
  const [useCustomResolution, setUseCustomResolution] = useState(false);
  const [customWidth, setCustomWidth] = useState(defaultCustomResolution.width);
  const [customHeight, setCustomHeight] = useState(defaultCustomResolution.height);
  const [detailStrength, setDetailStrength] = useState(55);
  const [selectedStyle, setSelectedStyle] = useState<PromptStylePresetKey | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviewUrls, setReferencePreviewUrls] = useState<string[]>([]);
  const [reusedReferences, setReusedReferences] = useState<ReferenceAssetDescriptor[]>([]);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [globalStats, setGlobalStats] = useState<StatsResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generationSlots, setGenerationSlots] = useState<GenerationSlot[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [selectedInspirationImage, setSelectedInspirationImage] = useState<string | null>(null);
  const [selectedHistoryThumb, setSelectedHistoryThumb] = useState<HistoryThumb | null>(null);
  const [canvasPrompt, setCanvasPrompt] = useState<string | null>(null);
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<SavedPortfolioItem[]>([]);
  const [activeLibraryTab, setActiveLibraryTab] = useState("热门");
  const [activeHeaderPanel, setActiveHeaderPanel] = useState<HeaderPanel>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [tip, setTip] = useState<StudioTip | null>(null);
  const [requestPreview, setRequestPreview] = useState<string | null>(null);
  const [sub2ApiSession, setSub2ApiSession] = useState<Sub2ApiSessionResponse | null>(null);
  const [loginReturnToUrl, setLoginReturnToUrl] = useState<string | null>(null);
  const [shareDialog, setShareDialog] = useState<PromptShareDialogData | null>(null);

  const quality = detailStrength >= 72 ? "high" : "standard";
  const presetSize = buildGenerationSize({ ratio: ratioLabel, resolution: imageResolution });
  const customSizeValidation = useMemo(
    () =>
      useCustomResolution
        ? validateCustomGenerationSize({
            width: customWidth,
            height: customHeight
          })
        : null,
    [customHeight, customWidth, useCustomResolution]
  );
  const activeCustomSize = customSizeValidation?.supported
    ? buildCustomGenerationSize({
        width: customSizeValidation.width,
        height: customSizeValidation.height
      })
    : null;
  const activeSize = activeCustomSize || presetSize;
  const effectiveResolution = activeCustomSize
    ? getEffectiveResolutionTier(activeCustomSize.size)
    : imageResolution;
  const customResolutionHelpText =
    useCustomResolution && customSizeValidation && !customSizeValidation.supported
      ? getCustomSizeUnsupportedMessage(customSizeValidation)
      : "宽高需为 16px 的倍数；总像素 655,360 - 8,294,400。";
  const selectedGenerationSlot = generationSlots[selectedImageIndex] || null;
  const canvasImage = selectedGenerationSlot?.image || (
    generationSlots.length
      ? null
      : selectCanvasImage({ images, selectedInspirationImage, selectedImageIndex })
  );
  const visibleCanvasImage = generationSlots.length
    ? canvasImage
    : selectVisibleCanvasImage({ canvasImage, loading });
  const visibleCanvasImages = generationSlots.length || loading ? [] : images;
  const canvasPlaceholderText = getCanvasPlaceholderText({ loading });
  const canvasLoadingWarningText = getCanvasLoadingWarningText({ loading });
  const generationProgress = loading ? estimateGenerationProgress(loadingSeconds) : 0;
  const promptEnhancement = useMemo(
    () => buildPromptMetadata(prompt),
    [detailStrength, negativePrompt, prompt, selectedStyle]
  );
  const referenceCount = referenceFiles.length + reusedReferences.length;
  const referencePreviewItems = useMemo(
    () =>
      buildReferencePreviewItems({
        reusedReferenceUrls: reusedReferences.map((reference) => reference.url),
        filePreviewUrls: referencePreviewUrls
      }),
    [referencePreviewUrls, reusedReferences]
  );
  const submitMode: GenerationMode = referenceCount > 0 ? "image-to-image" : "text-to-image";
  const canRegenerate = Boolean(promptEnhancement.finalPrompt.trim() || (canvasPrompt || "").trim());
  const activeTaskId = selectedGenerationSlot?.taskId || currentTaskId;
  const canShareCurrentCanvas = Boolean(canvasImage && activeTaskId);
  const actionStates = getStudioActionStates({
    image: canvasImage,
    canRegenerate,
    canShare: canShareCurrentCanvas,
    loading
  });
  const portfolioAssetStore = useMemo(() => createIndexedDbPortfolioAssetStore(), []);
  const loginBaseUrl = process.env.NEXT_PUBLIC_LUMIO_LOGIN_URL || "https://api.lumio.games/login";
  const loginUrl = useMemo(
    () => buildSub2ApiLoginUrl({ loginBaseUrl, returnToUrl: loginReturnToUrl }),
    [loginBaseUrl, loginReturnToUrl]
  );
  const lumioAccountUrl = useMemo(() => getLumioAffiliateUrl(loginBaseUrl), [loginBaseUrl]);
  const accountLabel = getSub2ApiAccountLabel(sub2ApiSession);
  const sub2ApiBalanceText = formatSub2ApiBalance(sub2ApiSession?.user?.balance);
  const globalGenerationText = formatGlobalGenerationTotal(globalStats?.totalGenerations);
  const compactGlobalGenerationText = formatGlobalGenerationTotal(globalStats?.totalGenerations, { compact: true });
  const visibleResultCount = generationSlots.length || images.length;
  const isCanvasGrid = generationSlots.length > 1 || visibleCanvasImages.length > 1;

  const historyThumbs = useMemo(() => {
    return buildCanvasHistoryThumbs({ images, history, canvasPrompt, currentTaskId });
  }, [canvasPrompt, currentTaskId, history, images]);
  const currentModelLabel =
    studioModelOptions.find((option) => option.key === model)?.label || model;
  const canvasMeta = useMemo(
    () => {
      if (selectedGenerationSlot) {
        const elapsedSeconds = getGenerationSlotElapsedSeconds(selectedGenerationSlot);
        return {
          size: activeSize.meta,
          timing:
            selectedGenerationSlot.status === "queued"
              ? "等待"
              : selectedGenerationSlot.status === "succeeded"
                ? "刚刚"
                : `${elapsedSeconds || 1}.0s`,
          status: getGenerationSlotStatusLabel(selectedGenerationSlot.status)
        };
      }

      return buildCanvasMeta({
        activeSizeMeta: activeSize.meta,
        loading,
        loadingSeconds,
        selectedHistoryThumb
      });
    },
    [activeSize.meta, loading, loadingSeconds, selectedGenerationSlot, selectedHistoryThumb]
  );

  const quotaText = useMemo(() => {
    if (!quota) {
      return "128 次";
    }

    return `${quota.quota.remaining} 次`;
  }, [quota]);

  // Prefer the admin-managed material library (DB via /api/materials); fall back
  // to the bundled static library on any failure or empty DB so the gallery is
  // never blank. Starts with the static list for instant first paint.
  const [promptLibraryItems, setPromptLibraryItems] = useState<PromptLibraryItem[]>(staticPromptLibraryItems);

  useEffect(() => {
    const controller = new AbortController();
    fetchPromptLibrary(controller.signal).then((items) => {
      if (items.length > 0) {
        setPromptLibraryItems(items);
      }
    });
    return () => controller.abort();
  }, []);

  const filteredPromptLibraryItems = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();

    return promptLibraryItems.filter((item) => {
      if (!matchesLibraryTab(item, activeLibraryTab)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return `${item.title} ${item.category} ${item.prompt}`.toLowerCase().includes(query);
    });
  }, [promptLibraryItems, activeLibraryTab, librarySearch]);

  useEffect(() => {
    if (!tip) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTip(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [tip]);

  useEffect(() => {
    setLoginReturnToUrl(stripSub2ApiAuthParamsFromUrl(window.location.href));
    const sharedPrompt = readPromptFromUrl(window.location.href);
    if (sharedPrompt) {
      setPrompt(sharedPrompt);
    }

    void (async () => {
      await initializeSub2ApiSession();
      await refreshData();
    })();
  }, []);

  useEffect(() => {
    let isMounted = true;

    void loadSavedPortfolioItems({
      storage: window.localStorage,
      assetStore: portfolioAssetStore
    })
      .then((items) => {
        if (isMounted) {
          setSavedPortfolioItems(items);
        }
      })
      .catch((error) => {
        if (isMounted) {
          showTip(tipFromActionFailure({ kind: "failed", action: "加载作品集", error }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [portfolioAssetStore]);

  useEffect(() => {
    if (!referenceFiles.length) {
      setReferencePreviewUrls([]);
      return;
    }

    const nextUrls = referenceFiles.map((file) => URL.createObjectURL(file));
    setReferencePreviewUrls(nextUrls);

    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [referenceFiles]);

  useEffect(() => {
    if (!loading) {
      setLoadingSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setLoadingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [loading]);

  useEffect(() => {
    if (!generationSlots.length) {
      return;
    }

    setImages(
      generationSlots
        .filter((slot) => slot.image)
        .map((slot) => slot.image as GeneratedImage)
    );
  }, [generationSlots]);

  async function refreshData() {
    const [quotaResponse, historyResponse, statsResponse] = await Promise.allSettled([
      fetch("/api/quota", { cache: "no-store" }),
      fetch("/api/history", { cache: "no-store" }),
      fetch("/api/stats", { cache: "no-store" })
    ]);
    let loadFailureTip: StudioTip | null = null;

    if (quotaResponse.status === "fulfilled" && quotaResponse.value.ok) {
      setQuota((await quotaResponse.value.json()) as QuotaResponse);
    } else {
      loadFailureTip = await tipFromSettledResponse("加载额度", quotaResponse);
    }

    if (historyResponse.status === "fulfilled" && historyResponse.value.ok) {
      const body = (await historyResponse.value.json()) as { history: HistoryItem[] };
      setHistory(body.history || []);
    } else if (!loadFailureTip) {
      loadFailureTip = await tipFromSettledResponse("加载历史记录", historyResponse);
    }

    if (statsResponse.status === "fulfilled" && statsResponse.value.ok) {
      setGlobalStats((await statsResponse.value.json()) as StatsResponse);
    }

    if (loadFailureTip) {
      showTip(loadFailureTip);
    }
  }

  async function initializeSub2ApiSession() {
    const embeddedAuth = readEmbeddedSub2ApiAuth();

    if (embeddedAuth) {
      try {
        const session = await attachSub2ApiToken(embeddedAuth);
        setSub2ApiSession(session);
        removeEmbeddedAuthQueryParams();
        showTip({
          type: "success",
          title: "已登录",
          message: session.user?.email
            ? `已同步 Sub2API 账号：${session.user.email}`
            : "已通过 Sub2API 嵌入登录态完成登录。"
        });
        return;
      } catch (error) {
        removeEmbeddedAuthQueryParams();
        setSub2ApiSession(emptySub2ApiSession);
        showTip(tipFromActionFailure({ kind: "failed", action: "同步 Sub2API 登录态", error }));
        return;
      }
    }

    await refreshSub2ApiSession();
  }

  async function refreshSub2ApiSession(options: { silent?: boolean } = {}) {
    try {
      const response = await fetch("/api/sub2api/session", { cache: "no-store" });
      if (!response.ok) {
        throw new StudioApiResponseError(await readApiErrorDetail(response));
      }

      setSub2ApiSession(
        await readApiJson<Sub2ApiSessionResponse>(
          response,
          "Sub2API 会话接口返回了非 JSON 响应，请刷新页面后重试"
        )
      );
    } catch (error) {
      setSub2ApiSession(emptySub2ApiSession);
      if (!options.silent) {
        showTip(tipFromActionFailure({ kind: "failed", action: "加载 Sub2API 账号", error }));
      }
    }
  }

  async function attachSub2ApiToken(auth: Sub2ApiAuthHandoff): Promise<Sub2ApiSessionResponse> {
    const response = await fetch("/api/sub2api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "attachToken",
        accessToken: auth.accessToken,
        ...(auth.refreshToken ? { refreshToken: auth.refreshToken } : {}),
        ...(auth.expiresIn ? { expiresIn: auth.expiresIn } : {})
      })
    });

    if (!response.ok) {
      throw new StudioApiResponseError(await readApiErrorDetail(response));
    }

    return readApiJson<Sub2ApiSessionResponse>(
      response,
      "Sub2API 会话接口返回了非 JSON 响应，请刷新页面后重试"
    );
  }

  function toAssetRef(reference: ReferenceAssetDescriptor): AssetRef {
    return {
      key: reference.key,
      url: toAbsoluteUrl(reference.url),
      mimeType: reference.mimeType
    };
  }

  async function handleGenerate(options: { promptOverride?: string } = {}) {
    if (loading) {
      showDisabledTip("生成图片", "当前生成还未完成，请稍后再试。");
      return;
    }

    const customGenerationSize = useCustomResolution
      ? validateCustomGenerationSize({
          width: customWidth,
          height: customHeight
        })
      : null;

    if (customGenerationSize && !customGenerationSize.supported) {
      showTip({
        type: "warning",
        title: "分辨率不支持",
        message: getCustomSizeUnsupportedMessage(customGenerationSize)
      });
      return;
    }

    const metadata = buildPromptMetadata(options.promptOverride ?? prompt);
    const positivePrompt = metadata.finalPrompt.trim();
    const submissionPrompt = buildSubmissionPrompt(metadata);

    if (!positivePrompt) {
      showDisabledTip("生成图片", "请先输入提示词，或选择可作为提示词的风格预设。");
      return;
    }

    setLoading(true);
    setTip(null);
    setShareDialog(null);
    setSelectedHistoryThumb(null);
    setSelectedImageIndex(0);
    setRequestPreview(buildRequestPreview(metadata));
    const runId = generationRunIdRef.current + 1;
    generationRunIdRef.current = runId;
    const slots = buildGenerationSlots(generationCount);
    const slotBudgetMs = getGenerationRequestTimeoutMs(effectiveResolution, 1);
    const slotResults: Array<{ ok: boolean; error?: unknown }> = new Array(slots.length);

    const updateGenerationSlot = (
      slotIndex: number,
      updater: (slot: GenerationSlot) => GenerationSlot
    ) => {
      if (generationRunIdRef.current !== runId) {
        return;
      }

      setGenerationSlots((currentSlots) => {
        return currentSlots.map((slot) =>
          slot.index === slotIndex ? updater(slot) : slot
        );
      });
    };

    const readSlotErrorMessage = (error: unknown): string => {
      if (error instanceof StudioApiResponseError) {
        return error.detail.message;
      }

      if (error instanceof GenerationPollTimeoutError) {
        return `生成超过 ${Math.round(slotBudgetMs / 1000)} 秒仍未完成`;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        return "请求超时";
      }

      return error instanceof Error ? error.message : "生成失败";
    };

    try {
      await refreshSub2ApiSession({ silent: true });
      const uploadedReferences = referenceFiles.length
        ? await Promise.all(Array.from(referenceFiles || []).map((file) => uploadStudioAsset(file, "reference")))
        : [];
      const references = [...reusedReferences.map(toAssetRef), ...uploadedReferences];

      setGenerationSlots(slots);
      setImages([]);
      setCurrentTaskId(null);
      setSelectedInspirationImage(null);
      setSelectedHistoryThumb(null);
      setCanvasPrompt(submissionPrompt);

      await runWithConcurrency(slots, 2, async (slot) => {
        updateGenerationSlot(slot.index, (currentSlot) => ({
          ...currentSlot,
          status: "running",
          startedAtMs: Date.now(),
          errorMessage: undefined
        }));

        const submitController = new AbortController();
        const submitTimeoutId = window.setTimeout(
          () => submitController.abort(),
          slotBudgetMs + 30_000
        );

        try {
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: submitController.signal,
            body: JSON.stringify({
              prompt: buildVariationPrompt(submissionPrompt, slot.index, generationCount),
              mode: submitMode,
              model,
              size: activeSize.size,
              resolution: effectiveResolution,
              quality,
              count: 1,
              referenceAssets: references
            })
          });
          window.clearTimeout(submitTimeoutId);

          if (!response.ok) {
            throw new StudioApiResponseError(await readApiErrorDetail(response));
          }

          const submitResult = await readApiJson<GenerateSubmitResponse>(
            response,
            "生成接口返回了非 JSON 响应，请刷新页面后重试"
          );
          let generatedImages: GeneratedImage[] = (submitResult.images || []).map(
            buildGeneratedImageFromAsset
          );

          setQuota((current) => (current ? { ...current, quota: submitResult.quota } : current));
          if (slot.index === 0) {
            setCurrentTaskId(submitResult.taskId);
          }

          if (!generatedImages.length) {
            const task = await pollGenerationTask(submitResult.taskId, {
              budgetMs: slotBudgetMs,
              intervalMs: GENERATION_POLL_INTERVAL_MS
            });

            if (task.status === "failed") {
              throw new Error(task.errorMessage || "生成失败，请稍后重试。");
            }

            generatedImages = task.assets
              .filter((asset) => asset.type === "result")
              .map(buildGeneratedImageFromAsset);
          }

          const image = generatedImages[0]
            ? { ...generatedImages[0], taskId: submitResult.taskId }
            : null;
          if (!image) {
            throw new Error("图片已生成，但接口没有返回可显示的图片。");
          }

          updateGenerationSlot(slot.index, (currentSlot) => ({
            ...currentSlot,
            status: "succeeded",
            taskId: submitResult.taskId,
            image,
            completedAtMs: Date.now(),
            errorMessage: undefined
          }));
          slotResults[slot.index] = { ok: true };
        } catch (error) {
          window.clearTimeout(submitTimeoutId);
          updateGenerationSlot(slot.index, (currentSlot) => ({
            ...currentSlot,
            status: "failed",
            completedAtMs: Date.now(),
            errorMessage: readSlotErrorMessage(error)
          }));
          slotResults[slot.index] = { ok: false, error };
        }
      });

      const succeededCount = slotResults.filter((result) => result?.ok).length;
      const failedCount = slotResults.filter((result) => result && !result.ok).length;

      if (succeededCount > 0) {
        setReusedReferences([]);
        showTip({
          type: failedCount > 0 ? "warning" : "success",
          title: failedCount > 0 ? "部分生成完成" : "生成完成",
          message:
            failedCount > 0
              ? `已完成 ${succeededCount}/${generationCount} 张，失败的窗口可查看具体状态。`
              : "把这个提示词分享出去，让别人一键生成同款。"
        });
      } else {
        const firstError = slotResults.find((result) => result?.error)?.error;
        if (firstError instanceof StudioApiResponseError) {
          showTip(tipFromApiError(firstError.detail));
        } else {
          showTip(tipFromActionFailure({ kind: "failed", action: "生成图片", error: firstError }));
        }
      }

      await refreshData();
      await refreshSub2ApiSession({ silent: true });
    } catch (error) {
      setGenerationSlots([]);
      if (error instanceof StudioApiResponseError) {
        showTip(tipFromApiError(error.detail));
      } else {
        showTip(tipFromActionFailure({ kind: "failed", action: "生成图片", error }));
      }
    } finally {
      if (generationRunIdRef.current === runId) {
        setLoading(false);
      }
    }
  }

  function buildPromptMetadata(userPrompt: string): PromptEnhancementMetadata {
    const promptWithDetail = detailStrength >= 72 && userPrompt.trim()
      ? appendPromptToken(userPrompt, "细节锐利")
      : userPrompt;

    return buildPromptEnhancementMetadata({
      userPrompt: promptWithDetail,
      selectedStyle,
      negativePrompt
    });
  }

  function buildRequestPreview(metadata: PromptEnhancementMetadata): string {
    return buildGenerationRequestPreview({
      prompt: buildSubmissionPrompt(metadata),
      rawPrompt: metadata.rawPrompt,
      finalPrompt: metadata.finalPrompt,
      selectedStyle: metadata.selectedStyle,
      negativePrompt: metadata.negativePrompt,
      providerSupportNotes: [
        ...metadata.providerSupportNotes,
        ...(reusedReferences.length ? [urlOnlyReferenceSupportNote] : [])
      ],
      model,
      mode: submitMode,
      size: activeSize.size,
      resolution: effectiveResolution,
      quality,
      count: generationCount,
      referenceCount,
      hasMask: false
    });
  }

  function buildSubmissionPrompt(metadata: PromptEnhancementMetadata): string {
    const finalPrompt = metadata.finalPrompt.trim();

    if (!finalPrompt || !metadata.negativePrompt) {
      return finalPrompt;
    }

    return `${finalPrompt}\n避免：${metadata.negativePrompt}`;
  }

  function handleReferenceChange(files: FileList | null) {
    const nextFiles = Array.from(files || []);

    if (!nextFiles.length) {
      return;
    }

    setReferenceFiles((currentFiles) => appendReferenceFiles(currentFiles, nextFiles));
    setMode("image-to-image");
    showTip({
      type: "success",
      title: "参考图已添加",
      message: `已追加 ${nextFiles.length} 张参考图，当前共 ${referenceCount + nextFiles.length} 张。`
    });
  }

  function handleReferenceInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleReferenceChange(event.currentTarget.files);
    event.currentTarget.value = "";
  }

  function handleRemoveReference(item: ReferencePreviewItem) {
    if (item.kind === "reused") {
      setReusedReferences((currentReferences) =>
        removeReusedReferenceAt(currentReferences, item.reusedIndex ?? -1)
      );
    } else {
      setReferenceFiles((currentFiles) => removeReferenceFileAt(currentFiles, item.fileIndex ?? -1));
    }

    showTip({
      type: "info",
      title: "参考图已删除",
      message: `${item.alt} 已从下一次生成请求中移除。`
    });
  }

  function handleResolutionChange(nextResolution: ImageResolutionTier) {
    const recommendedRatio = getRecommendedRatioForResolution(nextResolution);
    const unsupportedReason = getUnsupportedGenerationSizeReason({
      ratio: ratioLabel,
      resolution: nextResolution
    });

    setUseCustomResolution(false);
    setImageResolution(nextResolution);
    setModel(getPreferredImage2ModelForResolution(nextResolution));

    if (recommendedRatio && unsupportedReason) {
      setRatioLabel(recommendedRatio);
      showTip({
        type: "warning",
        title: "已切换为 16:9",
        message: `${unsupportedReason} 已为你切换到推荐的 ${recommendedRatio}。`
      });
    }
  }

  function getPreferredImage2ModelForResolution(resolution: ImageResolutionTier): ModelKey {
    const preferredModel = image2ModelByResolution[resolution];
    return studioModelOptions.some((option) => option.key === preferredModel)
      ? preferredModel
      : "gpt-image-2";
  }

  function handleRatioChange(option: (typeof ratioOptions)[number]) {
    const unsupportedReason = getUnsupportedGenerationSizeReason({
      ratio: option.label,
      resolution: imageResolution
    });

    if (unsupportedReason) {
      showTip({
        type: "warning",
        title: "尺寸不支持",
        message: unsupportedReason
      });
      return;
    }

    setUseCustomResolution(false);
    setRatioLabel(option.label);
  }

  function handleCustomResolutionClick() {
    if (!useCustomResolution) {
      const [width, height] = activeSize.size.split("x");
      setCustomWidth(width);
      setCustomHeight(height);
      setUseCustomResolution(true);
      return;
    }

    const customGenerationSize = validateCustomGenerationSize({
      width: customWidth,
      height: customHeight
    });

    if (!customGenerationSize.supported) {
      showTip({
        type: "warning",
        title: "分辨率不支持",
        message: getCustomSizeUnsupportedMessage(customGenerationSize)
      });
    }
  }

  function handleApplyTag(tag: string) {
    setPrompt((current) => appendPromptToken(current, tag));
  }

  function handleApplyPromptLibraryItem(item: PromptLibraryItem) {
    setPrompt(item.prompt);
    setGenerationSlots([]);
    setImages([]);
    setSelectedImageIndex(0);
    setCurrentTaskId(null);
    setSelectedInspirationImage(item.image);
    setSelectedHistoryThumb(null);
    setCanvasPrompt(null);
    setRequestPreview(null);
    setShareDialog(null);
    showTip({
      type: "success",
      title: "提示词已套用",
      message: item.title
    });
  }

  function handleApplySavedPortfolioItem(item: SavedPortfolioItem) {
    setPrompt(item.prompt);
    setGenerationSlots([]);
    setImages([]);
    setSelectedImageIndex(0);
    setCurrentTaskId(null);
    setSelectedInspirationImage(item.url);
    setSelectedHistoryThumb(null);
    setCanvasPrompt(item.prompt || null);
    setRequestPreview(null);
    setShareDialog(null);
    showTip({
      type: "info",
      title: "已打开作品",
      message: item.prompt || "作品已显示在画布中。"
    });
  }

  function handleHistoryThumbClick(thumb: HistoryThumb) {
    setGenerationSlots([]);
    setImages([
      {
        key: thumb.key || thumb.id,
        taskId: thumb.taskId,
        url: thumb.url,
        originalUrl: thumb.originalUrl,
        mimeType: thumb.mimeType || "image/png"
      }
    ]);
    setSelectedImageIndex(0);
    setSelectedInspirationImage(null);
    setSelectedHistoryThumb(thumb);
    setCurrentTaskId(thumb.taskId || null);
    setCanvasPrompt(thumb.prompt || null);
    setRequestPreview(null);
    setShareDialog(null);
  }

  function handleOpenExplore() {
    setActiveHeaderPanel(null);
    setActiveLibraryTab("热门");
    scrollLibraryIntoView();
    showTip({
      type: "info",
      title: "探索已打开",
      message: "提示词库已切换到热门灵感。"
    });
  }

  function handleOpenInvitePanel() {
    setActiveHeaderPanel("invite");
    showTip({
      type: "info",
      title: "邀请有礼",
      message: quota?.actorType === "user"
        ? "邀请面板已打开，奖励和邀请链接由 Lumio 账户中心管理。"
        : "邀请奖励由 Lumio 账户中心管理，请先登录。"
    });
  }

  function handleLoginClick(event: MouseEvent<HTMLAnchorElement>) {
    const nextLoginUrl = buildSub2ApiLoginUrl({
      loginBaseUrl,
      returnToUrl: window.location.href
    });
    event.currentTarget.href = nextLoginUrl;
    setLoginReturnToUrl(stripSub2ApiAuthParamsFromUrl(window.location.href));
    showTip({
      type: "info",
      title: "登录",
      message: "正在跳转到 Sub2API 登录页，登录成功后会回到当前页面。"
    });
  }

  async function handleSub2ApiLogout() {
    try {
      const response = await fetch("/api/sub2api/session", { method: "DELETE" });
      if (!response.ok) {
        throw new StudioApiResponseError(await readApiErrorDetail(response));
      }

      setSub2ApiSession(emptySub2ApiSession);
      setActiveHeaderPanel(null);
      await refreshData();
      showTip({
        type: "success",
        title: "已退出登录",
        message: "本地 Sub2API 登录态已清除。"
      });
    } catch (error) {
      showTip(tipFromActionFailure({ kind: "failed", action: "退出登录", error }));
    }
  }

  function scrollLibraryIntoView() {
    window.requestAnimationFrame(() => {
      libraryPanelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  function handleClearCanvas() {
    if (!ensureActionEnabled("删除当前图片", actionStates.delete)) {
      return;
    }

    if (generationSlots.length > 1) {
      const nextSlots = generationSlots
        .filter((_, index) => index !== selectedImageIndex)
        .map((slot, index) => ({ ...slot, index }));
      setGenerationSlots(nextSlots);
      setSelectedImageIndex(Math.min(selectedImageIndex, nextSlots.length - 1));
      setShareDialog(null);
    } else if (images.length > 1) {
      const nextImages = images.filter((_, index) => index !== selectedImageIndex);
      setImages(nextImages);
      setSelectedImageIndex(Math.min(selectedImageIndex, nextImages.length - 1));
      setShareDialog(null);
    } else {
      setGenerationSlots([]);
      setImages([]);
      setSelectedImageIndex(0);
      setCurrentTaskId(null);
      setSelectedInspirationImage(null);
      setSelectedHistoryThumb(null);
      setCanvasPrompt(null);
      setRequestPreview(null);
      setShareDialog(null);
    }

    showTip({
      type: "success",
      title: "已删除当前图片",
      message: generationSlots.length > 1 || images.length > 1 ? "已从当前结果组移除这张图。" : "画布已清空。"
    });
  }

  async function handleSaveToPortfolio() {
    if (!ensureActionEnabled("保存到作品集", actionStates.save) || !canvasImage) {
      return;
    }

    try {
      const existingItems = await loadSavedPortfolioItems({
        storage: window.localStorage,
        assetStore: portfolioAssetStore
      });
      const savedItem = buildLocalPortfolioItem({
        image: canvasImage,
        prompt: canvasPrompt || promptEnhancement.rawPrompt,
        savedAt: new Date().toISOString()
      });

      const nextItems = upsertLocalPortfolioItem(existingItems, savedItem);
      const savedItems = await savePortfolioItems({
        items: nextItems,
        storage: window.localStorage,
        assetStore: portfolioAssetStore
      });
      setSavedPortfolioItems(savedItems);
      setActiveLibraryTab("我的");
      showTip({
        type: "success",
        title: "已保存到作品集",
        message: "可在提示词库的“我的”标签查看。也可以点击绿色的“分享提示词卡片”，把图和提示词一起发给别人。"
      });
    } catch (error) {
      showTip(tipFromActionFailure({ kind: "failed", action: "保存到作品集", error }));
    }
  }

  async function handleShareCurrentImage() {
    if (
      !ensureActionEnabled("分享提示词", actionStates.share) ||
      !canvasImage ||
      !activeTaskId
    ) {
      return;
    }

    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeTaskId,
          imageUrl: canvasImage.originalUrl || canvasImage.url
        })
      });

      if (!response.ok) {
        throw new StudioApiResponseError(await readApiErrorDetail(response));
      }

      const body = await readApiJson<{
        share: {
          id: string;
          url: string;
          complianceNotice?: string;
        };
      }>(response, "分享接口返回了非 JSON 响应，请刷新页面后重试");

      const complianceNotice =
        body.share.complianceNotice || "仅供学习交流，禁止传播任何色情非法内容。";
      setShareDialog({
        imageUrl: canvasImage.url,
        prompt: getCurrentSharePrompt(),
        shareUrl: body.share.url,
        complianceNotice
      });
      showTip({
        type: "success",
        title: "分享卡片已准备好",
        message: `可复制分享文案、下载卡片或打开分享页。${complianceNotice}`,
        actionLabel: "打开分享页",
        actionHref: body.share.url
      });
    } catch (error) {
      if (error instanceof StudioApiResponseError) {
        showTip(tipFromApiError(error.detail));
      } else {
        showTip(tipFromActionFailure({ kind: "failed", action: "分享提示词", error }));
      }
    }
  }

  function handleUseCurrentAsReference() {
    if (!ensureActionEnabled("用作参考图", actionStates.referenceReuse)) {
      return;
    }

    const result = buildReferenceAssetDescriptor({ image: canvasImage, prompt: canvasPrompt || prompt });

    if (!result.ok) {
      showDisabledTip("用作参考图", result.reason);
      return;
    }

    setReusedReferences((currentReferences) =>
      appendReusedReference(currentReferences, result.reference)
    );
    setSelectedInspirationImage(result.reference.url);
    setSelectedHistoryThumb(null);
    setMode("image-to-image");
    showTip({
      type: "info",
      title: "已设为参考图",
      message: "当前画布图片已追加到参考图列表，会随下一次生成请求发送。"
    });
  }

  async function handleDownloadCurrentImage() {
    if (!ensureActionEnabled("下载图片", actionStates.download) || !canvasImage) {
      return;
    }

    try {
      showTip({
        type: "info",
        title: "正在下载",
        message: "正在通过 Chrome 下载通道准备当前图片，请稍候。"
      });

      const downloadResult = await downloadGeneratedImage(
        {
          key: canvasImage.key,
          url: canvasImage.url,
          mimeType: canvasImage.mimeType
        },
        0
      );

      if (downloadResult.mode === "opened") {
        showTip({
          type: "info",
          title: "已打开原图",
          message: "Chrome 已在新标签页打开原图 URL。若未自动下载，请在新标签页中使用浏览器保存图片。"
        });
        return;
      }

      showTip({
        type: "success",
        title: "下载完成",
        message: `已交给 Chrome 下载：${downloadResult.fileName}。`
      });
    } catch (error) {
      showTip(tipFromActionFailure({ kind: "failed", action: "下载图片", error }));
    }
  }

  function handleRegenerate() {
    if (!ensureActionEnabled("重新生成", actionStates.regenerate)) {
      return;
    }

    void handleGenerate({
      promptOverride: prompt.trim() ? prompt : canvasPrompt || ""
    });
  }

  async function handleCopyRequestPreview() {
    const text = requestPreview || canvasPrompt || buildRequestPreview(promptEnhancement);

    if (!text.trim()) {
      showDisabledTip("复制提示词", "暂无可复制内容。");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showTip({
        type: "success",
        title: "已复制",
        message: "请求预览已复制到剪贴板。"
      });
    } catch (error) {
      showTip(tipFromActionFailure({ kind: "failed", action: "复制请求预览", error }));
    }
  }

  async function handleCopyCanvasPrompt() {
    const text = getCurrentSharePrompt();

    if (!text.trim()) {
      showDisabledTip("复制提示词", "暂无可复制内容。");
      throw new Error("No prompt is available to copy.");
    }

    try {
      await navigator.clipboard.writeText(text);
      showTip({
        type: "success",
        title: "已复制",
        message: "提示词已复制到剪贴板。"
      });
    } catch (error) {
      showTip(tipFromActionFailure({ kind: "failed", action: "复制提示词", error }));
      throw error;
    }
  }

  function getCurrentSharePrompt(): string {
    return (canvasPrompt || promptEnhancement.finalPrompt || promptEnhancement.rawPrompt || "").trim();
  }

  function ensureActionEnabled(action: string, state: StudioActionState): boolean {
    if (state.enabled) {
      return true;
    }

    showDisabledTip(action, state.reason);
    return false;
  }

  function showDisabledTip(action: string, reason?: string) {
    showTip(tipFromActionFailure({ kind: "disabled", action, reason }));
  }

  function showTip(nextTip: StudioTip) {
    setTip(nextTip);
  }

  async function tipFromSettledResponse(
    action: string,
    response: PromiseSettledResult<Response>
  ): Promise<StudioTip> {
    if (response.status === "rejected") {
      return tipFromActionFailure({ kind: "failed", action, error: response.reason });
    }

    return tipFromApiError(await readApiErrorDetail(response.value));
  }

  return (
    <main className="studio-app">
      <AppShell
        active="探索"
        onExplore={handleOpenExplore}
        onTutorials={() => setActiveHeaderPanel("tutorials")}
        statsSlot={
          <span className="global-stats-pill" title={globalStats ? globalGenerationText : undefined}>
            <StudioIcon name="sparkle" size={13} />
            {globalStats ? (
              <>
                <span className="global-stats-full">{globalGenerationText}</span>
                <span className="global-stats-compact">{compactGlobalGenerationText}</span>
              </>
            ) : (
              <span className="stat-skeleton" />
            )}
          </span>
        }
        accountSlot={
          <>
            <span className="quota-pill">
              <span className="pill-label">免费次数</span>
              {quotaText}
            </span>
            {sub2ApiSession?.authenticated ? (
              <span className="balance-pill" title="Sub2API 实时余额">
                <span className="pill-label">余额</span>
                {sub2ApiBalanceText}
              </span>
            ) : null}
            <button className="invite-pill" type="button" onClick={handleOpenInvitePanel}>
              <StudioIcon name="gift" size={14} />
              邀请有礼
            </button>
            <ThemeToggle />
            {sub2ApiSession?.authenticated ? (
              <AccountMenu
                email={accountLabel}
                accountCenterUrl={lumioAccountUrl}
                onLogout={() => void handleSub2ApiLogout()}
              />
            ) : (
              <a className="login-pill" href={loginUrl} onClick={handleLoginClick}>
                登录
              </a>
            )}
          </>
        }
      />

      {activeHeaderPanel && activeHeaderPanel !== "auth" ? (
        <HeaderContextPanel
          panel={activeHeaderPanel}
          loginUrl={loginUrl}
          lumioAccountUrl={lumioAccountUrl}
          quota={quota}
          onClose={() => setActiveHeaderPanel(null)}
        />
      ) : null}

      <div className="studio-grid">
        <section className="prompt-panel" aria-label="创作面板">
          <PanelHeader title="创作面板" subtitle="用对话生成你想要的画面" />

          <div className="panel-scroll left-panel-scroll" ref={leftPanelRef}>
            <section className="studio-section prompt-section">
              <SectionLabel>提示词</SectionLabel>
              <div className="prompt-card">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="描述你想要的画面，例如：一只在赛博朋克霓虹街道上漫步的白猫，电影感光线"
                />
                <div className="prompt-action-row">
                  <div className={referencePreviewItems.length ? "reference-row has-reference" : "reference-row"}>
                    {referencePreviewItems.map((item) => (
                      <div className="reference-thumb" key={item.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt={item.alt} />
                        <button
                          className="reference-remove"
                          type="button"
                          aria-label={`删除${item.alt}`}
                          onClick={() => handleRemoveReference(item)}
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <label className="reference-add" aria-label="添加参考图">
                      <StudioIcon name="plus" size={16} />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={handleReferenceInputChange}
                      />
                    </label>
                  </div>
                  <label className="resolution-select">
                    <span>分辨率</span>
                    <select
                      value={imageResolution}
                      onChange={(event) => handleResolutionChange(event.currentTarget.value as ImageResolutionTier)}
                      aria-label="图片分辨率"
                    >
                      {imageResolutionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={loading ? "generate-fab is-disabled" : "generate-fab"}
                    type="button"
                    aria-disabled={loading}
                    onClick={() => void handleGenerate()}
                    aria-label="生成图片"
                  >
                    <StudioIcon name="arrowUp" size={16} />
                  </button>
                </div>
              </div>
            </section>

            <section className="studio-section negative-section">
              <SectionLabel>负面提示词</SectionLabel>
              <input
                className="negative-input"
                value={negativePrompt}
                onChange={(event) => setNegativePrompt(event.target.value)}
                placeholder="不希望出现的元素"
              />
            </section>

            <section className="studio-section model-section">
              <SectionLabel>模型</SectionLabel>
              <div className="model-control-grid">
                <label className="studio-select-control">
                  <span>模型</span>
                  <select
                    value={model}
                    onChange={(event) => setModel(event.currentTarget.value as ModelKey)}
                    aria-label="选择生成模型"
                  >
                    {studioModelOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="studio-select-control">
                  <span>张数</span>
                  <select
                    value={generationCount}
                    onChange={(event) =>
                      setGenerationCount(Number(event.currentTarget.value) as GenerationCount)
                    }
                    aria-label="选择生成张数"
                  >
                    {generationCountOptions.map((option) => (
                      <option key={option} value={option}>
                        {option} 张
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="studio-section ratio-section">
              <SectionLabel>画幅比例</SectionLabel>
              <div className="ratio-control-row">
                <div className="ratio-grid" role="group" aria-label="选择画幅比例">
                  {ratioOptions.map((option) => (
                    <button
                      key={option.label}
                      className={!useCustomResolution && ratioLabel === option.label ? "ratio-button is-selected" : "ratio-button"}
                      type="button"
                      aria-pressed={!useCustomResolution && ratioLabel === option.label}
                      onClick={() => handleRatioChange(option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  className={useCustomResolution ? "custom-resolution-button is-selected" : "custom-resolution-button"}
                  type="button"
                  aria-pressed={useCustomResolution}
                  onClick={handleCustomResolutionClick}
                >
                  自定义分辨率
                </button>
              </div>
              {useCustomResolution ? (
                <div
                  className={
                    customSizeValidation && !customSizeValidation.supported
                      ? "custom-size-fields is-invalid"
                      : "custom-size-fields"
                  }
                >
                  <label>
                    <span>宽</span>
                    <input
                      className="custom-size-input"
                      value={customWidth}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="1024"
                      aria-label="自定义宽度"
                      onChange={(event) => setCustomWidth(event.currentTarget.value.replace(/\D/g, ""))}
                    />
                  </label>
                  <span className="custom-size-multiply">×</span>
                  <label>
                    <span>高</span>
                    <input
                      className="custom-size-input"
                      value={customHeight}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="1024"
                      aria-label="自定义高度"
                      onChange={(event) => setCustomHeight(event.currentTarget.value.replace(/\D/g, ""))}
                    />
                  </label>
                  <p className="custom-size-help">{customResolutionHelpText}</p>
                </div>
              ) : null}
            </section>

            <section className="studio-section detail-section">
              <SectionLabel>细节强度</SectionLabel>
              <input
                className="detail-slider"
                type="range"
                min={0}
                max={100}
                value={detailStrength}
                onChange={(event) => setDetailStrength(Number(event.target.value))}
                style={{ "--slider-progress": `${detailStrength}%` } as CSSProperties}
                aria-label="细节强度"
              />
              <div className="slider-copy">
                <span>柔和</span>
                <span>锐利</span>
              </div>
            </section>
          </div>
        </section>

        <section className="canvas-area" aria-label="生成结果">
          <div className="canvas-meta">
            <div>
              <div className="meta-line">
                <span className="model-chip">
                  <StudioIcon name="sparkle" size={12} />
                  {currentModelLabel}
                </span>
                <span>{canvasMeta.size}</span>
                <span className="meta-dot">·</span>
                <span>{canvasMeta.timing}</span>
                <span className="meta-dot">·</span>
                <span>{canvasMeta.status}</span>
                {visibleResultCount > 1 ? (
                  <>
                    <span className="meta-dot">·</span>
                    <span>{selectedImageIndex + 1}/{visibleResultCount}</span>
                  </>
                ) : null}
              </div>
              {canvasPrompt ? <p>{canvasPrompt}</p> : null}
            </div>
            <button type="button" className="icon-button ghost" onClick={() => void handleCopyRequestPreview()} aria-label="复制提示词">
              <StudioIcon name="copy" size={16} />
            </button>
          </div>

          <div className="image-stage">
            {isCanvasGrid ? (
              <div
                className={[
                  "multi-image-frame",
                  generationSlots.length > 1
                    ? `count-${generationSlots.length}`
                    : visibleCanvasImages.length > 1
                      ? `count-${visibleCanvasImages.length}`
                      : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="generated-image-grid" role="list" aria-label="生成结果列表">
                  {generationSlots.length > 1
                    ? generationSlots.map((slot, index) => {
                        const elapsedSeconds = getGenerationSlotElapsedSeconds(slot);
                        const slotProgress =
                          slot.status === "succeeded"
                            ? 100
                            : slot.status === "failed"
                              ? 0
                              : slot.status === "queued"
                                ? 0
                                : estimateGenerationProgress(elapsedSeconds);

                        return (
                          <button
                            className={[
                              "generated-image-tile",
                              selectedImageIndex === index ? "is-selected" : "",
                              slot.status === "succeeded" ? "is-complete" : "",
                              slot.status === "failed" ? "is-failed" : "",
                              slot.status === "queued" || slot.status === "running" ? "is-pending" : ""
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedImageIndex(index)}
                            aria-label={`选择第 ${index + 1} 张生成图`}
                            aria-pressed={selectedImageIndex === index}
                          >
                            {slot.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={slot.image.url} alt={`生成预览 ${index + 1}`} />
                            ) : (
                              <div className="generated-tile-loading">
                                <span>{getGenerationSlotStatusLabel(slot.status)}</span>
                                <div
                                  className="tile-loading-progress"
                                  role="progressbar"
                                  aria-valuenow={slotProgress}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  <div
                                    className="tile-loading-progress-bar"
                                    style={{ width: `${slotProgress}%` }}
                                  />
                                </div>
                                <small>
                                  {slot.status === "failed"
                                    ? slot.errorMessage || "生成失败"
                                    : slot.status === "queued"
                                      ? "等待空闲通道"
                                      : `${elapsedSeconds || 1}s`}
                                </small>
                              </div>
                            )}
                          </button>
                        );
                      })
                    : visibleCanvasImages.map((image, index) => (
                      <button
                        className={
                          selectedImageIndex === index
                            ? "generated-image-tile is-selected"
                            : "generated-image-tile"
                        }
                        key={image.key || image.url}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        aria-label={`选择第 ${index + 1} 张生成图`}
                        aria-pressed={selectedImageIndex === index}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={`生成预览 ${index + 1}`} />
                      </button>
                    ))}
                </div>
                {loading && generationSlots.length > 0 && canvasLoadingWarningText ? (
                  <div className="generation-loading-note" role="status">
                    <strong>请保持页面打开</strong>
                    <p>{canvasLoadingWarningText}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                className={[
                  "main-image-frame",
                  visibleCanvasImage ? "" : "is-empty",
                  loading ? "is-loading" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {generationSlots.length === 1 && !visibleCanvasImage ? (
                  generationSlots[0].status === "failed" ? (
                    <div className="canvas-failed" role="alert">
                      <p className="canvas-failed-title">
                        生成没有成功 · 上游服务暂时繁忙，<strong>本次未扣除额度</strong>
                      </p>
                      {generationSlots[0].errorMessage ? (
                        <p className="canvas-failed-detail">{generationSlots[0].errorMessage}</p>
                      ) : null}
                      <button
                        className="canvas-retry-button"
                        type="button"
                        onClick={handleRegenerate}
                      >
                        <StudioIcon name="refresh" size={14} />
                        重试一次
                      </button>
                    </div>
                  ) : (
                    <div className="generated-tile-loading">
                      <span>{getGenerationSlotStatusLabel(generationSlots[0].status)}</span>
                      <div
                        className="tile-loading-progress"
                        role="progressbar"
                        aria-valuenow={
                          generationSlots[0].status === "running"
                            ? estimateGenerationProgress(getGenerationSlotElapsedSeconds(generationSlots[0]))
                            : 0
                        }
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="tile-loading-progress-bar"
                          style={{
                            width: `${
                              generationSlots[0].status === "running"
                                ? estimateGenerationProgress(getGenerationSlotElapsedSeconds(generationSlots[0]))
                                : 0
                            }%`
                          }}
                        />
                      </div>
                      <small>
                        {generationSlots[0].status === "queued"
                          ? "等待空闲通道"
                          : `${getGenerationSlotElapsedSeconds(generationSlots[0]) || 1}s`}
                      </small>
                    </div>
                  )
                ) : visibleCanvasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={visibleCanvasImage.url} alt="生成预览" />
                ) : !loading && canvasPlaceholderText ? (
                  <div className="canvas-empty">
                    <p className="canvas-empty-title">
                      从一句<u className="canvas-empty-keyword">提示词</u>开始
                    </p>
                    <p className="canvas-empty-hint">
                      在左侧描述你想要的画面，选好模型与画幅，点亮紫色生成按钮即可出图。
                    </p>
                    <div className="canvas-empty-examples">
                      {CANVAS_EMPTY_EXAMPLE_PROMPTS.map((example) => (
                        <button
                          key={example}
                          className="canvas-empty-example"
                          type="button"
                          onClick={() => setPrompt(example)}
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {loading && generationSlots.length === 0 ? (
                  <div className="image-loading">
                    <span>生成中 {loadingSeconds}s</span>
                    <div
                      className="image-loading-progress"
                      role="progressbar"
                      aria-valuenow={generationProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="image-loading-progress-bar"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <p>出图通常需要 1–3 分钟，请保持页面打开；完成后会自动显示。</p>
                    {canvasLoadingWarningText ? <p>{canvasLoadingWarningText}</p> : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="canvas-actions">
            <button
              className={actionStates.save.enabled ? "save-button" : "save-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.save.enabled}
              title={actionStates.save.reason || "保存到作品集"}
              data-tooltip={actionStates.save.reason || "保存到作品集"}
              onClick={() => void handleSaveToPortfolio()}
            >
              <StudioIcon name="check" size={14} />
              保存到作品集
            </button>
            <button
              className={canvasImage ? "open-in-canvas-button" : "open-in-canvas-button is-disabled"}
              type="button"
              aria-disabled={!canvasImage}
              title="在画布中打开"
              data-tooltip="在画布中打开"
              onClick={() => {
                try {
                  if (canvasImage?.url) {
                    window.localStorage.setItem(
                      "lumio:canvas-handoff",
                      JSON.stringify({
                        url: canvasImage.url,
                        prompt,
                        model,
                        size: activeSize?.size,
                        createdAt: Date.now()
                      })
                    );
                  }
                } catch {
                  /* localStorage unavailable — open the canvas anyway */
                }
                window.location.href = "/canvas";
              }}
            >
              <StudioIcon name="imagePlus" size={14} />
              在画布中打开
            </button>
            <button
              className={actionStates.share.enabled ? "share-card-button" : "share-card-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.share.enabled}
              title={actionStates.share.reason || "分享提示词卡片"}
              data-tooltip={actionStates.share.reason || "分享提示词卡片"}
              onClick={() => void handleShareCurrentImage()}
              aria-label="分享提示词卡片"
            >
              <StudioIcon name="share" size={16} />
              分享提示词卡片
            </button>
            <button
              className={actionStates.delete.enabled ? "icon-button" : "icon-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.delete.enabled}
              title={actionStates.delete.reason || "删除当前图片"}
              data-tooltip={actionStates.delete.reason || "删除当前图片"}
              onClick={handleClearCanvas}
              aria-label="删除当前图片"
            >
              <StudioIcon name="trash" size={16} />
            </button>
            <span className="action-divider" />
            <button
              className={actionStates.referenceReuse.enabled ? "icon-button" : "icon-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.referenceReuse.enabled}
              title={actionStates.referenceReuse.reason || "用作参考图"}
              data-tooltip={actionStates.referenceReuse.reason || "用作参考图"}
              onClick={handleUseCurrentAsReference}
              aria-label="用作参考图"
            >
              <StudioIcon name="imagePlus" size={16} />
            </button>
            <button
              className={actionStates.download.enabled ? "icon-button" : "icon-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.download.enabled}
              title={actionStates.download.reason || "下载图片"}
              data-tooltip={actionStates.download.reason || "下载图片"}
              onClick={() => void handleDownloadCurrentImage()}
              aria-label="下载图片"
            >
              <StudioIcon name="download" size={16} />
            </button>
            <button
              className={actionStates.regenerate.enabled ? "icon-button" : "icon-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.regenerate.enabled}
              title={actionStates.regenerate.reason || "重新生成"}
              data-tooltip={actionStates.regenerate.reason || "重新生成"}
              onClick={handleRegenerate}
              aria-label="重新生成"
            >
              <StudioIcon name="refresh" size={16} />
            </button>
          </div>

          <div className="canvas-history">
            <span>历史：</span>
            {historyThumbs.map((thumb) => {
              const isActiveThumb = canvasImage?.url === thumb.url;

              return (
                <button
                  key={thumb.id}
                  className={isActiveThumb ? "history-thumb is-active" : "history-thumb"}
                  type="button"
                  onClick={() => handleHistoryThumbClick(thumb)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb.url} alt="" />
                  {isActiveThumb ? (
                    <span className="thumb-check">
                      <StudioIcon name="check" size={8} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="library-panel" aria-label="提示词库" ref={libraryPanelRef}>
          <PanelHeader title="提示词库" subtitle="点击直接套用提示词" />

          <div className="library-controls">
            <label className="library-search">
              <StudioIcon name="search" size={14} />
              <input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="搜索灵感"
              />
            </label>

            <div className="library-tabs" role="tablist" aria-label="提示词分类">
              {libraryTabs.map((tab) => (
                <button
                  key={tab}
                  className={activeLibraryTab === tab ? "is-selected" : ""}
                  type="button"
                  onClick={() => setActiveLibraryTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-scroll library-scroll">
            {activeLibraryTab === "我的" ? (
              <section className="studio-section library-section">
                <div className="library-title-row">
                  <p className="library-title">我的作品</p>
                  <span>{savedPortfolioItems.length}</span>
                </div>
                {savedPortfolioItems.length ? (
                  <div className="prompt-library-grid">
                    {savedPortfolioItems.map((item, index) => (
                      <button
                        key={item.id}
                        className="prompt-library-card"
                        type="button"
                        onClick={() => handleApplySavedPortfolioItem(item)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt=""
                          loading={getPromptLibraryImageLoading(index)}
                          decoding="async"
                        />
                        <span className="prompt-library-title">{item.prompt || "未命名作品"}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="library-empty">暂无保存作品</p>
                )}
              </section>
            ) : (
              <section className="studio-section library-section">
                <div className="library-title-row">
                  <p className="library-title">提示词库</p>
                  <span>{filteredPromptLibraryItems.length}</span>
                </div>
                {filteredPromptLibraryItems.length ? (
                  <div className="prompt-library-grid">
                    {filteredPromptLibraryItems.map((item, index) => (
                      <button
                        key={item.id}
                        className="prompt-library-card"
                        type="button"
                        onClick={() => handleApplyPromptLibraryItem(item)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt={item.title}
                          loading={getPromptLibraryImageLoading(index)}
                          decoding="async"
                        />
                        <span className="prompt-library-title">{item.title}</span>
                        <span className="prompt-library-meta">#{item.caseNumber} · {item.category}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="library-empty">没有匹配的提示词</p>
                )}
              </section>
            )}

            <section className="studio-section library-section keyword-section">
              <p className="library-title">关键词标签</p>
              <div className="keyword-list">
                {keywordTags.map((tag) => (
                  <button key={tag} type="button" onClick={() => handleApplyTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>

      {shareDialog ? (
        <SharePromptDialog
          share={shareDialog}
          onClose={() => setShareDialog(null)}
          onCopyPrompt={handleCopyCanvasPrompt}
        />
      ) : null}
      {tip ? <StudioTipToast tip={tip} /> : null}
    </main>
  );
}

function toAbsoluteUrl(url: string): string {
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

function getLumioAffiliateUrl(urlValue: string): string {
  try {
    return new URL("/affiliate", new URL(urlValue).origin).toString();
  } catch {
    return "https://api.lumio.games/affiliate";
  }
}

function readEmbeddedSub2ApiAuth(): Sub2ApiAuthHandoff | null {
  return readSub2ApiAuthFromUrl(window.location.href);
}

function removeEmbeddedAuthQueryParams() {
  const url = new URL(stripSub2ApiAuthParamsFromUrl(window.location.href));
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function HeaderContextPanel({
  panel,
  loginUrl,
  lumioAccountUrl,
  quota,
  onClose
}: {
  panel: Exclude<HeaderPanel, null | "auth">;
  loginUrl: string;
  lumioAccountUrl: string;
  quota: QuotaResponse | null;
  onClose: () => void;
}) {
  return (
    <section className="header-context-panel" aria-live="polite">
      <div>
        {panel === "tutorials" ? (
          <>
            <p className="context-eyebrow">教程</p>
            <h2>价格与额度说明</h2>
            <div className="context-highlight-grid" aria-label="重点说明">
              <span>1K：0.05 元/张</span>
              <span>2K/4K：0.2 元/张</span>
              <span>免费体验 3 次</span>
              <span>注册送 20 次</span>
              <span>邀请 1 人送 20 次</span>
            </div>
            <div className="context-section-list">
              <p>生成价格：1K 每张 0.05 元，2K 和 4K 每张 0.2 元。</p>
              <p>本站只记录普通用户免费体验 3 次，免费体验仅支持 1K。</p>
              <p>1K 请求超时时间为 250 秒；2K/4K 请求超时时间为 240 秒。</p>
              <p>注册送 20 次、邀请 1 人送 20 次由 api.lumio.games 管理，可在邀请返利页面查看。</p>
            </div>
            <h3>快速生成流程</h3>
            <ol>
              <li>写下主体、场景、用途和画幅。</li>
              <li>选择 1K、2K 或 4K 分辨率；免费体验只支持 1K，2K/4K 会使用登录账号的 Lumio Key/余额。</li>
              <li>上传本地参考图可进入图生图；画布图片复用会作为 URL 参考图发送。</li>
              <li>免费额度用完后，会使用已登录账号绑定的 Image-2（生图专用）Key 继续生成。</li>
            </ol>
          </>
        ) : (
          <>
            <p className="context-eyebrow">邀请有礼</p>
            <h2>邀请好友领取生成额度</h2>
            <div className="context-highlight-grid" aria-label="邀请重点说明">
              <span>免费体验 3 次</span>
              <span>注册送 20 次</span>
              <span>邀请 1 人送 20 次</span>
            </div>
            <div className="context-section-list">
              <p>本站只记录普通用户免费体验 3 次且仅支持 1K；本地 3 次用完后，会使用已登录账号的 Lumio Key/余额生成。</p>
              <p>注册送 20 次、邀请 1 人送 20 次由 api.lumio.games 管理，请到邀请返利页面查看邀请链接和奖励到账。</p>
              <p>账户权益用量和邀请奖励不计入本站本地 quota；生成价格为 1K 0.05 元，2K/4K 0.2 元，2K/4K 超时时间为 240 秒。</p>
              <p className="context-status-line">
                当前状态：
                <strong className={quota?.actorType === "user" ? "is-signed-in" : "is-signed-out"}>
                  {quota?.actorType === "user" ? "已登录" : "未登录"}
                </strong>
                {quota?.actorType === "user" ? "，可绑定邀请奖励。" : "，需先登录后才能绑定邀请奖励。"}
              </p>
            </div>
            <a
              className="context-login-link"
              href={quota?.actorType === "user" ? lumioAccountUrl : loginUrl}
              target="_blank"
              rel="noreferrer"
            >
              {quota?.actorType === "user" ? "去邀请返利页面" : "去登录"}
            </a>
          </>
        )}
      </div>
      <button className="context-close" type="button" onClick={onClose} aria-label="关闭提示面板">
        ×
      </button>
    </section>
  );
}

function StudioTipToast({ tip }: { tip: StudioTip }) {
  return (
    <aside className={`studio-tip studio-tip-${tip.type}`} aria-live="polite">
      <div>
        <strong>{tip.title}</strong>
        <p>{tip.message}</p>
      </div>
      {tip.actionHref ? (
        <a href={tip.actionHref} target="_blank" rel="noreferrer">
          {tip.actionLabel || "打开"}
        </a>
      ) : null}
    </aside>
  );
}

class StudioApiResponseError extends Error {
  readonly detail: ApiErrorDetail;

  constructor(detail: ApiErrorDetail) {
    super(detail.message || `HTTP ${detail.status}`);
    this.name = "StudioApiResponseError";
    this.detail = detail;
  }
}

function matchesLibraryTab(item: PromptLibraryItem, activeTab: string): boolean {
  if (activeTab === "热门") {
    return true;
  }

  if (activeTab === "人物") {
    return libraryTextMatches(item, /人物|角色|人像|头像|少女|美女|男士|女性|模特|coser|写真|肖像/);
  }

  if (activeTab === "场景") {
    return libraryTextMatches(item, /场景|城市|建筑|空间|室内|户外|地图|风景|海报|长卷|叙事/);
  }

  if (activeTab === "风格") {
    return libraryTextMatches(item, /风格|插画|摄影|写实|动漫|国风|水彩|电影|视觉|品牌|标志|排版|信息图|界面/);
  }

  return false;
}

function libraryTextMatches(item: PromptLibraryItem, pattern: RegExp): boolean {
  return pattern.test(`${item.title} ${item.category} ${item.prompt.slice(0, 500)}`);
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">{children}</p>;
}

function StudioIcon({ name, size }: { name: StudioIconName; size: number }) {
  return (
    <svg
      aria-hidden="true"
      className="studio-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderIconPath(name)}
    </svg>
  );
}

function renderIconPath(name: StudioIconName) {
  switch (name) {
    case "sparkle":
      return (
        <>
          <path d="M12 3l1.7 4.7L18 9.4l-4.3 1.7L12 16l-1.7-4.9L6 9.4l4.3-1.7L12 3z" />
          <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" />
          <path d="M19 14l.6 1.7 1.4.5-1.4.5L19 18l-.6-1.3-1.4-.5 1.4-.5L19 14z" />
        </>
      );
    case "grid":
      return (
        <>
          <path d="M4 4h6v6H4z" />
          <path d="M14 4h6v6h-6z" />
          <path d="M4 14h6v6H4z" />
          <path d="M14 14h6v6h-6z" />
        </>
      );
    case "cube":
      return (
        <>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M4 7.5l8 4.5 8-4.5" />
          <path d="M12 12v9" />
        </>
      );
    case "person":
      return (
        <>
          <path d="M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
          <path d="M7 20c.6-3 2.2-4.5 5-4.5s4.4 1.5 5 4.5" />
        </>
      );
    case "layers":
      return (
        <>
          <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" />
          <path d="M3 12l9 4.5 9-4.5" />
          <path d="M3 16.5L12 21l9-4.5" />
        </>
      );
    case "image":
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 13l2.5-2.5L15 15l1-1 4 4" />
          <circle cx="9" cy="9" r="1.2" />
        </>
      );
    case "aperture":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4l3.8 6.5" />
          <path d="M20 12h-7.5" />
          <path d="M16 19l-3.8-6.5" />
          <path d="M4 12h7.5" />
          <path d="M8 5l3.8 6.5" />
        </>
      );
    case "wand":
      return (
        <>
          <path d="M4 20l10-10" />
          <path d="M13 5l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
          <path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z" />
        </>
      );
    case "arrowUp":
      return (
        <>
          <path d="M12 19V5" />
          <path d="M6 11l6-6 6 6" />
        </>
      );
    case "plus":
      return (
        <>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </>
      );
    case "coin":
      return (
        <>
          <circle cx="9" cy="9" r="4" />
          <path d="M14 9c2.8.4 5 2.4 5 5 0 2.8-2.7 5-6 5-2.6 0-4.8-1.4-5.6-3.3" />
          <path d="M9 7v4" />
        </>
      );
    case "gift":
      return (
        <>
          <path d="M4 10h16v10H4z" />
          <path d="M12 10v10" />
          <path d="M3 6h18v4H3z" />
          <path d="M12 6c-1.6-3-5-2.4-5 0 0 2 3 2 5 0z" />
          <path d="M12 6c1.6-3 5-2.4 5 0 0 2-3 2-5 0z" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="11" cy="11" r="6" />
          <path d="M16 16l4 4" />
        </>
      );
    case "copy":
      return (
        <>
          <rect x="8" y="8" width="11" height="11" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </>
      );
    case "share":
      return (
        <>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 10.5l6.8-4" />
          <path d="M8.6 13.5l6.8 4" />
        </>
      );
    case "check":
      return <path d="M5 12l4 4L19 6" />;
    case "trash":
      return (
        <>
          <path d="M5 7h14" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M7 7l1 13h8l1-13" />
          <path d="M9 7V4h6v3" />
        </>
      );
    case "imagePlus":
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 14l2-2 3 3 1-1 2 2" />
          <path d="M17 7v5" />
          <path d="M14.5 9.5h5" />
        </>
      );
    case "download":
      return (
        <>
          <path d="M12 4v10" />
          <path d="M8 10l4 4 4-4" />
          <path d="M5 20h14" />
        </>
      );
    case "refresh":
      return (
        <>
          <path d="M20 12a8 8 0 0 1-13.7 5.7" />
          <path d="M4 12A8 8 0 0 1 17.7 6.3" />
          <path d="M17 3v4h-4" />
          <path d="M7 21v-4h4" />
        </>
      );
    case "expand":
      return (
        <>
          <path d="M8 4H4v4" />
          <path d="M4 4l6 6" />
          <path d="M16 4h4v4" />
          <path d="M20 4l-6 6" />
          <path d="M8 20H4v-4" />
          <path d="M4 20l6-6" />
          <path d="M16 20h4v-4" />
          <path d="M20 20l-6-6" />
        </>
      );
  }
}
