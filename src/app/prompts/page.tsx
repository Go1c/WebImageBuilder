"use client";

import { useEffect, useMemo, useState } from "react";

import AppShell from "@/components/AppShell";
import { promptLibraryItems as staticPromptLibraryItems, type PromptLibraryItem } from "@/components/promptLibrary";
import { getPromptLibraryImageLoading } from "@/components/promptLibraryImages";
import { fetchPromptLibrary } from "@/components/promptLibrarySource";

const favoritesStorageKey = "lumio:prompt-favorites";

const categoryTabs = ["全部", "热门", "人物", "场景", "风格", "收藏", "我的"] as const;
type CategoryTab = (typeof categoryTabs)[number];

type LoadState = "loading" | "ready" | "error";

/**
 * Clean the bilingual "中文 / English" title down to its Chinese lead for the card
 * label, matching the compact titles in the hi-fi design.
 */
function displayTitle(item: PromptLibraryItem): string {
  const head = item.title.split(" / ")[0]?.trim();
  return head || item.title;
}

function libraryTextMatches(item: PromptLibraryItem, pattern: RegExp): boolean {
  return pattern.test(`${item.title} ${item.category} ${item.prompt.slice(0, 500)}`);
}

function matchesCategory(item: PromptLibraryItem, tab: CategoryTab): boolean {
  if (tab === "全部" || tab === "热门") {
    return true;
  }
  if (tab === "人物") {
    return libraryTextMatches(item, /人物|角色|人像|头像|少女|美女|男士|女性|模特|coser|写真|肖像/);
  }
  if (tab === "场景") {
    return libraryTextMatches(item, /场景|城市|建筑|空间|室内|户外|地图|风景|海报|长卷|叙事/);
  }
  if (tab === "风格") {
    return libraryTextMatches(item, /风格|插画|摄影|写实|动漫|国风|水彩|电影|视觉|品牌|标志|排版|信息图|界面/);
  }
  return false;
}

function readFavorites(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(favoritesStorageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(favoritesStorageKey, JSON.stringify(ids));
  } catch {
    // Storage may be unavailable (private mode); favorites are best-effort only.
  }
}

export default function PromptsPage() {
  const [items, setItems] = useState<PromptLibraryItem[]>(staticPromptLibraryItems);
  const [loadState, setLoadState] = useState<LoadState>("ready");
  const [activeTab, setActiveTab] = useState<CategoryTab>("全部");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoadState("loading");
    fetchPromptLibrary(controller.signal)
      .then((fetched) => {
        if (cancelled) {
          return;
        }
        if (fetched.length > 0) {
          setItems(fetched);
        }
        setLoadState("ready");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        // Keep the bundled static library on failure so the page is never blank,
        // but surface the error affordance for the (rare) hard-fetch failure.
        setLoadState("error");
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (activeTab === "收藏" || activeTab === "我的") {
        if (!favoriteSet.has(item.id)) {
          return false;
        }
      } else if (!matchesCategory(item, activeTab)) {
        return false;
      }
      if (query) {
        const haystack = `${item.title} ${item.category} ${item.prompt.slice(0, 500)}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [items, activeTab, search, favoriteSet]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      writeFavorites(next);
      return next;
    });
  };

  const applyPrompt = (item: PromptLibraryItem) => {
    if (typeof window === "undefined") {
      return;
    }
    window.location.href = `/?prompt=${encodeURIComponent(item.prompt)}`;
  };

  const isMineTab = activeTab === "收藏" || activeTab === "我的";
  const showEmpty = visibleItems.length === 0;

  return (
    <main className="prompts-page">
      <AppShell active="提示词库" />

      <div className="page-head">
        <h1>提示词库</h1>
        <p>官方提示词 {items.length} 条 · 「收藏 / 我的」仅保存在本设备</p>
      </div>

      <div className="filter-row">
        <div className="library-search">
          ⌕
          <input
            placeholder="搜索提示词、标签"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {categoryTabs.map((tab) => {
          const count = tab === "收藏" || tab === "我的" ? favorites.length : 0;
          return (
            <button
              key={tab}
              type="button"
              className={`chip${activeTab === tab ? " on" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {(tab === "收藏" || tab === "我的") && count > 0 ? ` ${count}` : ""}
            </button>
          );
        })}
      </div>

      <div className="cards-wrap">
        {isMineTab ? <div className="local-note">🔒 仅保存在本设备</div> : null}

        {loadState === "error" && !isMineTab ? (
          <div className="lib-state empty-state">
            <h3>提示词库暂时拉取失败</h3>
            <p>不是没有内容，是这次没连上。已为你保留内置词库，可点击重试拉取最新。</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setLoadState("loading");
                fetchPromptLibrary()
                  .then((fetched) => {
                    if (fetched.length > 0) {
                      setItems(fetched);
                    }
                    setLoadState("ready");
                  })
                  .catch(() => setLoadState("error"));
              }}
            >
              重试
            </button>
          </div>
        ) : showEmpty && isMineTab ? (
          <div className="lib-state empty-state">
            <h3>还没有收藏的提示词</h3>
            <p>在提示词卡片右上角点 ☆ 收藏，收藏会保存到这台设备。</p>
            <button type="button" className="btn" onClick={() => setActiveTab("全部")}>
              去逛提示词库
            </button>
          </div>
        ) : showEmpty ? (
          <div className="lib-state empty-state">
            <h3>没有匹配的提示词</h3>
            <p>换个关键词或分类试试。</p>
            {search ? (
              <button type="button" className="btn" onClick={() => setSearch("")}>
                清除搜索
              </button>
            ) : null}
          </div>
        ) : (
          <div className="cards-grid">
            {visibleItems.map((item, index) => {
              const faved = favoriteSet.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="prompt-lib-card"
                  onClick={() => applyPrompt(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={displayTitle(item)}
                    loading={getPromptLibraryImageLoading(index)}
                    decoding="async"
                  />
                  <span
                    className={`card-fav${faved ? " faved" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={faved ? "取消收藏" : "收藏"}
                    aria-pressed={faved}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleFavorite(item.id);
                      }
                    }}
                  >
                    {faved ? "★" : "☆"}
                  </span>
                  <span className="t">{displayTitle(item)}</span>
                  <span className="m">
                    #{item.caseNumber} · {item.category}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
