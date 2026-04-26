"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShareReportButton({ shareId }: { shareId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "reporting" | "reported" | "failed">("idle");

  async function handleReport() {
    if (status === "reporting" || status === "reported") {
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
      router.refresh();
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="share-report">
      <button
        type="button"
        onClick={() => void handleReport()}
        disabled={status === "reporting" || status === "reported"}
      >
        {status === "reporting" ? "举报中" : status === "reported" ? "已举报" : "举报"}
      </button>
      {status === "reported" ? <span>该分享已被举报，链接将不再可访问。</span> : null}
      {status === "failed" ? <span>举报失败，请稍后重试。</span> : null}
    </div>
  );
}
