"use client";

import { useState } from "react";
import {
  buildPromptShareCardSvg,
  buildPromptShareCopyText,
  buildShareCardFileName,
  summarizePromptForShare
} from "./sharePromptCard";

export type PromptShareDialogData = {
  imageUrl: string;
  prompt: string;
  shareUrl: string;
  complianceNotice: string;
};

type SharePromptDialogProps = {
  share: PromptShareDialogData;
  onClose: () => void;
  onCopyPrompt: () => Promise<void>;
};

type ShareActionStatus = "idle" | "copied" | "downloaded" | "failed";

export function SharePromptDialog({ share, onClose, onCopyPrompt }: SharePromptDialogProps) {
  const [status, setStatus] = useState<ShareActionStatus>("idle");
  const promptSummary = summarizePromptForShare(share.prompt, 110);

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(
        buildPromptShareCopyText({
          prompt: share.prompt,
          shareUrl: share.shareUrl
        })
      );
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  async function copyPrompt() {
    try {
      await onCopyPrompt();
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  function downloadShareCard() {
    try {
      const svg = buildPromptShareCardSvg({
        imageUrl: share.imageUrl,
        prompt: share.prompt,
        shareUrl: share.shareUrl,
        complianceNotice: share.complianceNotice
      });
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = buildShareCardFileName();
      link.rel = "noreferrer";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setStatus("downloaded");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="share-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        className="prompt-share-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="分享提示词卡片"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="share-dialog-header">
          <div>
            <p className="share-dialog-eyebrow">分享提示词卡片</p>
            <h2>把这个提示词分享出去</h2>
          </div>
          <button className="share-dialog-close" type="button" onClick={onClose} aria-label="关闭分享面板">
            x
          </button>
        </div>

        <div className="share-dialog-body">
          <article className="prompt-share-card-preview" aria-label="分享卡片预览">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={share.imageUrl} alt="" />
            <div className="prompt-share-card-copy">
              <span>Lumio 提示词分享</span>
              <strong>用这个提示词生成同款图片</strong>
              <p>{promptSummary}</p>
            </div>
          </article>

          <div className="share-dialog-actions">
            <a href={share.shareUrl} target="_blank" rel="noreferrer">
              打开分享页
            </a>
            <button className="share-dialog-primary" type="button" onClick={() => void copyShareText()}>
              复制分享文案
            </button>
            <button type="button" onClick={() => void copyPrompt()}>
              复制提示词
            </button>
            <button type="button" onClick={downloadShareCard}>
              下载分享卡片
            </button>
          </div>
        </div>

        <p className="share-dialog-compliance">{share.complianceNotice}</p>
        {status !== "idle" ? (
          <p className={`share-dialog-status is-${status}`} aria-live="polite">
            {status === "copied"
              ? "已复制"
              : status === "downloaded"
                ? "分享卡片已开始下载"
                : "操作失败，请稍后重试"}
          </p>
        ) : null}
      </section>
    </div>
  );
}
