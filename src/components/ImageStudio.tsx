"use client";

import { useEffect, useMemo, useState } from "react";
import type { GenerationMode, ModelKey } from "@/server/domain/models";

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

const modes: Array<{ key: GenerationMode; label: string; note: string }> = [
  { key: "text-to-image", label: "文生图", note: "V1" },
  { key: "image-to-image", label: "参考图", note: "V1" },
  { key: "inpaint", label: "局部重绘", note: "V1.1" },
  { key: "variation", label: "变体", note: "V1.1" }
];

const modelOptions: Array<{ key: ModelKey; label: string }> = [
  { key: "gpt-image-2", label: "GPT Image 2" },
  { key: "gemini-image", label: "Gemini" }
];

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const needsReference = mode !== "text-to-image";
  const needsMask = mode === "inpaint";
  const disabled = loading || !prompt.trim() || (needsReference && !referenceFiles?.length);

  useEffect(() => {
    void refreshData();
    void claimInviteFromUrl();
  }, []);

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

    try {
      const references = needsReference
        ? await Promise.all(Array.from(referenceFiles || []).map((file) => uploadAsset(file, "reference")))
        : [];
      const mask = needsMask && maskFile ? await uploadAsset(maskFile, "mask") : undefined;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const result = (await response.json()) as {
        images: GeneratedImage[];
        quota: QuotaResponse["quota"];
      };

      setImages(result.images);
      setQuota((current) => (current ? { ...current, quota: result.quota } : current));
      setMessage("生成完成");
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  const quotaText = useMemo(() => {
    if (!quota) {
      return "额度未连接";
    }

    return `${quota.quota.remaining} 次可用`;
  }, [quota]);

  return (
    <main className="studio-shell">
      <aside className="studio-sidebar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <div>
            <strong>Lumio Image Studio</strong>
            <small>公开生成工作台</small>
          </div>
        </div>

        <section className="quota-panel">
          <div>
            <span className="eyebrow">当前额度</span>
            <strong>{quotaText}</strong>
          </div>
          <a
            className="login-link"
            href={process.env.NEXT_PUBLIC_LUMIO_LOGIN_URL || "https://api.lumio.games/"}
            target="_blank"
            rel="noreferrer"
          >
            登录 / 购买
          </a>
        </section>

        <section className="history-list">
          <div className="section-title">历史记录</div>
          {history.length === 0 ? (
            <p className="muted">暂无历史</p>
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
                  {item.modelKey} · {item.status}
                </small>
              </button>
            ))
          )}
        </section>
      </aside>

      <section className="workspace">
        <div className="toolbar">
          <div className="segmented">
            {modelOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={model === option.key ? "active" : ""}
                onClick={() => setModel(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="toolbar-controls">
            <select value={size} onChange={(event) => setSize(event.target.value)}>
              <option value="1024x1024">1:1</option>
              <option value="1024x1536">2:3</option>
              <option value="1536x1024">3:2</option>
            </select>
            <select value={quality} onChange={(event) => setQuality(event.target.value)}>
              <option value="standard">标准</option>
              <option value="high">高质量</option>
            </select>
            <input
              aria-label="数量"
              type="number"
              min={1}
              max={4}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </div>
        </div>

        <div className="mode-tabs">
          {modes.map((item) => (
            <button
              key={item.key}
              type="button"
              className={mode === item.key ? "active" : ""}
              onClick={() => setMode(item.key)}
            >
              <span>{item.label}</span>
              <small>{item.note}</small>
            </button>
          ))}
        </div>

        <section className="prompt-area">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="输入要生成或编辑的图像描述"
          />

          <div className="asset-row">
            <label className={needsReference ? "asset-input required" : "asset-input"}>
              <span>参考图</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => setReferenceFiles(event.target.files)}
              />
            </label>
            <label className={needsMask ? "asset-input required" : "asset-input"}>
              <span>遮罩图</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setMaskFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="action-row">
            <button className="primary-action" type="button" disabled={disabled} onClick={handleGenerate}>
              {loading ? "生成中" : "生成图片"}
            </button>
            {message ? <span className="status-message">{message}</span> : null}
          </div>
        </section>

        <section className="result-grid">
          {images.length === 0 ? (
            <div className="empty-state">
              <strong>结果区域</strong>
              <span>生成图片后会显示在这里</span>
            </div>
          ) : (
            images.map((image) => (
              <figure key={image.key} className="result-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="生成结果" />
                <figcaption>
                  <a href={image.url} target="_blank" rel="noreferrer">
                    打开原图
                  </a>
                </figcaption>
              </figure>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message || `请求失败：${response.status}`;
  } catch {
    return `请求失败：${response.status}`;
  }
}
