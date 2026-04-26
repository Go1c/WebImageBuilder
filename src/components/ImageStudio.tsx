"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import type { GenerationMode, ModelKey } from "@/server/domain/models";
import { readApiErrorDetail, readApiJson, type ApiErrorDetail } from "./apiErrors";
import { buildGenerationRequestPreview } from "./generationRequestPreview";
import { downloadGeneratedImage } from "./imageDownload";
import {
  buildPromptEnhancementMetadata,
  promptStylePresets,
  promptTypeChoices,
  type PromptEnhancementMetadata,
  type PromptStylePreset,
  type PromptStylePresetKey,
  type PromptTypeKey
} from "./promptEnhancers";
import { promptLibraryItems, type PromptLibraryItem } from "./promptLibrary";
import {
  buildLocalPortfolioItem,
  buildReferenceAssetDescriptor,
  getStudioActionStates,
  getZoomAction,
  upsertLocalPortfolioItem,
  type LocalPortfolioItem,
  type ReferenceAssetDescriptor,
  type StudioActionState
} from "./studioActions";
import { selectCanvasImage } from "./studioCanvas";
import { appendPromptToken } from "./studioPrompt";
import { tipFromActionFailure, tipFromApiError, type StudioTip } from "./studioTips";

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

type HistoryItem = {
  id: string;
  mode: string;
  modelKey: string;
  prompt: string;
  status: string;
  createdAt: string;
  assets: Array<{ url: string; type: string }>;
};

type GeneratedImage = {
  key: string;
  url: string;
  mimeType: string;
};

type HistoryThumb = {
  id: string;
  url: string;
  mimeType?: string;
  prompt?: string;
};

type SavedPortfolioItem = LocalPortfolioItem;

type HeaderPanel = "tutorials" | "invite" | null;

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
  | "check"
  | "trash"
  | "imagePlus"
  | "download"
  | "refresh"
  | "expand";

const generationTimeoutMs = 120_000;
const portfolioStorageKey = "lumio:portfolio";
const inviteCodeStorageKey = "lumio:invite-code";
const urlOnlyReferenceSupportNote =
  "Canvas reuse is sent as a URL reference asset; uploaded files remain the most reliable provider reference path.";

const typeChoiceIcons: Record<PromptTypeKey, StudioIconName> = {
  UI: "grid",
  UE: "cube",
  "立绘": "person",
  "3D": "layers",
  "二次元": "image",
  "写实": "aperture",
  "特效": "wand",
  "场景原画": "image"
};

const ratioOptions: Array<{ label: string; size: "1024x1024" | "1024x1536" | "1536x1024"; meta: string }> = [
  { label: "1:1", size: "1024x1024", meta: "1024 × 1024" },
  { label: "3:4", size: "1024x1536", meta: "1024 × 1536" },
  { label: "4:3", size: "1536x1024", meta: "1536 × 1024" },
  { label: "16:9", size: "1536x1024", meta: "1536 × 1024" },
  { label: "9:16", size: "1024x1536", meta: "1024 × 1536" }
];

const stylePresetGradients: Record<PromptStylePresetKey, string> = {
  cinematic: "linear-gradient(143deg, rgb(254, 230, 133) 0%, rgb(255, 184, 106) 100%)",
  cyberpunk: "linear-gradient(143deg, rgb(244, 168, 255) 0%, rgb(124, 134, 255) 100%)",
  "minimal-japanese": "linear-gradient(143deg, rgb(255, 228, 230) 0%, rgb(231, 229, 228) 100%)",
  "watercolor-illustration": "linear-gradient(143deg, rgb(184, 230, 254) 0%, rgb(164, 244, 207) 100%)",
  "studio-3d-render": "linear-gradient(143deg, rgb(196, 180, 255) 0%, rgb(253, 165, 213) 100%)",
  "black-and-white-film": "linear-gradient(143deg, rgb(212, 212, 212) 0%, rgb(115, 115, 115) 100%)"
};

const keywordTags = ["柔光", "高对比", "微距", "广角", "黄金时刻", "蒸汽朋克", "极简", "未来感", "怀旧", "童趣"];
const libraryTabs = ["热门", "人物", "场景", "风格", "我的"];

export function ImageStudio() {
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const libraryPanelRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<GenerationMode>("text-to-image");
  const [model] = useState<ModelKey>("gpt-image-2");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1024x1536" | "1536x1024">("1024x1024");
  const [ratioLabel, setRatioLabel] = useState("1:1");
  const [detailStrength, setDetailStrength] = useState(55);
  const [selectedTypes, setSelectedTypes] = useState<PromptTypeKey[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<PromptStylePresetKey | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [reusedReference, setReusedReference] = useState<ReferenceAssetDescriptor | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedInspirationImage, setSelectedInspirationImage] = useState<string | null>(null);
  const [canvasPrompt, setCanvasPrompt] = useState<string | null>(null);
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<SavedPortfolioItem[]>([]);
  const [activeLibraryTab, setActiveLibraryTab] = useState("热门");
  const [activeHeaderPanel, setActiveHeaderPanel] = useState<HeaderPanel>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [tip, setTip] = useState<StudioTip | null>(null);
  const [requestPreview, setRequestPreview] = useState<string | null>(null);
  const [currentInviteUrl, setCurrentInviteUrl] = useState<string | null>(null);

  const quality = detailStrength >= 72 ? "high" : "standard";
  const activeRatio = ratioOptions.find((option) => option.label === ratioLabel) || ratioOptions[0];
  const canvasImage = selectCanvasImage({ images, selectedInspirationImage });
  const promptEnhancement = useMemo(
    () => buildPromptMetadata(prompt),
    [detailStrength, negativePrompt, prompt, selectedStyle, selectedTypes]
  );
  const referenceCount = referenceFiles.length + (reusedReference ? 1 : 0);
  const visibleReferencePreviewUrl = referencePreviewUrl || reusedReference?.url || null;
  const submitMode: GenerationMode = referenceCount > 0 ? "image-to-image" : "text-to-image";
  const canRegenerate = Boolean(promptEnhancement.finalPrompt.trim() || (canvasPrompt || "").trim());
  const actionStates = getStudioActionStates({ image: canvasImage, canRegenerate, loading });
  const loginUrl = process.env.NEXT_PUBLIC_LUMIO_LOGIN_URL || "https://api.lumio.games/";

  const historyThumbs = useMemo(() => {
    const generatedThumbs: HistoryThumb[] = images.map((image, index) => ({
      id: `generated-${image.key || index}`,
      url: image.url,
      mimeType: image.mimeType,
      prompt: canvasPrompt || undefined
    }));
    const persistedThumbs: HistoryThumb[] = history.flatMap((item) =>
      (item.assets || [])
        .filter((asset) => asset.type === "result")
        .map((asset, index) => ({
          id: `${item.id}-${index}`,
          url: asset.url,
          prompt: item.prompt
        }))
    );

    return [...generatedThumbs, ...persistedThumbs].slice(0, 4);
  }, [canvasPrompt, history, images]);

  const quotaText = useMemo(() => {
    if (!quota) {
      return "128 次";
    }

    return `${quota.quota.remaining} 次`;
  }, [quota]);

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
  }, [activeLibraryTab, librarySearch]);

  useEffect(() => {
    void (async () => {
      await claimInviteFromUrl();
      await refreshData();
    })();
  }, []);

  useEffect(() => {
    setSavedPortfolioItems(readSavedPortfolioItems());
  }, []);

  useEffect(() => {
    setCurrentInviteUrl(buildInviteUrl(quota?.actorType === "user"));
  }, [quota?.actorType]);

  useEffect(() => {
    if (!referenceFiles[0]) {
      setReferencePreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(referenceFiles[0]);
    setReferencePreviewUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
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

  async function refreshData() {
    const [quotaResponse, historyResponse] = await Promise.allSettled([
      fetch("/api/quota", { cache: "no-store" }),
      fetch("/api/history", { cache: "no-store" })
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

    if (loadFailureTip) {
      showTip(loadFailureTip);
    }
  }

  async function claimInviteFromUrl() {
    const inviteCode = new URLSearchParams(window.location.search).get("invite");
    if (!inviteCode) {
      return;
    }

    try {
      const response = await fetch("/api/invite/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode })
      });

      if (!response.ok) {
        showTip(tipFromApiError(await readApiErrorDetail(response)));
      }
    } catch (error) {
      showTip(tipFromActionFailure({ kind: "failed", action: "领取邀请奖励", error }));
    }
  }

  async function uploadAsset(file: File, assetType: "reference" | "mask"): Promise<AssetRef> {
    const presignResponse = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mimeType: file.type, assetType })
    });

    if (!presignResponse.ok) {
      throw new StudioApiResponseError(await readApiErrorDetail(presignResponse));
    }

    const presign = (await presignResponse.json()) as AssetRef & { uploadUrl: string };
    const uploadResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error("参考图上传失败");
    }

    return {
      key: presign.key,
      url: presign.url,
      mimeType: file.type
    };
  }

  function toAssetRef(reference: ReferenceAssetDescriptor): AssetRef {
    return {
      key: reference.key,
      url: reference.url,
      mimeType: reference.mimeType
    };
  }

  async function handleGenerate(options: { promptOverride?: string } = {}) {
    if (loading) {
      showDisabledTip("生成图片", "当前生成还未完成，请稍后再试。");
      return;
    }

    const metadata = buildPromptMetadata(options.promptOverride ?? prompt);
    const submissionPrompt = buildSubmissionPrompt(metadata);

    if (!submissionPrompt) {
      showDisabledTip("生成图片", "请先输入提示词，或选择可作为提示词的风格预设。");
      return;
    }

    setLoading(true);
    setTip(null);
    setRequestPreview(buildRequestPreview(metadata));
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), generationTimeoutMs);

    try {
      const uploadedReferences = referenceFiles.length
        ? await Promise.all(Array.from(referenceFiles || []).map((file) => uploadAsset(file, "reference")))
        : [];
      const references = reusedReference
        ? [toAssetRef(reusedReference), ...uploadedReferences]
        : uploadedReferences;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: submissionPrompt,
          mode: submitMode,
          model,
          size,
          quality,
          count: 1,
          referenceAssets: references
        })
      });

      if (!response.ok) {
        throw new StudioApiResponseError(await readApiErrorDetail(response));
      }

      const result = await readApiJson<{
        images: GeneratedImage[];
        quota: QuotaResponse["quota"];
        prompt?: string;
      }>(response, "生成接口返回了非 JSON 响应，请刷新页面后重试");

      setImages(result.images);
      setSelectedInspirationImage(null);
      setCanvasPrompt(result.prompt || submissionPrompt);
      setQuota((current) => (current ? { ...current, quota: result.quota } : current));
      setReusedReference(null);
      showTip({
        type: "success",
        title: "生成完成",
        message: "结果已更新到画布。"
      });
      await refreshData();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        showTip({
          type: "error",
          title: "生成超时",
          message: "生成请求超过 120 秒未完成，请稍后重试。"
        });
      } else if (error instanceof StudioApiResponseError) {
        showTip(tipFromApiError(error.detail));
      } else {
        showTip(tipFromActionFailure({ kind: "failed", action: "生成图片", error }));
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  function buildPromptMetadata(userPrompt: string): PromptEnhancementMetadata {
    const promptWithDetail = detailStrength >= 72 && userPrompt.trim()
      ? appendPromptToken(userPrompt, "细节锐利")
      : userPrompt;

    return buildPromptEnhancementMetadata({
      userPrompt: promptWithDetail,
      selectedTypes,
      selectedStyle,
      negativePrompt
    });
  }

  function buildRequestPreview(metadata: PromptEnhancementMetadata): string {
    return buildGenerationRequestPreview({
      prompt: buildSubmissionPrompt(metadata),
      rawPrompt: metadata.rawPrompt,
      finalPrompt: metadata.finalPrompt,
      selectedTypes: metadata.selectedTypes,
      selectedStyle: metadata.selectedStyle,
      negativePrompt: metadata.negativePrompt,
      providerSupportNotes: [
        ...metadata.providerSupportNotes,
        ...(reusedReference ? [urlOnlyReferenceSupportNote] : [])
      ],
      model,
      mode: submitMode,
      size,
      quality,
      count: 1,
      referenceCount,
      hasMask: false
    });
  }

  function buildSubmissionPrompt(metadata: PromptEnhancementMetadata): string {
    const finalPrompt = metadata.finalPrompt.trim();

    if (!metadata.negativePrompt) {
      return finalPrompt;
    }

    return `${finalPrompt}\n避免：${metadata.negativePrompt}`;
  }

  function handleReferenceChange(files: FileList | null) {
    const nextFiles = Array.from(files || []);

    if (!nextFiles.length) {
      return;
    }

    setReferenceFiles(nextFiles);
    setReusedReference(null);
    setMode("image-to-image");
    showTip({
      type: "success",
      title: "参考图已添加",
      message: `已选择 ${nextFiles.length} 张参考图，生成时会作为文件上传。`
    });
  }

  function handleReferenceInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleReferenceChange(event.currentTarget.files);
    event.currentTarget.value = "";
  }

  function handleRatioChange(option: (typeof ratioOptions)[number]) {
    setRatioLabel(option.label);
    setSize(option.size);
  }

  function handleToggleType(typeKey: PromptTypeKey) {
    setSelectedTypes((currentTypes) =>
      currentTypes.includes(typeKey)
        ? currentTypes.filter((currentType) => currentType !== typeKey)
        : [...currentTypes, typeKey]
    );
  }

  function handleApplyStyle(preset: PromptStylePreset) {
    const willSelect = selectedStyle !== preset.key;
    setSelectedStyle(willSelect ? preset.key : null);
    showTip({
      type: "info",
      title: willSelect ? "风格已应用" : "风格已取消",
      message: willSelect
        ? `${preset.label} 会追加到最终提示词，原始输入会保留。`
        : `${preset.label} 已从最终提示词中移除。`
    });
  }

  function handleApplyTag(tag: string) {
    setPrompt((current) => appendPromptToken(current, tag));
  }

  function handleApplyPromptLibraryItem(item: PromptLibraryItem) {
    setPrompt(item.prompt);
    setImages([]);
    setSelectedInspirationImage(item.image);
    setCanvasPrompt(null);
    setRequestPreview(null);
    showTip({
      type: "success",
      title: "提示词已套用",
      message: item.title
    });
  }

  function handleApplySavedPortfolioItem(item: SavedPortfolioItem) {
    setPrompt(item.prompt);
    setImages([]);
    setSelectedInspirationImage(item.url);
    setCanvasPrompt(item.prompt || null);
    setRequestPreview(null);
    showTip({
      type: "info",
      title: "已打开作品",
      message: item.prompt || "作品已显示在画布中。"
    });
  }

  function handleHistoryThumbClick(thumb: HistoryThumb) {
    setSelectedInspirationImage(thumb.url);
    setImages([]);
    setCanvasPrompt(thumb.prompt || null);
  }

  function handleOpenExplore() {
    setActiveHeaderPanel(null);
    setActiveLibraryTab("热门");
    scrollLibraryIntoView();
    showTip({
      type: "info",
      title: "探索已打开",
      message: "素材库已切换到热门灵感。"
    });
  }

  function handleOpenPortfolio() {
    setActiveHeaderPanel(null);
    setActiveLibraryTab("我的");
    scrollLibraryIntoView();
    showTip({
      type: "info",
      title: "作品集已打开",
      message: savedPortfolioItems.length
        ? `本地作品集当前有 ${savedPortfolioItems.length} 个项目。`
        : "本地作品集暂无项目，保存当前画布后会显示在这里。"
    });
  }

  function handleOpenInvitePanel() {
    setActiveHeaderPanel("invite");
    showTip({
      type: "info",
      title: "邀请有礼",
      message: quota?.actorType === "user"
        ? "邀请面板已打开，可查看奖励规则和邀请链接。"
        : "邀请奖励需要登录后绑定账号。"
    });
  }

  function handleLoginClick() {
    showTip({
      type: "info",
      title: "正在打开登录",
      message: "Lumio 登录会在新窗口打开；登录后的 return-token 需要由外部登录服务回传。"
    });
  }

  async function handleCopyInviteUrl() {
    if (!currentInviteUrl) {
      showTip(tipFromActionFailure({
        kind: "login_required",
        action: "复制邀请链接",
        actionHref: loginUrl
      }));
      return;
    }

    try {
      await navigator.clipboard.writeText(currentInviteUrl);
      showTip({
        type: "success",
        title: "邀请链接已复制",
        message: "可以发送给好友领取邀请奖励。"
      });
    } catch (error) {
      showTip(tipFromActionFailure({ kind: "failed", action: "复制邀请链接", error }));
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

    setImages([]);
    setSelectedInspirationImage(null);
    setCanvasPrompt(null);
    setRequestPreview(null);
    showTip({
      type: "success",
      title: "已删除当前图片",
      message: "画布已清空。"
    });
  }

  function handleSaveToPortfolio() {
    if (!ensureActionEnabled("保存到作品集", actionStates.save) || !canvasImage) {
      return;
    }

    try {
      const existingItems = readSavedPortfolioItems();
      const savedItem = buildLocalPortfolioItem({
        image: canvasImage,
        prompt: canvasPrompt || promptEnhancement.rawPrompt,
        savedAt: new Date().toISOString()
      });

      const nextItems = upsertLocalPortfolioItem(existingItems, savedItem);
      window.localStorage.setItem(portfolioStorageKey, JSON.stringify(nextItems));
      setSavedPortfolioItems(nextItems);
      setActiveLibraryTab("我的");
      showTip({
        type: "success",
        title: "已保存到作品集",
        message: "可在素材库的“我的”标签查看。"
      });
    } catch (error) {
      showTip(tipFromActionFailure({ kind: "failed", action: "保存到作品集", error }));
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

    setReferenceFiles([]);
    setReusedReference(result.reference);
    setSelectedInspirationImage(result.reference.url);
    setMode("image-to-image");
    showTip({
      type: "info",
      title: "已设为参考图",
      message: "当前画布图片会作为 URL 参考图随下一次生成请求发送。"
    });
  }

  async function handleDownloadCurrentImage() {
    if (!ensureActionEnabled("下载图片", actionStates.download) || !canvasImage) {
      return;
    }

    try {
      await downloadGeneratedImage(
        {
          url: canvasImage.url,
          mimeType: canvasImage.mimeType
        },
        0
      );
      showTip({
        type: "success",
        title: "下载已开始",
        message: "浏览器正在保存当前图片。"
      });
    } catch (error) {
      showTip(tipFromActionFailure({ kind: "failed", action: "下载图片", error }));
    }
  }

  function handleOpenCurrentImage() {
    if (!ensureActionEnabled("打开大图", actionStates.zoom)) {
      return;
    }

    const zoomAction = getZoomAction({ image: canvasImage });

    if (!zoomAction.enabled) {
      showDisabledTip("打开大图", zoomAction.reason);
      return;
    }

    const openedWindow = window.open(zoomAction.url, "_blank", "noopener,noreferrer");

    if (!openedWindow) {
      showTip({
        type: "warning",
        title: "未能打开大图",
        message: "浏览器可能拦截了新窗口，请允许弹窗后重试。"
      });
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
      <header className="studio-topbar">
        <a className="studio-brand" href="/" aria-label="LumioImageStudio">
          <span className="studio-brand-mark">
            <StudioIcon name="sparkle" size={16} />
          </span>
          <span>LumioImageStudio</span>
        </a>

        <nav className="studio-nav" aria-label="主导航">
          <button
            className={activeLibraryTab === "热门" && !activeHeaderPanel ? "is-selected" : ""}
            type="button"
            onClick={handleOpenExplore}
          >
            探索
          </button>
          <button
            className={activeLibraryTab === "我的" && !activeHeaderPanel ? "is-selected" : ""}
            type="button"
            onClick={handleOpenPortfolio}
          >
            作品集
          </button>
          <button
            className={activeHeaderPanel === "tutorials" ? "is-selected" : ""}
            type="button"
            onClick={() => setActiveHeaderPanel("tutorials")}
          >
            教程
          </button>
        </nav>

        <div className="studio-account">
          <span className="quota-pill">
            <StudioIcon name="coin" size={14} />
            {quotaText}
          </span>
          <button className="invite-pill" type="button" onClick={handleOpenInvitePanel}>
            <StudioIcon name="gift" size={14} />
            邀请有礼
          </button>
          <a
            className="login-pill"
            href={loginUrl}
            target="_blank"
            rel="noreferrer"
            onClick={handleLoginClick}
          >
            登录
          </a>
        </div>
      </header>

      {activeHeaderPanel ? (
        <HeaderContextPanel
          panel={activeHeaderPanel}
          inviteUrl={currentInviteUrl}
          loginUrl={loginUrl}
          quota={quota}
          onClose={() => setActiveHeaderPanel(null)}
          onCopyInviteUrl={() => void handleCopyInviteUrl()}
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
                  <div className={visibleReferencePreviewUrl ? "reference-row has-reference" : "reference-row"}>
                    {visibleReferencePreviewUrl ? (
                      <div className="reference-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={visibleReferencePreviewUrl} alt="参考图" />
                      </div>
                    ) : null}
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

            <section className="studio-section type-section">
              <SectionLabel>类型</SectionLabel>
              <div className="type-grid" role="group" aria-label="选择类型">
                {promptTypeChoices.map((item) => {
                  const isSelected = selectedTypes.includes(item.key);
                  return (
                  <button
                    key={item.key}
                    className={isSelected ? "option-tile is-selected" : "option-tile"}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleToggleType(item.key)}
                  >
                    <StudioIcon name={typeChoiceIcons[item.key]} size={14} />
                    <span>{item.label}</span>
                  </button>
                  );
                })}
              </div>
            </section>

            <section className="studio-section ratio-section">
              <SectionLabel>画幅比例</SectionLabel>
              <div className="ratio-grid" role="group" aria-label="选择画幅比例">
                {ratioOptions.map((option) => (
                  <button
                    key={option.label}
                    className={ratioLabel === option.label ? "ratio-button is-selected" : "ratio-button"}
                    type="button"
                    onClick={() => handleRatioChange(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
                  Lumio v2.1
                </span>
                <span>{activeRatio.meta}</span>
                <span className="meta-dot">·</span>
                <span>{loading ? `${loadingSeconds || 1}.0s` : "6.2s"}</span>
                <span className="meta-dot">·</span>
                <span>{loading ? "生成中" : "刚刚"}</span>
              </div>
              {canvasPrompt ? <p>{canvasPrompt}</p> : null}
            </div>
            <button type="button" className="icon-button ghost" onClick={() => void handleCopyRequestPreview()} aria-label="复制提示词">
              <StudioIcon name="copy" size={16} />
            </button>
          </div>

          <div className="image-stage">
            <div className={canvasImage ? "main-image-frame" : "main-image-frame is-empty"}>
              {canvasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={canvasImage.url} alt="生成预览" />
              ) : (
                <span>生成预览</span>
              )}
              {loading ? <div className="image-loading">生成中 {loadingSeconds}s</div> : null}
            </div>
          </div>

          <div className="canvas-actions">
            <button
              className={actionStates.save.enabled ? "save-button" : "save-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.save.enabled}
              title={actionStates.save.reason}
              onClick={handleSaveToPortfolio}
            >
              <StudioIcon name="check" size={14} />
              保存到作品集
            </button>
            <button
              className={actionStates.delete.enabled ? "icon-button" : "icon-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.delete.enabled}
              title={actionStates.delete.reason}
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
              title={actionStates.referenceReuse.reason}
              onClick={handleUseCurrentAsReference}
              aria-label="用作参考图"
            >
              <StudioIcon name="imagePlus" size={16} />
            </button>
            <button
              className={actionStates.download.enabled ? "icon-button" : "icon-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.download.enabled}
              title={actionStates.download.reason}
              onClick={() => void handleDownloadCurrentImage()}
              aria-label="下载图片"
            >
              <StudioIcon name="download" size={16} />
            </button>
            <button
              className={actionStates.regenerate.enabled ? "icon-button" : "icon-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.regenerate.enabled}
              title={actionStates.regenerate.reason}
              onClick={handleRegenerate}
              aria-label="重新生成"
            >
              <StudioIcon name="refresh" size={16} />
            </button>
            <button
              className={actionStates.zoom.enabled ? "icon-button" : "icon-button is-disabled"}
              type="button"
              aria-disabled={!actionStates.zoom.enabled}
              title={actionStates.zoom.reason}
              onClick={handleOpenCurrentImage}
              aria-label="打开大图"
            >
              <StudioIcon name="expand" size={16} />
            </button>
          </div>

          <div className="canvas-history">
            <span>历史：</span>
            {historyThumbs.map((thumb, index) => (
              <button
                key={thumb.id}
                className={index === 0 ? "history-thumb is-active" : "history-thumb"}
                type="button"
                onClick={() => handleHistoryThumbClick(thumb)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb.url} alt="" />
                {index === 0 ? (
                  <span className="thumb-check">
                    <StudioIcon name="check" size={8} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <aside className="library-panel" aria-label="素材库" ref={libraryPanelRef}>
          <PanelHeader title="素材库" subtitle="点击直接套用提示词" />

          <div className="library-controls">
            <label className="library-search">
              <StudioIcon name="search" size={14} />
              <input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="搜索灵感"
              />
            </label>

            <div className="library-tabs" role="tablist" aria-label="素材分类">
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
            <section className="studio-section library-section">
              <p className="library-title">风格预设</p>
              <div className="preset-grid">
                {promptStylePresets.map((preset) => (
                  <button
                    key={preset.key}
                    className={selectedStyle === preset.key ? "preset-card is-selected" : "preset-card"}
                    type="button"
                    aria-pressed={selectedStyle === preset.key}
                    style={{ "--preset-gradient": stylePresetGradients[preset.key] } as CSSProperties}
                    onClick={() => handleApplyStyle(preset)}
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {activeLibraryTab === "我的" ? (
              <section className="studio-section library-section">
                <div className="library-title-row">
                  <p className="library-title">我的作品</p>
                  <span>{savedPortfolioItems.length}</span>
                </div>
                {savedPortfolioItems.length ? (
                  <div className="prompt-library-grid">
                    {savedPortfolioItems.map((item) => (
                      <button
                        key={item.id}
                        className="prompt-library-card"
                        type="button"
                        onClick={() => handleApplySavedPortfolioItem(item)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt="" loading="lazy" decoding="async" />
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
                    {filteredPromptLibraryItems.map((item) => (
                      <button
                        key={item.id}
                        className="prompt-library-card"
                        type="button"
                        onClick={() => handleApplyPromptLibraryItem(item)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
                        <span className="prompt-library-title">{item.title}</span>
                        <span className="prompt-library-meta">#{item.caseNumber} · {item.category}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="library-empty">没有匹配的素材</p>
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

      {tip ? <StudioTipToast tip={tip} /> : null}
    </main>
  );
}

function readSavedPortfolioItems(): SavedPortfolioItem[] {
  try {
    const rawItems = window.localStorage.getItem(portfolioStorageKey);
    const parsedItems = rawItems ? (JSON.parse(rawItems) as SavedPortfolioItem[]) : [];
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return [];
  }
}

function buildInviteUrl(isLoggedIn: boolean): string | null {
  if (!isLoggedIn) {
    return null;
  }

  const inviteCode = readOrCreateLocalInviteCode();
  return `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(inviteCode)}`;
}

function readOrCreateLocalInviteCode(): string {
  try {
    const existingCode = window.localStorage.getItem(inviteCodeStorageKey);

    if (existingCode) {
      return existingCode;
    }

    const nextCode = `local-${randomInviteCodeSegment()}`;
    window.localStorage.setItem(inviteCodeStorageKey, nextCode);
    return nextCode;
  } catch {
    return `local-${randomInviteCodeSegment()}`;
  }
}

function randomInviteCodeSegment(): string {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID().slice(0, 12);
  }

  return Math.random().toString(36).slice(2, 14);
}

function HeaderContextPanel({
  panel,
  inviteUrl,
  loginUrl,
  quota,
  onClose,
  onCopyInviteUrl
}: {
  panel: Exclude<HeaderPanel, null>;
  inviteUrl: string | null;
  loginUrl: string;
  quota: QuotaResponse | null;
  onClose: () => void;
  onCopyInviteUrl: () => void;
}) {
  return (
    <section className="header-context-panel" aria-live="polite">
      <div>
        {panel === "tutorials" ? (
          <>
            <p className="context-eyebrow">教程</p>
            <h2>快速生成流程</h2>
            <ol>
              <li>写下主体、场景、用途和画幅。</li>
              <li>选择一个或多个类型，再按需要选择风格预设。</li>
              <li>上传本地参考图可进入图生图；画布图片复用会作为视觉参考显示。</li>
              <li>生成后可保存到作品集、下载、打开大图或重新生成。</li>
            </ol>
          </>
        ) : (
          <>
            <p className="context-eyebrow">邀请有礼</p>
            <h2>邀请好友领取生成额度</h2>
            <p>
              邀请奖励规则：好友通过你的链接完成注册并完成首次成功生成后，邀请人获得 10 次邀请额度。
            </p>
            <p>
              当前状态：{quota?.actorType === "user" ? "已登录，可绑定邀请奖励。" : "未登录，需先登录后才能绑定邀请奖励。"}
            </p>
            <div className="invite-copy-row">
              <code>{inviteUrl || "登录后可生成可复制的邀请链接"}</code>
              <button type="button" onClick={onCopyInviteUrl}>复制</button>
            </div>
            {quota?.actorType !== "user" ? (
              <a className="context-login-link" href={loginUrl} target="_blank" rel="noreferrer">
                去登录
              </a>
            ) : null}
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
