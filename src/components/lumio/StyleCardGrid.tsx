"use client";

import type { CSSProperties } from "react";

export type StylePreset = {
  key: string;
  label: string;
  /** 渐变色或图片 url（占位时用渐变） */
  swatch: string;
};

export const defaultStylePresets: StylePreset[] = [
  { key: "none", label: "无风格", swatch: "linear-gradient(135deg,#fafafa,#e5e5e5)" },
  { key: "concept", label: "游戏概念图", swatch: "linear-gradient(135deg,#3F4A5C,#A4825D)" },
  { key: "anime", label: "二次元", swatch: "linear-gradient(135deg,#FFB7D5,#7C82FF)" },
  { key: "oil", label: "厚涂油画", swatch: "linear-gradient(135deg,#7B3F00,#C9923D)" },
  { key: "ink", label: "水墨", swatch: "linear-gradient(135deg,#1f1f1f,#4a4a4a)" },
  { key: "ui-icon", label: "UI 图标", swatch: "linear-gradient(135deg,#7F22FE,#FAFAFA)" },
  { key: "pixel", label: "像素风", swatch: "linear-gradient(135deg,#FF6B35,#3D5A80)" },
  { key: "iso", label: "等距 3D", swatch: "linear-gradient(135deg,#9AB5C8,#F2E8D5)" }
];

export function StyleCardGrid({
  presets = defaultStylePresets,
  selected,
  onSelect
}: {
  presets?: StylePreset[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="v2-style-grid">
      {presets.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`v2-style-card ${selected === p.key ? "is-on" : ""}`}
          onClick={() => onSelect(p.key)}
          aria-pressed={selected === p.key}
        >
          <div className="swatch" style={{ background: p.swatch } as CSSProperties} />
          <div className="label">{p.label}</div>
        </button>
      ))}
    </div>
  );
}
