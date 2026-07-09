export default function NotFound() {
  return (
    <main className="notfound" style={{ minHeight: "100dvh" }}>
      <div>
        <a
          className="studio-brand"
          href="/"
          aria-label="LumioImageStudio"
          style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24 }}
        >
          <span className="studio-brand-mark" aria-hidden="true">
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8z" />
            </svg>
          </span>
          <span>LumioImageStudio</span>
        </a>
        <h1>404</h1>
        <p>
          这个页面<span className="hl">走丢了</span>，但灵感还在。
        </p>
        <a className="btn generate" href="/">
          回到生图站
        </a>
      </div>
    </main>
  );
}
