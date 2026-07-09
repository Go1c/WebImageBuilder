import type { ReactNode } from "react";

export function PageShell({
  title,
  crumb,
  actions,
  children
}: {
  title: string;
  crumb: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="ad-topbar">
        <div>
          <h1>{title}</h1>
          <div className="ad-crumb">{crumb}</div>
        </div>
        <div className="ad-spacer" />
        {actions}
        <a className="ad-btn sm ghost" href="/">← 返回生图站</a>
      </header>
      <div className="ad-content">{children}</div>
    </>
  );
}
