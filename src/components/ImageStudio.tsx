"use client";

import { useEffect, useMemo, useState } from "react";
import type { GenerationMode, ModelKey } from "@/server/domain/models";
import { readApiError, readApiJson } from "./apiErrors";
import { buildGenerationRequestPreview } from "./generationRequestPreview";
import { downloadGeneratedImage } from "./imageDownload";

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

type ResultViewMode = "single" | "grid";

const modes: Array<{ key: GenerationMode; label: string; note: string; summary: string }> = [
  { key: "text-to-image", label: "文生图", note: "V1", summary: "从文字生成完整画面" },
  { key: "image-to-image", label: "参考图", note: "V1", summary: "基于参考图重新创作" },
  { key: "inpaint", label: "局部重绘", note: "V1.1", summary: "使用遮罩替换局部区域" },
  { key: "variation", label: "变体", note: "V1.1", summary: "延展同一视觉方向" }
];

const modelOptions: Array<{ key: ModelKey; label: string; provider: string }> = [
  { key: "gpt-image-2", label: "GPT Image 2", provider: "OpenAI" },
  { key: "gemini-image", label: "Gemini", provider: "Google" }
];

const sizeOptions = [
  { value: "1024x1024", label: "1:1", detail: "1024 x 1024" },
  { value: "1024x1536", label: "2:3", detail: "1024 x 1536" },
  { value: "1536x1024", label: "3:2", detail: "1536 x 1024" }
];

const qualityOptions = [
  { value: "standard", label: "标准" },
  { value: "high", label: "高质量" }
];

const generationTimeoutMs = 120_000;

export function ImageStudio() {
  const [mode, setMode] = useState<GenerationMode>("text-to-image");
  const [model, setModel] = useState<ModelKey>("gpt-image-2");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("standard");
  const [count, setCount] = useState(1);
  const [referenceFiles, setReferenceFiles] = useState<FileList | null>(null);
  const [maskFile, setMaskFile] = useState<File | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [resultView, setResultView] = useState<ResultViewMode>("single");
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [requestPreview, setRequestPreview] = useState<string | null>(null);

  const needsReference = mode !== "text-to-image";
  const needsMask = mode === "inpaint";
  const disabled = loading || !prompt.trim() || (needsReference && !referenceFiles?.length) || (needsMask && !maskFile);
  const activeMode = modes.find((item) => item.key === mode) || modes[0];
  const activeSize = sizeOptions.find((item) => item.value === size) || sizeOptions[0];
  const activeQuality = qualityOptions.find((item) => item.value === quality) || qualityOptions[0];
  const referenceFileNames = useMemo(() => Array.from(referenceFiles || []).map((file) => file.name), [referenceFiles]);
  const promptLength = prompt.trim().length;

  useEffect(() => {
    void (async () => {
      await claimInviteFromUrl();
      await refreshData();
    })();
  }, []);

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
    setLoading(true);
    setMessage(null);
    setRequestPreview(
      buildGenerationRequestPreview({
        prompt,
        model,
        mode,
        size,
        quality,
        count,
        referenceCount: referenceFiles?.length || 0,
        hasMask: Boolean(maskFile)
      })
    );
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), generationTimeoutMs);

    try {
      const references = needsReference
        ? await Promise.all(Array.from(referenceFiles || []).map((file) => uploadAsset(file, "reference")))
        : [];
      const mask = needsMask && maskFile ? await uploadAsset(maskFile, "mask") : undefined;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt,
          mode,
          model,
          size,
          quality,
          count,
          referenceAssets: references,
          maskAsset: mask
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

  function handleResultViewChange(nextView: ResultViewMode) {
    setResultView(nextView);
    setCount(nextView === "grid" ? 4 : 1);
  }

  function handleCountChange(value: number) {
    const nextCount = Math.min(4, Math.max(1, value));
    setCount(nextCount);
    setResultView(nextCount > 1 ? "grid" : "single");
  }

  async function handleDownloadImage(image: GeneratedImage, index: number) {
    try {
      await downloadGeneratedImage(image, index);
      setMessage("图片已开始保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存图片失败");
    }
  }

  async function handleCopyRequestPreview() {
    if (!requestPreview) {
      return;
    }

    await navigator.clipboard.writeText(requestPreview);
    setMessage("请求参数已复制");
  }

  const quotaText = useMemo(() => {
    if (!quota) {
      return "额度未连接";
    }

    return `${quota.quota.remaining} 次可用`;
  }, [quota]);

  return (
    <main className="studio-page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Lumio Image Studio">
          <span className="brand-mark">L</span>
          <div className="brand-copy">
            <span>Lumio</span>
            <strong>Image Studio</strong>
          </div>
        </a>

        <div className="topbar-actions">
          <div className="quota-summary">
            <span>可用额度</span>
            <strong>{quotaText}</strong>
          </div>
          <a
            className="account-link"
            href={process.env.NEXT_PUBLIC_LUMIO_LOGIN_URL || "https://api.lumio.games/"}
            target="_blank"
            rel="noreferrer"
          >
            登录 / 购买
          </a>
        </div>
      </header>

      <div className="studio-layout">
        <section className="composer-panel" aria-label="图像创作">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Create</span>
              <h1>生成一张新图片</h1>
            </div>
            <span className="mode-badge">{activeMode.note}</span>
          </div>

          <div className="model-switch" role="group" aria-label="选择模型">
            {modelOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={model === option.key ? "is-active" : ""}
                onClick={() => setModel(option.key)}
              >
                <span>{option.label}</span>
                <small>{option.provider}</small>
              </button>
            ))}
          </div>

          <div className="mode-grid" role="group" aria-label="选择生成模式">
            {modes.map((item) => (
              <button
                key={item.key}
                type="button"
                className={mode === item.key ? "is-active" : ""}
                onClick={() => setMode(item.key)}
              >
                <span>{item.label}</span>
                <small>{item.summary}</small>
              </button>
            ))}
          </div>

          <label className="prompt-field">
            <span>提示词</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="描述主体、风格、光线、镜头、材质和画面氛围"
            />
            <small>{promptLength} / 4000</small>
          </label>

          <div className="settings-grid">
            <label>
              <span>画幅</span>
              <select value={size} onChange={(event) => setSize(event.target.value)}>
                {sizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.detail}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>质量</span>
              <select value={quality} onChange={(event) => setQuality(event.target.value)}>
                {qualityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>数量</span>
              <input
                aria-label="生成数量"
                type="number"
                min={1}
                max={4}
                value={count}
                onChange={(event) => handleCountChange(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="upload-grid">
            <label className={needsReference ? "upload-target is-required" : "upload-target"}>
              <span className="upload-title">参考图</span>
              <strong>{referenceFileNames.length > 0 ? `${referenceFileNames.length} 个文件` : needsReference ? "必选" : "可选"}</strong>
              <small>{referenceFileNames.length > 0 ? referenceFileNames.join(" / ") : "PNG、JPG 或 WebP"}</small>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => setReferenceFiles(event.target.files)}
              />
            </label>

            <label className={needsMask ? "upload-target is-required" : "upload-target"}>
              <span className="upload-title">遮罩图</span>
              <strong>{maskFile ? "已选择" : needsMask ? "必选" : "可选"}</strong>
              <small>{maskFile?.name || "局部重绘时使用"}</small>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setMaskFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="action-bar">
            <div className="run-summary">
              <strong>{activeMode.label}</strong>
              <span>
                {activeSize.label} · {activeQuality.label} · {count} 张
              </span>
            </div>
            <button className="primary-action" type="button" disabled={disabled} onClick={handleGenerate}>
              {loading ? `生成中 ${loadingSeconds}s` : "生成图片"}
            </button>
          </div>

          {loading && !message ? (
            <p className="status-message" aria-live="polite">
              正在连接模型，通常需要 20-60 秒，请保持页面打开
            </p>
          ) : null}

          {message ? (
            <p className={message === "生成完成" ? "status-message is-success" : "status-message"} aria-live="polite">
              {message}
            </p>
          ) : null}

          {requestPreview ? (
            <section className="request-preview" aria-label="本次生成请求">
              <div className="request-preview-header">
                <span>本次生成请求</span>
                <button type="button" onClick={handleCopyRequestPreview}>
                  复制
                </button>
              </div>
              <pre>{requestPreview}</pre>
            </section>
          ) : null}
        </section>

        <section className="preview-panel" aria-label="生成结果">
          <div className="panel-heading preview-heading">
            <div>
              <span className="eyebrow">Output</span>
              <h2>生成结果</h2>
            </div>
            <div className="preview-actions">
              <div className="result-view-toggle" role="group" aria-label="结果布局">
                <button
                  type="button"
                  className={resultView === "single" ? "is-active" : ""}
                  onClick={() => handleResultViewChange("single")}
                >
                  单页
                </button>
                <button
                  type="button"
                  className={resultView === "grid" ? "is-active" : ""}
                  onClick={() => handleResultViewChange("grid")}
                >
                  4宫格
                </button>
              </div>
              <span className="preview-meta">{images.length > 0 ? `${images.length} 张` : "待生成"}</span>
            </div>
          </div>

          <div className={images.length === 0 ? "result-stage is-empty" : `result-stage is-${resultView}`}>
            {images.length === 0 ? (
              <div className="empty-canvas">
                <span>Preview</span>
                <strong>结果会显示在这里</strong>
              </div>
            ) : (
              images.map((image, index) => (
                <figure key={image.key} className="result-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={`生成结果 ${index + 1}`} />
                  <figcaption>
                    <span>Result {index + 1}</span>
                    <button className="download-action" type="button" onClick={() => void handleDownloadImage(image, index)}>
                      保存图片
                    </button>
                  </figcaption>
                </figure>
              ))
            )}
          </div>
        </section>

        <aside className="history-panel" aria-label="历史记录">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Recent</span>
              <h2>历史记录</h2>
            </div>
            <span className="history-count">{history.length}</span>
          </div>

          <div className="history-list">
            {history.length === 0 ? (
              <div className="empty-history">
                <strong>暂无历史</strong>
                <span>生成后的任务会出现在这里</span>
              </div>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  className="history-item"
                  type="button"
                  onClick={() => {
                    setPrompt(item.prompt);
                    setImages(
                      (item.assets || [])
                        .filter((asset) => asset.type === "result")
                        .map((asset) => ({
                          key: asset.url,
                          url: asset.url,
                          mimeType: "image/png"
                        }))
                    );
                  }}
                >
                  <span>{item.prompt}</span>
                  <small>
                    {item.modelKey} · {item.status} · {formatHistoryDate(item.createdAt)}
                  </small>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function formatHistoryDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
