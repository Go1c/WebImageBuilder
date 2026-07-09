"use client";

import { useEffect, useState } from "react";

type ReportStatus = "idle" | "reporting" | "reported" | "failed";

export function ShareReportButton({ shareId }: { shareId: string }) {
  const [status, setStatus] = useState<ReportStatus>("idle");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const reported = status === "reported";

  useEffect(() => {
    if (!toastVisible) {
      return;
    }
    const timeoutId = window.setTimeout(() => setToastVisible(false), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toastVisible]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDialogOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen]);

  async function submitReport() {
    if (status === "reporting" || reported) {
      return;
    }

    setStatus("reporting");
    try {
      const response = await fetch(`/api/shares/${encodeURIComponent(shareId)}/report`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("举报失败");
      }
      setStatus("reported");
      setDialogOpen(false);
      setToastVisible(true);
    } catch {
      setStatus("failed");
    }
  }

  return (
    <>
      <button
        type="button"
        className="share-report-link"
        onClick={() => setDialogOpen(true)}
        disabled={reported}
      >
        {reported ? "已举报 ✓" : "举报该内容"}
      </button>

      {dialogOpen ? (
        <div
          className="share-dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDialogOpen(false);
            }
          }}
        >
          <div
            className="prompt-share-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-report-title"
          >
            <div className="share-dialog-header">
              <div>
                <p className="share-dialog-eyebrow">举报内容</p>
                <h2 id="share-report-title">举报这张卡片？</h2>
              </div>
              <button
                type="button"
                className="share-dialog-close"
                aria-label="关闭"
                onClick={() => setDialogOpen(false)}
              >
                ✕
              </button>
            </div>
            <p className="share-dialog-compliance">
              我们会在 24 小时内复核这张卡片，复核期间不会通知作者。
              若违反内容规范，卡片将被下架。
            </p>
            <div className="share-dialog-actions">
              <button
                type="button"
                className="share-dialog-primary"
                onClick={() => void submitReport()}
                disabled={status === "reporting"}
              >
                {status === "reporting" ? "提交中…" : "确认举报"}
              </button>
              <button type="button" onClick={() => setDialogOpen(false)}>
                取消
              </button>
            </div>
            {status === "failed" ? (
              <p className="share-dialog-status is-failed" role="status" aria-live="polite">
                举报失败，请稍后重试。
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {toastVisible ? (
        <div className="share-copy-toast is-copied" role="status" aria-live="polite">
          已收到举报，感谢反馈
        </div>
      ) : null}
    </>
  );
}
