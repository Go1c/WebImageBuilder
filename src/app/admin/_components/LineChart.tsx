"use client";

import { useEffect, useRef, useState } from "react";

export type ChartSeries = { data: number[]; color: string; fill?: string; name?: string };

const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 18;

export function LineChart({
  series,
  height = 240,
  labels
}: {
  series: ChartSeries[];
  height?: number;
  labels?: string[];
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ i: number; x: number } | null>(null);

  const pointCount = Math.max(...series.map((s) => s.data.length), 0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) {
      return;
    }

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const iw = w - PAD_L - PAD_R;
      const ih = h - PAD_T - PAD_B;
      const all = series.flatMap((s) => s.data);
      const max = Math.max(1, ...all) * 1.15;

      ctx.strokeStyle = "#EEF0F4";
      ctx.lineWidth = 1;
      for (let g = 0; g <= 3; g++) {
        const y = PAD_T + (ih * g) / 3;
        ctx.beginPath();
        ctx.moveTo(PAD_L, y);
        ctx.lineTo(w - PAD_R, y);
        ctx.stroke();
      }

      for (const s of series) {
        const n = s.data.length;
        if (n === 0) {
          continue;
        }
        const px = (i: number) => PAD_L + (iw * i) / Math.max(1, n - 1);
        const py = (v: number) => PAD_T + ih * (1 - v / max);

        if (s.fill) {
          const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + ih);
          grad.addColorStop(0, s.fill);
          grad.addColorStop(1, "rgba(91,97,232,0)");
          ctx.beginPath();
          ctx.moveTo(px(0), PAD_T + ih);
          s.data.forEach((v, i) => ctx.lineTo(px(i), py(v)));
          ctx.lineTo(px(n - 1), PAD_T + ih);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = s.color;
        ctx.lineJoin = "round";
        s.data.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
        ctx.stroke();

        const lx = px(n - 1);
        const ly = py(s.data[n - 1]);
        ctx.beginPath();
        ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      }

      // hover markers on top of everything
      if (hover) {
        for (const s of series) {
          const n = s.data.length;
          if (n === 0 || hover.i >= n) continue;
          const px = (i: number) => PAD_L + (iw * i) / Math.max(1, n - 1);
          const py = (v: number) => PAD_T + ih * (1 - v / max);
          ctx.beginPath();
          ctx.arc(px(hover.i), py(s.data[hover.i]), 4, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = s.color;
          ctx.stroke();
        }
      }
    };

    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [series, height, hover]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (!wrap || pointCount === 0) return;
    const rect = wrap.getBoundingClientRect();
    const iw = rect.width - PAD_L - PAD_R;
    const rel = e.clientX - rect.left - PAD_L;
    const i = Math.max(0, Math.min(pointCount - 1, Math.round((rel / Math.max(1, iw)) * (pointCount - 1))));
    const x = PAD_L + (iw * i) / Math.max(1, pointCount - 1);
    setHover({ i, x });
  };

  return (
    <div
      className="adx-chart"
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      style={{ position: "relative" }}
    >
      <canvas ref={ref} style={{ display: "block", width: "100%" }} height={height} />
      {hover ? (
        <div className="adx-chart-tip show" style={{ left: hover.x, top: PAD_T }}>
          {labels && labels[hover.i] ? <div className="d">{labels[hover.i]}</div> : null}
          {series.map((s, si) => (
            <div className="row" key={si}>
              <span className="dot" style={{ background: s.color }} />
              {s.name ? `${s.name} ` : ""}
              <strong className="ad-tnum">{(s.data[hover.i] ?? 0).toLocaleString("en-US")}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
