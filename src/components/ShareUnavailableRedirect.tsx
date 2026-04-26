"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ShareUnavailableRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      router.replace("/");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  return (
    <main className="share-page">
      <section className="share-card share-unavailable-card" aria-label="分享不可访问">
        <div className="share-content share-unavailable-content">
          <p className="share-eyebrow">Lumio 提示词分享</p>
          <h1>分享已不可访问</h1>
          <p className="share-compliance">该链接可能已被举报或不存在，2 秒后返回主页。</p>
          <div className="share-actions">
            <a className="share-primary" href="/">
              返回主页
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
