"use client";

import { useEffect, useState } from "react";

export function SharePromptCopyButton({ prompt }: { prompt: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus("idle");
    }, 2400);

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

  return (
    <>
      <button type="button" onClick={() => void copyPrompt()}>
        复制提示词
      </button>
      {status !== "idle" ? (
        <div
          className={`share-copy-toast ${status === "copied" ? "is-copied" : "is-failed"}`}
          role="status"
          aria-live="polite"
        >
          {status === "copied" ? "提示词已复制" : "复制失败"}
        </div>
      ) : null}
    </>
  );
}
