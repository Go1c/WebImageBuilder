"use client";

import { useEffect, useRef } from "react";

export type ChartSeries = { data: number[]; color: string; fill?: string };

export function LineChart({ series, height = 240 }: { series: ChartSeries[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

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

      const padL = 8;
      const padR = 8;
      const padT = 12;
      const padB = 18;
      const iw = w - padL - padR;
      const ih = h - padT - padB;
      const all = series.flatMap((s) => s.data);
      const max = Math.max(1, ...all) * 1.15;

      ctx.strokeStyle = "#EEF0F4";
      ctx.lineWidth = 1;
      for (let g = 0; g <= 3; g++) {
        const y = padT + (ih * g) / 3;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - padR, y);
        ctx.stroke();
      }

      for (const s of series) {
        const n = s.data.length;
        if (n === 0) {
          continue;
        }
        const px = (i: number) => padL + (iw * i) / Math.max(1, n - 1);
        const py = (v: number) => padT + ih * (1 - v / max);

        if (s.fill) {
          const grad = ctx.createLinearGradient(0, padT, 0, padT + ih);
          grad.addColorStop(0, s.fill);
          grad.addColorStop(1, "rgba(91,97,232,0)");
          ctx.beginPath();
          ctx.moveTo(px(0), padT + ih);
          s.data.forEach((v, i) => ctx.lineTo(px(i), py(v)));
          ctx.lineTo(px(n - 1), padT + ih);
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
    };

    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [series, height]);

  return <canvas ref={ref} style={{ display: "block", width: "100%" }} height={height} />;
}
