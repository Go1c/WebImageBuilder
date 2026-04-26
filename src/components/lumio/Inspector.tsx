"use client";

import { useState } from "react";

export type InspectorParams = {
  seed: number | "auto";
  cfg: number;
  steps: number;
  quality: "standard" | "high";
};

export type InspectorProps = {
  value: InspectorParams;
  locked: Partial<Record<keyof InspectorParams, boolean>>;
  onChange: (next: InspectorParams) => void;
  onToggleLock: (key: keyof InspectorParams) => void;
};

export function Inspector(props: InspectorProps) {
  const v = props.value;
  return (
    <div className="v2-inspector">
      <h3>参数</h3>

      <Row label="Seed" locked={!!props.locked.seed} onLock={() => props.onToggleLock("seed")}>
        <code className="val" style={{ cursor: "pointer" }} onClick={() => {
          const next = prompt("Seed (输入 auto 表示随机)", String(v.seed));
          if (next == null) return;
          if (next.trim() === "auto") props.onChange({ ...v, seed: "auto" });
          else if (/^\d+$/.test(next.trim())) props.onChange({ ...v, seed: Number(next) });
        }}>
          {v.seed === "auto" ? "auto" : v.seed}
        </code>
      </Row>

      <Row label="CFG" locked={!!props.locked.cfg} onLock={() => props.onToggleLock("cfg")}>
        <input
          type="range" min={1} max={20} step={0.5}
          value={v.cfg}
          onChange={(e) => props.onChange({ ...v, cfg: Number(e.target.value) })}
          style={{ width: 120 }}
        />
        <code className="val" style={{ marginLeft: 8 }}>{v.cfg.toFixed(1)}</code>
      </Row>

      <Row label="Steps" locked={!!props.locked.steps} onLock={() => props.onToggleLock("steps")}>
        <input
          type="range" min={10} max={60} step={1}
          value={v.steps}
          onChange={(e) => props.onChange({ ...v, steps: Number(e.target.value) })}
          style={{ width: 120 }}
        />
        <code className="val" style={{ marginLeft: 8 }}>{v.steps}</code>
      </Row>

      <Row label="质量" locked={!!props.locked.quality} onLock={() => props.onToggleLock("quality")}>
        <div className="v2-mode" style={{ height: 26 }}>
          {(["standard", "high"] as const).map((q) => (
            <button
              key={q}
              type="button"
              className={v.quality === q ? "is-on" : ""}
              onClick={() => props.onChange({ ...v, quality: q })}
            >
              {q === "standard" ? "标准" : "高"}
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}

function Row({
  label,
  locked,
  onLock,
  children
}: {
  label: string;
  locked: boolean;
  onLock: () => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div className="v2-row" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <label>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {children}
        <button
          type="button"
          className={`lock ${locked ? "on" : ""}`}
          onClick={onLock}
          aria-label={locked ? "解锁" : "锁定"}
          style={{ visibility: locked || hover ? "visible" : "hidden" }}
        >
          {locked ? "🔒" : "🔓"}
        </button>
      </div>
    </div>
  );
}

export const defaultInspectorParams: InspectorParams = {
  seed: "auto",
  cfg: 7,
  steps: 30,
  quality: "standard"
};
