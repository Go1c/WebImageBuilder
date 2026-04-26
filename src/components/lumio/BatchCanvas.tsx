"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export type CellState = "empty" | "loading" | "done" | "error";

export type BatchCell = {
  id: string;
  state: CellState;
  imageUrl?: string;
  meta?: string;
  errorMessage?: string;
};

export function BatchCanvas({
  cells,
  cols,
  virtualize = false,
  onCellAction
}: {
  cells: BatchCell[];
  cols?: 2 | 3 | 4;
  virtualize?: boolean;
  onCellAction?: (id: string, action: "upscale" | "seed" | "save" | "variation") => void;
}) {
  const c = cols ?? (cells.length > 4 ? 4 : 2);
  const cls = `v2-canvas ${c === 3 ? "cols-3" : c === 4 ? "cols-4" : "cols-2"}`;
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${c}, minmax(0, 1fr))`
  };

  // Virtualized rendering: only mount cells whose row is near the viewport.
  // Cheap implementation — no external dep. Activated only when virtualize=true
  // AND there are >24 cells.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 24]);

  const useVirtual = virtualize && cells.length > 24;

  useEffect(() => {
    if (!useVirtual) return;
    const el = containerRef.current;
    if (!el) return;

    function update() {
      const rect = el!.getBoundingClientRect();
      const cellWidth = rect.width / c;
      const rowHeight = cellWidth + 14; // matches v2-canvas gap
      const scrollY = window.scrollY;
      const viewTop = Math.max(0, scrollY - (rect.top + scrollY));
      const viewBottom = viewTop + window.innerHeight;
      const startRow = Math.max(0, Math.floor(viewTop / rowHeight) - 2);
      const endRow = Math.ceil(viewBottom / rowHeight) + 2;
      setVisibleRange([startRow * c, endRow * c]);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [useVirtual, c, cells.length]);

  const rendered = useMemo(() => {
    if (!useVirtual) return cells.map((cell, i) => ({ cell, i }));
    const [from, to] = visibleRange;
    return cells.slice(from, to).map((cell, idx) => ({ cell, i: from + idx }));
  }, [cells, useVirtual, visibleRange]);

  // Reserve full grid height when virtualizing so scrollbar reflects total length.
  const totalRows = Math.ceil(cells.length / c);
  const wrapperStyle: CSSProperties = useVirtual
    ? { ...gridStyle, position: "relative", minHeight: `calc((100% / ${c}) * ${totalRows})` }
    : gridStyle;

  return (
    <div ref={containerRef} className={cls} style={wrapperStyle}>
      {rendered.map(({ cell, i }) => (
        <Cell
          key={cell.id}
          cell={cell}
          index={i}
          cols={c}
          virtual={useVirtual}
          onAction={onCellAction}
        />
      ))}
    </div>
  );
}

function Cell({
  cell,
  index,
  cols,
  virtual,
  onAction
}: {
  cell: BatchCell;
  index: number;
  cols: number;
  virtual: boolean;
  onAction?: (id: string, action: "upscale" | "seed" | "save" | "variation") => void;
}) {
  const positional: CSSProperties = virtual
    ? {
        position: "absolute",
        left: `${(index % cols) * (100 / cols)}%`,
        top: `calc((100% / ${cols}) * ${Math.floor(index / cols)})`,
        width: `${100 / cols}%`,
        padding: "7px"
      }
    : {};
  const stateClass =
    cell.state === "loading" ? "v2-cell--loading" :
    cell.state === "error" ? "v2-cell--error" : "";

  return (
    <div className={`v2-cell ${stateClass}`} style={positional}>
      {cell.state === "loading" && <span>生成中…</span>}
      {cell.state === "error" && <span>{cell.errorMessage ?? "生成失败"}</span>}
      {cell.state === "done" && cell.imageUrl && (
        <>
          <img src={cell.imageUrl} alt="" loading="lazy" />
          {onAction && (
            <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 4 }}>
              <button type="button" title="放大" onClick={() => onAction(cell.id, "upscale")} style={iconBtn}>4×</button>
              <button type="button" title="复用 seed" onClick={() => onAction(cell.id, "seed")} style={iconBtn}>⌖</button>
              <button type="button" title="保存" onClick={() => onAction(cell.id, "save")} style={iconBtn}>↓</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const iconBtn: CSSProperties = {
  background: "rgba(0,0,0,0.6)",
  color: "white",
  border: 0,
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 11,
  fontFamily: "var(--studio-font-mono, ui-monospace, monospace)",
  fontWeight: 600,
  cursor: "pointer"
};
