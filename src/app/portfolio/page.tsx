"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import { downloadGeneratedImage } from "@/components/imageDownload";
import {
  createIndexedDbPortfolioAssetStore,
  loadSavedPortfolioItems,
  savePortfolioItems
} from "@/components/portfolioStorage";
import type { LocalPortfolioItem } from "@/components/studioActions";

import type { CSSProperties } from "react";

type LoadState = "loading" | "ready" | "error";

// Hover action-bar styles mirror the design's page-local CSS (the `.pc-hover`
// rule is not part of the shared globals.css we consume).
const pcHoverStyle: CSSProperties = {
  position: "absolute",
  inset: "auto 0 34px 0",
  display: "flex",
  justifyContent: "center",
  gap: 6,
  padding: 8,
  background: "linear-gradient(0deg, rgba(0,0,0,.55), transparent)"
};

const pcHoverButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: 999,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 600,
  background: "rgba(255,255,255,.92)",
  color: "#171717",
  cursor: "pointer"
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "";
  }
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((startOfToday.getTime() - new Date(then).setHours(0, 0, 0, 0)) / dayMs);
  if (now - then < 60 * 1000) {
    return "刚刚";
  }
  if (diffDays <= 0) {
    return "今天";
  }
  if (diffDays === 1) {
    return "昨天";
  }
  if (diffDays < 30) {
    return `${diffDays} 天前`;
  }
  return new Date(then).toLocaleDateString("zh-CN");
}

function cardTitle(item: LocalPortfolioItem): string {
  const trimmed = item.prompt.trim();
  if (!trimmed) {
    return "未命名作品";
  }
  return trimmed.length > 12 ? `${trimmed.slice(0, 12)}…` : trimmed;
}

export default function PortfolioPage() {
  const [items, setItems] = useState<LocalPortfolioItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const assetStore = useMemo(() => createIndexedDbPortfolioAssetStore(), []);

  useEffect(() => {
    let mounted = true;
    setLoadState("loading");
    loadSavedPortfolioItems({ storage: window.localStorage, assetStore })
      .then((loaded) => {
        if (!mounted) {
          return;
        }
        setItems(loaded);
        setLoadState("ready");
      })
      .catch(() => {
        if (mounted) {
          setLoadState("error");
        }
      });
    return () => {
      mounted = false;
    };
  }, [assetStore]);

  const handleDownload = (item: LocalPortfolioItem, index: number) => {
    void downloadGeneratedImage({ url: item.url, mimeType: item.mimeType }, index);
  };

  const handleOpenInCanvas = (item: LocalPortfolioItem) => {
    try {
      window.localStorage.setItem(
        "lumio:canvas-handoff",
        JSON.stringify({ url: item.url, prompt: item.prompt, createdAt: Date.now() })
      );
    } catch {
      // localStorage unavailable — still navigate to the canvas.
    }
    window.location.href = "/canvas";
  };

  const handleDelete = async (item: LocalPortfolioItem) => {
    const remaining = items.filter((current) => current.id !== item.id);
    // Optimistic update, then persist the trimmed list back to local storage.
    setItems(remaining);
    try {
      const saved = await savePortfolioItems({
        items: remaining,
        storage: window.localStorage,
        assetStore
      });
      setItems(saved);
    } catch {
      // Persist failed; reload to reflect true on-disk state.
      try {
        const reloaded = await loadSavedPortfolioItems({ storage: window.localStorage, assetStore });
        setItems(reloaded);
      } catch {
        setLoadState("error");
      }
    }
  };

  const retry = () => {
    setLoadState("loading");
    loadSavedPortfolioItems({ storage: window.localStorage, assetStore })
      .then((loaded) => {
        setItems(loaded);
        setLoadState("ready");
      })
      .catch(() => setLoadState("error"));
  };

  return (
    <main className="portfolio-page">
      <AppShell active="作品集" />

      <div className="page-head">
        <h1>作品集</h1>
        <p>你生成并保存的成品 · 🔒 仅保存在本设备，清除浏览器数据会丢失</p>
      </div>

      <div className="cards-wrap">
        {loadState === "loading" ? (
          <div className="empty-state">
            <p>正在读取本地作品…</p>
          </div>
        ) : loadState === "error" ? (
          <div className="empty-state">
            <h3>读取本地作品失败</h3>
            <p>作品保存在本设备的浏览器存储中；隐私模式或清理数据会导致读取失败。</p>
            <button type="button" className="btn" onClick={retry}>
              重试
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>还没有作品</h3>
            <p>去生成一张图片并保存到作品集，它会出现在这里（仅保存在本设备）。</p>
            <a className="btn generate" href="/">
              去生成 →
            </a>
          </div>
        ) : (
          <div className="portfolio-grid">
            {items.map((item, index) => (
              <div key={item.id} className="portfolio-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={cardTitle(item)} loading="lazy" decoding="async" />
                <div className="pc-hover" style={pcHoverStyle}>
                  <button type="button" style={pcHoverButtonStyle} onClick={() => handleOpenInCanvas(item)}>
                    画布
                  </button>
                  <button type="button" style={pcHoverButtonStyle} onClick={() => handleDownload(item, index)}>
                    下载
                  </button>
                  <button type="button" style={pcHoverButtonStyle} onClick={() => void handleDelete(item)}>
                    删除
                  </button>
                </div>
                <div className="pc-meta">
                  <span>{cardTitle(item)}</span>
                  <span>{relativeTime(item.savedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
