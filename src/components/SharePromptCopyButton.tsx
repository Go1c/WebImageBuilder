"use client";

import { useEffect, useState } from "react";
import { buildPromptShareCopyText } from "./sharePromptCard";

export function SharePromptCopyButton({ prompt }: { prompt: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus("idle");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(
        buildPromptShareCopyText({
          prompt,
          shareUrl: window.location.href
        })
      );
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="share-copy-actions">
      <button type="button" onClick={() => void copyPrompt()}>
        复制提示词
      </button>
      <button type="button" onClick={() => void copyShareText()}>
        复制分享文案
      </button>
      {status !== "idle" ? (
        <div className={`share-copy-toast ${status === "copied" ? "is-copied" : "is-failed"}`} role="status" aria-live="polite">
          {status === "copied" ? "已复制" : "复制失败"}
        </div>
      ) : null}
    </div>
  );
}
