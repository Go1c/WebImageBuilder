"use client";

import { useEffect, useState } from "react";
import { PageShell } from "../_components/PageShell";
import { Drawer } from "../_components/Drawer";
import {
  Empty,
  ErrorState,
  Loading,
  Pill,
  adminAction,
  useAdminData,
  useConfirm,
  useToast,
  ANNOUNCE_STATUS_LABELS,
  type PillTone
} from "../_components/ui";
import { fmtDate } from "../_components/format";
import type { AnnouncementRow } from "@/server/admin/queries/announcements";

const PLACEMENT_LABEL: Record<string, string> = {
  home_banner: "首页Banner",
  home_notice: "首页公告条",
  login_banner: "登录页Banner",
  global_modal: "全站弹窗"
};

const STATUS_META: Record<string, { tone: PillTone; label: string }> = {
  active: { tone: "good", label: "生效中" },
  draft: { tone: "warn", label: "草稿" },
  ended: { tone: "neutral", label: "已结束" }
};

const STATE_ORDER = ["draft", "active", "ended"] as const;

type EditorState = Partial<AnnouncementRow> | null;

function toDatePart(iso: string | null): string {
  const d = fmtDate(iso);
  return d === "—" ? "—" : d.split(" ")[0];
}

export default function AnnouncementsPage() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { data, loading, error, reload } = useAdminData<{ rows: AnnouncementRow[] }>("/api/admin/announcements");
  const [editor, setEditor] = useState<EditorState>(null);

  function handleDelete(id: string, title: string) {
    confirm({
      title: "删除该公告？",
      desc: `确认删除公告「${title}」？此操作不可撤销。`,
      impact: "删除后前台立即不再展示该公告。",
      impactTone: "crit",
      confirmLabel: "删除",
      onConfirm: async () => {
        const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE", credentials: "include" });
        if (res.ok) {
          toast("公告已删除", { sub: id });
          reload();
        } else {
          toast("删除失败", { err: true });
        }
      }
    });
  }

  return (
    <PageShell
      title="公告运营"
      crumb="内容运营 / 公告运营"
      actions={<button className="ad-btn primary" onClick={() => setEditor({})}>新建公告</button>}
    >
      <div className="ad-section-head">
        <div className="lead">
          <h2>公告运营</h2>
          <p>管理站内各展示位的公告与活动通知，控制生效时间与上下线状态。</p>
        </div>
      </div>

      <div className="ad-panel">
        {loading ? <Loading /> : null}
        {error ? <ErrorState message={error} onRetry={reload} /> : null}
        {data && !loading ? (
          data.rows.length === 0 ? <Empty message="暂无公告" /> : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr><th>标题</th><th>位置</th><th>状态</th><th>生效时间</th><th>操作</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((a) => {
                    const meta = STATUS_META[a.status] || { tone: "neutral" as PillTone, label: a.status };
                    return (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.title}</td>
                        <td className="ad-sub">{PLACEMENT_LABEL[a.placement] || a.placement}</td>
                        <td><Pill tone={meta.tone}>{meta.label}</Pill></td>
                        <td className="ad-tnum ad-sub">{toDatePart(a.startsAt)} ~ {toDatePart(a.endsAt)}</td>
                        <td>
                          <div className="ad-row-flex" style={{ gap: 6 }}>
                            <button className="ad-btn sm" onClick={() => setEditor(a)}>编辑</button>
                            <button className="ad-btn danger sm" onClick={() => handleDelete(a.id, a.title)}>删除</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>

      <AnnouncementEditor
        state={editor}
        onClose={() => setEditor(null)}
        onSaved={(created) => { setEditor(null); reload(); toast(created ? "公告已创建" : "公告已保存"); }}
      />
      {dialog}
    </PageShell>
  );
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string | null {
  if (!local) {
    return null;
  }
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function AnnouncementEditor({
  state,
  onClose,
  onSaved
}: {
  state: EditorState;
  onClose: () => void;
  onSaved: (created: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [placement, setPlacement] = useState("home_notice");
  const [status, setStatus] = useState("draft");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const editingId = state?.id;

  useEffect(() => {
    if (!state) {
      return;
    }
    setTitle(state.title || "");
    setBody(state.body || "");
    setPlacement(state.placement || "home_notice");
    setStatus(state.status || "draft");
    setStartsAt(toLocalInput(state.startsAt));
    setEndsAt(toLocalInput(state.endsAt));
    setFormError(null);
  }, [state]);

  // end must be strictly after start when both provided
  const timeInvalid =
    !!startsAt && !!endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime();

  async function handleSave() {
    if (!title.trim()) {
      setFormError("标题不能为空");
      return;
    }
    if (timeInvalid) {
      setFormError("生效结束时间必须晚于开始时间");
      return;
    }
    setSaving(true);
    setFormError(null);

    const payload = {
      title: title.trim(),
      body,
      placement,
      status,
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt)
    };

    let ok = false;
    let errMsg: string | undefined;
    if (editingId) {
      const res = await fetch(`/api/admin/announcements/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      ok = res.ok;
      errMsg = data?.error?.message;
    } else {
      const result = await adminAction("/api/admin/announcements", payload);
      ok = result.ok;
      errMsg = result.error;
    }

    setSaving(false);
    if (ok) {
      onSaved(!editingId);
    } else {
      setFormError(errMsg || "保存失败");
    }
  }

  return (
    <Drawer
      open={!!state}
      title={editingId ? "编辑公告" : "新建公告"}
      sub={editingId ? `announcements / ${editingId}` : "创建新的站内公告"}
      onClose={onClose}
    >
      {state ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 状态机条 */}
          <div className="adx-statemachine">
            {STATE_ORDER.map((s, i) => (
              <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span className={`st${status === s ? " on" : ""}`}>{ANNOUNCE_STATUS_LABELS[s]}</span>
                {i < STATE_ORDER.length - 1 ? <span>→</span> : null}
              </span>
            ))}
          </div>

          <label>
            <span className="ad-sub">标题</span>
            <input className="ad-btn" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="公告标题" />
          </label>

          <label>
            <span className="ad-sub">内容</span>
            <textarea className="ad-btn" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="公告内容" />
          </label>

          {/* 前台预览：所见即所得（复用 .lumio-announce 横幅样式） */}
          <div className="adx-banner-preview">
            <div className="cap">前台预览</div>
            <div className="lumio-announce">
              <span className="tag">公告</span>
              <p>{title.trim() || "公告标题将在此处显示…"}</p>
              <span className="x">✕</span>
            </div>
          </div>

          <label>
            <span className="ad-sub">位置</span>
            <select className="ad-chip" value={placement} onChange={(e) => setPlacement(e.target.value)}>
              <option value="home_banner">首页Banner</option>
              <option value="home_notice">首页公告条</option>
              <option value="login_banner">登录页Banner</option>
              <option value="global_modal">全站弹窗</option>
            </select>
          </label>

          <label>
            <span className="ad-sub">状态</span>
            <select className="ad-chip" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">草稿</option>
              <option value="active">生效中</option>
              <option value="ended">已结束</option>
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <span className="ad-sub">生效开始</span>
              <input className="ad-btn" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </label>
            <label>
              <span className="ad-sub">生效结束</span>
              <input
                className="ad-btn"
                style={timeInvalid ? { borderColor: "var(--ad-crit)" } : undefined}
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
              {timeInvalid ? (
                <span className="ad-sub" style={{ color: "var(--ad-crit)" }}>结束时间必须晚于开始时间</span>
              ) : null}
            </label>
          </div>

          {formError ? <div className="ad-sub" style={{ color: "var(--ad-crit)" }}>{formError}</div> : null}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="ad-btn primary" style={{ flex: 1 }} disabled={saving || timeInvalid} onClick={handleSave}>
              {saving ? "保存中…" : "保存"}
            </button>
            <button className="ad-btn ghost" onClick={onClose}>取消</button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
