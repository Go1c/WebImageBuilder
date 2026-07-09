"use client";

import { useEffect, useState } from "react";
import { PageShell } from "../_components/PageShell";
import { Drawer } from "../_components/Drawer";
import {
  adminAction,
  EmptyState,
  ErrorState,
  Loading,
  useAdminData,
  useConfirm,
  useToast
} from "../_components/ui";
import type { MaterialRow } from "@/server/admin/queries/materials";

type MaterialsData = { rows: MaterialRow[]; categories: string[] };

type EditorState = {
  id: string | null;
  title: string;
  category: string;
  prompt: string;
  imageUrl: string;
  sortOrder: number;
};

const EMPTY_EDITOR: EditorState = { id: null, title: "", category: "", prompt: "", imageUrl: "", sortOrder: 0 };

/** Accept http(s) URLs (optionally data: for pasted previews). */
function isValidImageUrl(url: string): boolean {
  const v = url.trim();
  if (!v) return true; // empty is allowed (falls back to gradient placeholder)
  return /^https?:\/\/.+/i.test(v) || /^data:image\//i.test(v);
}

export default function MaterialsPage() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [filter, setFilter] = useState<string>(""); // "" = 全部, "__hidden__" = 已隐藏, else category
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState(false);

  // local ordering + drag state, seeded from server data
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const q = new URLSearchParams();
  if (filter === "__hidden__") {
    q.set("status", "hidden");
  } else if (filter) {
    q.set("category", filter);
  }
  const { data, loading, error, reload } = useAdminData<MaterialsData>(`/api/admin/materials?${q.toString()}`);

  useEffect(() => {
    if (data) setRows(data.rows);
  }, [data]);

  const openNew = () => { setSaveError(null); setUrlError(false); setEditor({ ...EMPTY_EDITOR }); };
  const openEdit = (m: MaterialRow) => {
    setSaveError(null);
    setUrlError(false);
    setEditor({ id: m.id, title: m.title, category: m.category, prompt: m.prompt, imageUrl: m.imageUrl, sortOrder: m.sortOrder });
  };

  const toggleHidden = (m: MaterialRow) => {
    const next = m.status === "hidden" ? "active" : "hidden";
    const doToggle = async () => {
      const res = await fetch(`/api/admin/materials/${m.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      if (res.ok) {
        // flip state in place — no page reload
        setRows((prev) => prev.map((r) => (r.id === m.id ? { ...r, status: next } : r)));
        toast(next === "hidden" ? "已隐藏,前台不可见" : "已恢复展示", { sub: m.id });
      } else {
        toast("操作失败", { err: true });
      }
    };
    if (next === "hidden") {
      confirm({
        title: "隐藏该素材？",
        desc: `「${m.title}」隐藏后前台立即不可见。`,
        impact: "改动即时对前台生效（前台读取 /api/materials）。",
        impactTone: "warn",
        confirmLabel: "隐藏",
        onConfirm: doToggle
      });
    } else {
      void doToggle();
    }
  };

  const remove = (m: MaterialRow) => {
    confirm({
      title: "删除该素材？",
      desc: `确认删除素材「${m.title}」？此操作不可撤销。`,
      impact: "删除后前台立即不再展示该素材,且无法恢复。",
      impactTone: "crit",
      confirmLabel: "删除",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/materials/${m.id}`, { method: "DELETE", credentials: "include" });
        if (res.ok) {
          setRows((prev) => prev.filter((r) => r.id !== m.id));
          toast("素材已删除", { sub: m.id });
        } else {
          toast("删除失败", { err: true });
        }
      }
    });
  };

  const save = async () => {
    if (!editor) return;
    if (!editor.title.trim()) { setSaveError("标题不能为空"); return; }
    if (!isValidImageUrl(editor.imageUrl)) { setUrlError(true); setSaveError("图片 URL 格式不正确"); return; }
    setSaving(true);
    setSaveError(null);
    const payload = {
      title: editor.title.trim(),
      category: editor.category.trim(),
      prompt: editor.prompt,
      imageUrl: editor.imageUrl.trim(),
      sortOrder: editor.sortOrder
    };

    let ok = false;
    let errMsg: string | undefined;
    if (editor.id) {
      const res = await fetch(`/api/admin/materials/${editor.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const bodyJson = await res.json().catch(() => ({}));
      ok = res.ok;
      errMsg = bodyJson?.error?.message;
    } else {
      const result = await adminAction("/api/admin/materials", payload);
      ok = result.ok;
      errMsg = result.error;
    }

    setSaving(false);
    if (ok) {
      toast(editor.id ? "素材已保存" : "素材已创建");
      setEditor(null);
      reload();
    } else {
      setSaveError(errMsg || "保存失败");
    }
  };

  // ---- drag to reorder ----
  const onDrop = async (targetId: string) => {
    setOverId(null);
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const from = rows.findIndex((r) => r.id === dragId);
    const to = rows.findIndex((r) => r.id === targetId);
    setDragId(null);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRows(next);
    const res = await adminAction("/api/admin/materials/reorder", { ids: next.map((r) => r.id) });
    if (res.ok) {
      toast("排序已保存");
    } else {
      toast("排序保存失败", { err: true });
      reload();
    }
  };

  const dragEnabled = filter === ""; // reordering only meaningful in unfiltered全部 view

  return (
    <PageShell
      title="素材库管理"
      crumb="内容运营 / 素材库"
      actions={<button className="ad-btn primary" onClick={openNew}>上传素材</button>}
    >
      <div className="ad-note-strip" style={{ background: "var(--ad-warn-soft)", borderColor: "#F0DCB2", color: "var(--ad-warn)" }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l9.5 16.5H2.5z" /><path d="M12 9.5v4M12 16.5v.3" /></svg>
        素材库改动即时对前台生效（前台读取 /api/materials）,请谨慎操作。
      </div>

      <div className="ad-filters">
        <button className={`ad-chip${filter === "" ? " on" : ""}`} onClick={() => setFilter("")}>全部</button>
        {(data?.categories || []).map((c) => (
          <button key={c} className={`ad-chip${filter === c ? " on" : ""}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
        <div className="ad-spacer" />
        {dragEnabled ? (
          <span className="adx-drag-hint">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" /></svg>
            拖拽卡片可调整前台展示顺序
          </span>
        ) : null}
        <button className={`ad-chip${filter === "__hidden__" ? " on" : ""}`} onClick={() => setFilter("__hidden__")}>已隐藏</button>
      </div>

      <div className="ad-panel">
        <div className="ad-panel-body">
          {loading ? <Loading /> : null}
          {error ? <ErrorState message={error} onRetry={reload} /> : null}
          {data && !loading ? (
            rows.length === 0 ? (
              <EmptyState title="暂无素材" desc="点击右上角「上传素材」新增" />
            ) : (
              <div className="ad-mat-grid">
                {rows.map((m) => {
                  const hidden = m.status === "hidden";
                  return (
                    <div
                      key={m.id}
                      className={`ad-mat-card${hidden ? " hidden-state" : ""}${dragId === m.id ? " dragging" : ""}${overId === m.id ? " drag-over" : ""}`}
                      draggable={dragEnabled}
                      onDragStart={() => dragEnabled && setDragId(m.id)}
                      onDragOver={(e) => { if (dragEnabled && dragId) { e.preventDefault(); setOverId(m.id); } }}
                      onDragLeave={() => overId === m.id && setOverId(null)}
                      onDrop={() => dragEnabled && onDrop(m.id)}
                      onDragEnd={() => { setDragId(null); setOverId(null); }}
                    >
                      <div
                        className="ad-mat-thumb"
                        style={{
                          backgroundImage: m.imageUrl ? `url(${m.imageUrl})` : undefined,
                          background: m.imageUrl ? undefined : "linear-gradient(135deg,#5B61E8,#8B4FE0)"
                        }}
                      >
                        <span className="order">#{m.sortOrder}</span>
                        {hidden ? <span className="adx-hidden-badge">已隐藏 · 前台不可见</span> : null}
                        {!m.imageUrl ? <span>{m.title}</span> : null}
                      </div>
                      <div className="ad-mat-body">
                        <div className="mt">{m.title}</div>
                        <div className="mc">{m.category || "未分类"}</div>
                      </div>
                      <div className="ad-mat-actions">
                        <button className="ad-btn sm" onClick={() => openEdit(m)}>编辑</button>
                        <button className="ad-btn sm" onClick={() => toggleHidden(m)}>{hidden ? "恢复" : "隐藏"}</button>
                        <button className="ad-btn danger sm" onClick={() => remove(m)}>删除</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : null}
        </div>
      </div>

      <Drawer
        open={!!editor}
        title={editor?.id ? "编辑素材" : "上传素材"}
        sub={editor?.id ? `material_items / ${editor.id}` : "新增素材"}
        onClose={() => setEditor(null)}
      >
        {editor ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label>
              <span className="ad-sub">标题</span>
              <input className="ad-btn" value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} placeholder="素材标题" />
            </label>
            <label>
              <span className="ad-sub">分类</span>
              <input className="ad-btn" value={editor.category} onChange={(e) => setEditor({ ...editor, category: e.target.value })} placeholder="如：人像写真 / 产品电商" />
            </label>
            <label>
              <span className="ad-sub">提示词</span>
              <textarea className="ad-btn" rows={5} value={editor.prompt} onChange={(e) => setEditor({ ...editor, prompt: e.target.value })} placeholder="填写生成该素材的提示词" />
            </label>
            <label>
              <span className="ad-sub">图片URL</span>
              <input
                className="ad-btn"
                style={urlError ? { borderColor: "var(--ad-crit)" } : undefined}
                value={editor.imageUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditor({ ...editor, imageUrl: v });
                  setUrlError(!isValidImageUrl(v));
                }}
                placeholder="https://..."
              />
              {urlError ? (
                <span className="ad-sub" style={{ color: "var(--ad-crit)" }}>请填写 http(s):// 开头的有效图片链接</span>
              ) : (
                <span className="ad-sub">可粘贴已托管的图片/S3公开URL；直传上传为后续增强</span>
              )}
            </label>

            {/* 实时预览：不画假上传,仅按当前 URL 渲染 */}
            <div>
              <span className="ad-sub">实时预览</span>
              <div
                style={{
                  height: 150,
                  marginTop: 6,
                  borderRadius: 10,
                  border: "1px solid var(--ad-border)",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(255,255,255,.9)",
                  fontSize: 12,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundImage: editor.imageUrl && isValidImageUrl(editor.imageUrl) && editor.imageUrl.trim() ? `url(${editor.imageUrl.trim()})` : undefined,
                  background: editor.imageUrl && isValidImageUrl(editor.imageUrl) && editor.imageUrl.trim() ? undefined : "var(--ad-ground)"
                }}
              >
                {!editor.imageUrl.trim() ? <span className="ad-sub">填写 URL 后可预览</span> : null}
              </div>
            </div>

            <label>
              <span className="ad-sub">排序值</span>
              <input
                className="ad-btn"
                type="number"
                value={editor.sortOrder}
                onChange={(e) => setEditor({ ...editor, sortOrder: Number(e.target.value) || 0 })}
              />
            </label>

            {saveError ? <div className="ad-sub" style={{ color: "var(--ad-crit)" }}>{saveError}</div> : null}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="ad-btn primary" style={{ flex: 1 }} disabled={saving} onClick={save}>{saving ? "保存中…" : "保存"}</button>
              <button className="ad-btn ghost" disabled={saving} onClick={() => setEditor(null)}>取消</button>
            </div>
          </div>
        ) : null}
      </Drawer>

      {dialog}
    </PageShell>
  );
}
