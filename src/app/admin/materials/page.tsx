"use client";

import { useState } from "react";
import { PageShell } from "../_components/PageShell";
import { Drawer } from "../_components/Drawer";
import { adminAction, Empty, ErrorState, Loading, useAdminData } from "../_components/ui";
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

export default function MaterialsPage() {
  const [filter, setFilter] = useState<string>(""); // "" = 全部, "__hidden__" = 已隐藏, else category
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const q = new URLSearchParams();
  if (filter === "__hidden__") {
    q.set("status", "hidden");
  } else if (filter) {
    q.set("category", filter);
  }
  const { data, loading, error, reload } = useAdminData<MaterialsData>(`/api/admin/materials?${q.toString()}`);

  const openNew = () => { setSaveError(null); setEditor({ ...EMPTY_EDITOR }); };
  const openEdit = (m: MaterialRow) => {
    setSaveError(null);
    setEditor({ id: m.id, title: m.title, category: m.category, prompt: m.prompt, imageUrl: m.imageUrl, sortOrder: m.sortOrder });
  };

  const toggleHidden = async (m: MaterialRow) => {
    const next = m.status === "hidden" ? "active" : "hidden";
    const res = await fetch(`/api/admin/materials/${m.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next })
    });
    if (res.ok) reload();
  };

  const remove = async (m: MaterialRow) => {
    if (!window.confirm(`确认删除素材「${m.title}」？此操作不可撤销。`)) return;
    const res = await fetch(`/api/admin/materials/${m.id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) reload();
  };

  const save = async () => {
    if (!editor) return;
    if (!editor.title.trim()) { setSaveError("标题不能为空"); return; }
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
      setEditor(null);
      reload();
    } else {
      setSaveError(errMsg || "保存失败");
    }
  };

  return (
    <PageShell
      title="素材库管理"
      crumb="内容运营 / 素材库"
      actions={<button className="ad-btn primary" onClick={openNew}>上传素材</button>}
    >
      <div className="ad-note-strip">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
        素材库改动即时对前台生效（前台读取 /api/materials）。
      </div>

      <div className="ad-filters">
        <button className={`ad-chip${filter === "" ? " on" : ""}`} onClick={() => setFilter("")}>全部</button>
        {(data?.categories || []).map((c) => (
          <button key={c} className={`ad-chip${filter === c ? " on" : ""}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
        <div className="ad-spacer" />
        <button className={`ad-chip${filter === "__hidden__" ? " on" : ""}`} onClick={() => setFilter("__hidden__")}>已隐藏</button>
      </div>

      <div className="ad-panel">
        <div className="ad-panel-body">
          {loading ? <Loading /> : null}
          {error ? <ErrorState message={error} /> : null}
          {data && !loading ? (
            data.rows.length === 0 ? <Empty message="暂无素材，点击「上传素材」新增" /> : (
              <div className="ad-mat-grid">
                {data.rows.map((m) => (
                  <div key={m.id} className={`ad-mat-card${m.status === "hidden" ? " ad-mat-hidden" : ""}`}>
                    <div
                      className="ad-mat-thumb"
                      style={{
                        backgroundImage: m.imageUrl ? `url(${m.imageUrl})` : undefined,
                        background: m.imageUrl ? undefined : "linear-gradient(135deg,#5B61E8,#8B4FE0)"
                      }}
                    >
                      <span className="order">#{m.sortOrder}</span>
                      {!m.imageUrl ? <span>{m.title}</span> : null}
                    </div>
                    <div className="ad-mat-body">
                      <div className="mt">{m.title}</div>
                      <div className="mc">{m.category || "未分类"}{m.status === "hidden" ? "（已隐藏）" : ""}</div>
                    </div>
                    <div className="ad-mat-actions">
                      <button className="ad-btn sm" onClick={() => openEdit(m)}>编辑</button>
                      <button className="ad-btn sm" onClick={() => toggleHidden(m)}>{m.status === "hidden" ? "恢复" : "隐藏"}</button>
                      <button className="ad-btn danger sm" onClick={() => remove(m)}>删除</button>
                    </div>
                  </div>
                ))}
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
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="ad-sub">标题</span>
              <input className="ad-btn" style={{ cursor: "text", textAlign: "left" }} value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} placeholder="素材标题" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="ad-sub">分类</span>
              <input className="ad-btn" style={{ cursor: "text", textAlign: "left" }} value={editor.category} onChange={(e) => setEditor({ ...editor, category: e.target.value })} placeholder="如：人像写真 / 产品电商" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="ad-sub">提示词</span>
              <textarea className="ad-btn" style={{ cursor: "text", textAlign: "left", resize: "vertical", fontFamily: "inherit" }} rows={5} value={editor.prompt} onChange={(e) => setEditor({ ...editor, prompt: e.target.value })} placeholder="填写生成该素材的提示词" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="ad-sub">图片URL</span>
              <input className="ad-btn" style={{ cursor: "text", textAlign: "left" }} value={editor.imageUrl} onChange={(e) => setEditor({ ...editor, imageUrl: e.target.value })} placeholder="https://..." />
              <span className="ad-sub">可粘贴已托管的图片/S3公开URL；直传上传为后续增强</span>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="ad-sub">排序值</span>
              <input
                className="ad-btn"
                style={{ cursor: "text", textAlign: "left" }}
                type="number"
                value={editor.sortOrder}
                onChange={(e) => setEditor({ ...editor, sortOrder: Number(e.target.value) || 0 })}
              />
            </label>

            {saveError ? <div className="ad-empty">保存失败：{saveError}</div> : null}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="ad-btn primary" style={{ flex: 1 }} disabled={saving} onClick={save}>{saving ? "保存中…" : "保存"}</button>
              <button className="ad-btn ghost" disabled={saving} onClick={() => setEditor(null)}>取消</button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </PageShell>
  );
}
