"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { GenerationMode, ModelKey } from "@/server/domain/models";
import { readApiError, readApiJson } from "./apiErrors";
import { buildGenerationRequestPreview } from "./generationRequestPreview";
import { downloadGeneratedImage } from "./imageDownload";
import { appendPromptToken, buildPromptFromLibraryItem } from "./studioPrompt";

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

const fallbackPrompt = "柔和晨光下的山间湖泊，极简构图，电影感";
const sampleMainImage = "/figma-assets/canvas-main.jpg";
const sampleHistoryImage = "/figma-assets/canvas-history.jpg";
const sampleReferenceImage = "/figma-assets/prompt-reference.jpg";

const artTypes: Array<{ label: string; icon: StudioIconName }> = [
  { label: "UI", icon: "grid" },
  { label: "UE", icon: "cube" },
  { label: "立绘", icon: "person" },
  { label: "3D", icon: "layers" },
  { label: "二次元", icon: "image" },
  { label: "写实", icon: "aperture" },
  { label: "特效", icon: "wand" },
  { label: "场景原画", icon: "image" }
];

const ratioOptions: Array<{ label: string; size: "1024x1024" | "1024x1536" | "1536x1024"; meta: string }> = [
  { label: "1:1", size: "1024x1024", meta: "1024 × 1024" },
  { label: "3:4", size: "1024x1536", meta: "1024 × 1536" },
  { label: "4:3", size: "1536x1024", meta: "1536 × 1024" },
  { label: "16:9", size: "1536x1024", meta: "1536 × 1024" },
  { label: "9:16", size: "1024x1536", meta: "1024 × 1536" }
];

const stylePresets = [
  {
    label: "电影感",
    prompt: "电影感光线，柔和晨光，山间湖泊，极简构图",
    gradient: "linear-gradient(143deg, rgb(254, 230, 133) 0%, rgb(255, 184, 106) 100%)"
  },
  {
    label: "赛博朋克",
    prompt: "赛博朋克霓虹街道，高对比光影，未来城市",
    gradient: "linear-gradient(143deg, rgb(244, 168, 255) 0%, rgb(124, 134, 255) 100%)"
  },
  {
    label: "极简日系",
    prompt: "极简日系构图，柔和色彩，留白，安静氛围",
    gradient: "linear-gradient(143deg, rgb(255, 228, 230) 0%, rgb(231, 229, 228) 100%)"
  },
  {
    label: "水彩插画",
    prompt: "水彩插画质感，清透颜色，纸张纹理",
    gradient: "linear-gradient(143deg, rgb(184, 230, 254) 0%, rgb(164, 244, 207) 100%)"
  },
  {
    label: "3D 渲染",
    prompt: "3D 渲染，精致材质，柔和棚拍光",
    gradient: "linear-gradient(143deg, rgb(196, 180, 255) 0%, rgb(253, 165, 213) 100%)"
  },
  {
    label: "黑白胶片",
    prompt: "黑白胶片，高级灰阶，颗粒质感，强烈构图",
    gradient: "linear-gradient(143deg, rgb(212, 212, 212) 0%, rgb(115, 115, 115) 100%)"
  }
];

const communityItems = [
  { src: "/figma-assets/community-1.jpg", prompt: "暗调电影感人像，柔和逆光，细腻肤色" },
  { src: "/figma-assets/community-2.jpg", prompt: "梦幻霓虹抽象背景，渐变光影，高饱和色彩" },
  { src: "/figma-assets/community-3.jpg", prompt: "写实游戏场景，清晨雾气，开阔构图" },
  { src: "/figma-assets/community-4.jpg", prompt: "潮流角色立绘，精致服装，干净背景" },
  { src: "/figma-assets/community-5.jpg", prompt: "产品级 3D 图标，柔和反射，简洁构图" },
  { src: "/figma-assets/community-6.jpg", prompt: "高质感概念艺术，戏剧化光线，丰富层次" }
];

const keywordTags = ["柔光", "高对比", "微距", "广角", "黄金时刻", "蒸汽朋克", "极简", "未来感", "怀旧", "童趣"];
const libraryTabs = ["热门", "人物", "场景", "风格", "我的"];

export function ImageStudio() {
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<GenerationMode>("text-to-image");
  const [model] = useState<ModelKey>("gpt-image-2");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1024x1536" | "1536x1024">("1024x1024");
  const [ratioLabel, setRatioLabel] = useState("1:1");
  const [detailStrength, setDetailStrength] = useState(55);
  const [artType, setArtType] = useState("写实");
  const [referenceFiles, setReferenceFiles] = useState<FileList | null>(null);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedInspirationImage, setSelectedInspirationImage] = useState<string | null>(null);
  const [activeLibraryTab, setActiveLibraryTab] = useState("热门");
  const [librarySearch, setLibrarySearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [requestPreview, setRequestPreview] = useState<string | null>(null);

  const quality = detailStrength >= 72 ? "high" : "standard";
  const activeRatio = ratioOptions.find((option) => option.label === ratioLabel) || ratioOptions[0];
  const mainImage = images[0]?.url || selectedInspirationImage || sampleMainImage;
  const mainImageMimeType = images[0]?.mimeType || "image/jpeg";
  const generatedPrompt = prompt.trim() || fallbackPrompt;
  const referenceCount = referenceFiles?.length || 0;
  const submitMode: GenerationMode = referenceCount > 0 ? mode : "text-to-image";

  const historyThumbs = useMemo(() => {
    const generatedThumbs = images.map((image) => image.url);
    const persistedThumbs = history.flatMap((item) =>
      (item.assets || []).filter((asset) => asset.type === "result").map((asset) => asset.url)
    );

    return [...generatedThumbs, ...persistedThumbs, sampleMainImage, sampleHistoryImage].slice(0, 4);
  }, [history, images]);

  const quotaText = useMemo(() => {
    if (!quota) {
      return "128 次";
    }

    return `${quota.quota.remaining} 次`;
  }, [quota]);

  const filteredCommunityItems = useMemo(() => {
    const query = librarySearch.trim();

    if (!query) {
      return communityItems;
    }

    return communityItems.filter((item) => item.prompt.includes(query));
  }, [librarySearch]);

  useEffect(() => {
    void (async () => {
      await claimInviteFromUrl();
      await refreshData();
    })();
  }, []);

  useEffect(() => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = 169;
    }
  }, []);

  useEffect(() => {
    if (!referenceFiles?.[0]) {
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

    if (quotaResponse.status === "fulfilled" && quotaResponse.value.ok) {
      setQuota((await quotaResponse.value.json()) as QuotaResponse);
    }

    if (historyResponse.status === "fulfilled" && historyResponse.value.ok) {
      const body = (await historyResponse.value.json()) as { history: HistoryItem[] };
      setHistory(body.history || []);
    }
  }

  async function claimInviteFromUrl() {
    const inviteCode = new URLSearchParams(window.location.search).get("invite");
    if (!inviteCode) {
      return;
    }

    await fetch("/api/invite/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode })
    });
  }

  async function uploadAsset(file: File, assetType: "reference" | "mask"): Promise<AssetRef> {
    const presignResponse = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mimeType: file.type, assetType })
    });

    if (!presignResponse.ok) {
      throw new Error(await readApiError(presignResponse));
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

  async function handleGenerate() {
    const submissionPrompt = buildSubmissionPrompt();

    if (!prompt.trim()) {
      setMessage("请先输入提示词");
      return;
    }

    setLoading(true);
    setMessage(null);
    setRequestPreview(
      buildGenerationRequestPreview({
        prompt: submissionPrompt,
        model,
        mode: submitMode,
        size,
        quality,
        count: 1,
        referenceCount,
        hasMask: false
      })
    );
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), generationTimeoutMs);

    try {
      const references = referenceCount > 0
        ? await Promise.all(Array.from(referenceFiles || []).map((file) => uploadAsset(file, "reference")))
        : [];

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
        throw new Error(await readApiError(response));
      }

      const result = await readApiJson<{
        images: GeneratedImage[];
        quota: QuotaResponse["quota"];
      }>(response, "生成接口返回了非 JSON 响应，请刷新页面后重试");

      setImages(result.images);
      setSelectedInspirationImage(null);
      setQuota((current) => (current ? { ...current, quota: result.quota } : current));
      setMessage("生成完成");
      await refreshData();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage("生成超时，请稍后重试");
      } else {
        setMessage(error instanceof Error ? error.message : "生成失败");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  function buildSubmissionPrompt() {
    let nextPrompt = appendPromptToken(prompt, artType);

    if (detailStrength >= 72) {
      nextPrompt = appendPromptToken(nextPrompt, "细节锐利");
    }

    if (negativePrompt.trim()) {
      nextPrompt = `${nextPrompt}\n避免：${negativePrompt.trim()}`;
    }

    return nextPrompt;
  }

  function handleReferenceChange(files: FileList | null) {
    setReferenceFiles(files);
    setMode(files?.length ? "image-to-image" : "text-to-image");
  }

  function handleRatioChange(option: (typeof ratioOptions)[number]) {
    setRatioLabel(option.label);
    setSize(option.size);
  }

  function handleApplyStyle(label: string, stylePrompt: string) {
    setPrompt(buildPromptFromLibraryItem(prompt, stylePrompt || label));
    setMessage(`${label} 已套用`);
  }

  function handleApplyTag(tag: string) {
    setPrompt((current) => appendPromptToken(current, tag));
  }

  function handleApplyCommunity(item: (typeof communityItems)[number]) {
    setSelectedInspirationImage(item.src);
    setPrompt(buildPromptFromLibraryItem(prompt, item.prompt));
    setMessage("灵感已套用");
  }

  function handleHistoryThumbClick(url: string) {
    setSelectedInspirationImage(url);
    setImages([]);
  }

  async function handleDownloadCurrentImage() {
    try {
      await downloadGeneratedImage(
        {
          url: mainImage,
          mimeType: mainImageMimeType
        },
        0
      );
      setMessage("图片已开始保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存图片失败");
    }
  }

  async function handleCopyRequestPreview() {
    const text = requestPreview || buildSubmissionPrompt();

    if (!text.trim()) {
      setMessage("暂无可复制内容");
      return;
    }

    await navigator.clipboard.writeText(text);
    setMessage("已复制");
  }

  return (
    <main className={isExpanded ? "studio-app is-expanded" : "studio-app"}>
      <header className="studio-topbar">
        <a className="studio-brand" href="/" aria-label="LumioImageStudio">
          <span className="studio-brand-mark">
            <StudioIcon name="sparkle" size={16} />
          </span>
          <span>LumioImageStudio</span>
        </a>

        <nav className="studio-nav" aria-label="主导航">
          <a href="#explore">探索</a>
          <a href="#portfolio">作品集</a>
          <a href="#tutorials">教程</a>
        </nav>

        <div className="studio-account">
          <span className="quota-pill">
            <StudioIcon name="coin" size={14} />
            {quotaText}
          </span>
          <a className="invite-pill" href="#invite">
            <StudioIcon name="gift" size={14} />
            邀请有礼
          </a>
          <a
            className="login-pill"
            href={process.env.NEXT_PUBLIC_LUMIO_LOGIN_URL || "https://api.lumio.games/"}
            target="_blank"
            rel="noreferrer"
          >
            登录
          </a>
        </div>
      </header>

      <div className="studio-grid">
        <section className="prompt-panel" aria-label="创作面板">
          <PanelHeader title="创作面板" subtitle="用对话生成你想要的画面" />

          <div className="panel-scroll left-panel-scroll" ref={leftPanelRef}>
            <section className="studio-section prompt-section">
              <SectionLabel>提示词</SectionLabel>
              <div className="prompt-card">
                <div className="reference-row">
                  <div className="reference-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={referencePreviewUrl || sampleReferenceImage} alt="" />
                  </div>
                  <label className="reference-add">
                    <StudioIcon name="plus" size={16} />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(event) => handleReferenceChange(event.target.files)}
                    />
                  </label>
                </div>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="描述你想要的画面，例如：一只在赛博朋克霓虹街道上漫步的白猫，电影感光线"
                />
                <button className="generate-fab" type="button" disabled={loading} onClick={() => void handleGenerate()} aria-label="生成图片">
                  <StudioIcon name="arrowUp" size={16} />
                </button>
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
              <div className="section-label-row">
                <SectionLabel>类型</SectionLabel>
                <span>游戏美术方向</span>
              </div>
              <div className="type-grid" role="group" aria-label="选择类型">
                {artTypes.map((item) => (
                  <button
                    key={item.label}
                    className={artType === item.label ? "option-tile is-selected" : "option-tile"}
                    type="button"
                    onClick={() => setArtType(item.label)}
                  >
                    <StudioIcon name={item.icon} size={14} />
                    <span>{item.label}</span>
                  </button>
                ))}
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
              <p>{generatedPrompt}</p>
            </div>
            <button type="button" className="icon-button ghost" onClick={() => void handleCopyRequestPreview()} aria-label="复制提示词">
              <StudioIcon name="copy" size={16} />
            </button>
          </div>

          <div className="image-stage">
            <div className="main-image-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mainImage} alt="生成预览" />
              {loading ? <div className="image-loading">生成中 {loadingSeconds}s</div> : null}
            </div>
          </div>

          <div className="canvas-actions">
            <button className="save-button" type="button" onClick={() => setMessage("已保存到作品集")}>
              <StudioIcon name="check" size={14} />
              保存到作品集
            </button>
            <button className="icon-button" type="button" onClick={() => setImages([])} aria-label="删除当前图片">
              <StudioIcon name="trash" size={16} />
            </button>
            <span className="action-divider" />
            <label className="icon-button upload-action" aria-label="添加参考图">
              <StudioIcon name="imagePlus" size={16} />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => handleReferenceChange(event.target.files)}
              />
            </label>
            <button className="icon-button" type="button" onClick={() => void handleDownloadCurrentImage()} aria-label="下载图片">
              <StudioIcon name="download" size={16} />
            </button>
            <button className="icon-button" type="button" onClick={() => void handleGenerate()} disabled={loading} aria-label="重新生成">
              <StudioIcon name="refresh" size={16} />
            </button>
            <button className="icon-button" type="button" onClick={() => setIsExpanded((current) => !current)} aria-label="切换全屏预览">
              <StudioIcon name="expand" size={16} />
            </button>
          </div>

          <div className="canvas-history">
            <span>历史：</span>
            {historyThumbs.map((thumb, index) => (
              <button
                key={`${thumb}-${index}`}
                className={index === 0 ? "history-thumb is-active" : "history-thumb"}
                type="button"
                onClick={() => handleHistoryThumbClick(thumb)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb} alt="" />
                {index === 0 ? (
                  <span className="thumb-check">
                    <StudioIcon name="check" size={8} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <aside className="library-panel" aria-label="素材库">
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
                {stylePresets.map((preset) => (
                  <button
                    key={preset.label}
                    className="preset-card"
                    type="button"
                    style={{ "--preset-gradient": preset.gradient } as CSSProperties}
                    onClick={() => handleApplyStyle(preset.label, preset.prompt)}
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="studio-section library-section">
              <p className="library-title">社区热门</p>
              <div className="community-grid">
                {filteredCommunityItems.map((item) => (
                  <button key={item.src} className="community-card" type="button" onClick={() => handleApplyCommunity(item)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.src} alt="" />
                  </button>
                ))}
              </div>
            </section>

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

      {message ? <p className="studio-toast" aria-live="polite">{message}</p> : null}
    </main>
  );
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
