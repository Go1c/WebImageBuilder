// NOTE: No longer auto-redirects. Per design P6「已失效 / 已下架」态：
// 体验化卡片而非白屏跳转，把选择权留给访客（handoff 明确要求不自动跳转）。
export function ShareUnavailableRedirect() {
  return (
    <main className="share-page">
      <section className="share-card" aria-label="分享不可访问">
        <div className="share-unavailable">
          <p className="share-eyebrow">LUMIO 提示词卡片</p>
          <h2>这张卡片已失效或被下架</h2>
          <p>
            链接可能已过期、被作者删除，或因内容被举报后下架。
            你仍然可以打开工作台，用自己的创意生成一张新图。
          </p>
          <a className="btn generate" href="/">
            去生成 →
          </a>
        </div>
      </section>
    </main>
  );
}
