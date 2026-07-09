"use client";

import { useEffect, useState } from "react";
import { PageShell } from "../_components/PageShell";
import { ErrorState, Kpi, Loading, useAdminData, useConfirm, useToast } from "../_components/ui";

type RetentionSettings = { referenceDays: number | null; resultDays: number | null };
type RetentionClassReport = { retentionDays: number | null; candidates: number; deletable: number; bytes: number };
type RetentionReport = {
  dryRun: boolean;
  enabled: boolean;
  reference: RetentionClassReport;
  result: RetentionClassReport;
  deletedObjects: number;
  deletedRows: number;
};

function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

// Empty string / "0" means "disabled" (never delete).
function toDays(input: string): number | null {
  const n = Number.parseInt(input.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function SettingsPage() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { data, loading, error, reload } = useAdminData<{ settings: RetentionSettings }>("/api/admin/settings");

  const [refDays, setRefDays] = useState("");
  const [resDays, setResDays] = useState("");
  const [preview, setPreview] = useState<RetentionReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      setRefDays(data.settings.referenceDays ? String(data.settings.referenceDays) : "");
      setResDays(data.settings.resultDays ? String(data.settings.resultDays) : "");
    }
  }, [data]);

  async function runPreview() {
    setBusy(true);
    try {
      const qs = new URLSearchParams({
        referenceDays: String(toDays(refDays) ?? 0),
        resultDays: String(toDays(resDays) ?? 0)
      });
      const res = await fetch(`/api/admin/settings/preview?${qs}`, { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || `预览失败 (${res.status})`);
      setPreview(body.report as RetentionReport);
    } catch (err) {
      toast(err instanceof Error ? err.message : "预览失败", { err: true });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ referenceDays: toDays(refDays), resultDays: toDays(resDays) })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error?.message || `保存失败 (${res.status})`);
      toast("保留策略已保存");
      reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "保存失败", { err: true });
    } finally {
      setBusy(false);
    }
  }

  function runNow() {
    const total = preview ? preview.reference.deletable + preview.result.deletable : null;
    confirm({
      title: "立即执行清理？",
      desc: "将按当前已保存的保留天数,删除超期的参考图 / 生成图对象及其数据库记录。",
      impact:
        (total != null ? `预计删除约 ${total} 个对象。` : "") +
        "此操作不可撤销,素材库与在用分享不受影响。",
      impactTone: "crit",
      confirmLabel: "执行清理",
      onConfirm: async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/admin/settings/run", { method: "POST", credentials: "include" });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body?.error?.message || `执行失败 (${res.status})`);
          const r = body.report as RetentionReport;
          toast(`清理完成:删除 ${r.deletedObjects} 个对象 / ${r.deletedRows} 条记录`);
          setPreview(null);
        } catch (err) {
          toast(err instanceof Error ? err.message : "执行失败", { err: true });
        } finally {
          setBusy(false);
        }
      }
    });
  }

  return (
    <PageShell title="存储与清理" crumb="系统设置 / 资产保留策略">
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="ad-card" style={{ padding: 20, maxWidth: 720 }}>
          <p style={{ color: "var(--ad-fg-dim)", marginTop: 0, lineHeight: 1.7 }}>
            设置用户 <b>参考图</b> 与 <b>生成图</b> 超过多少天后自动删除(留空或 0 = 永不删除)。
            清理每天在后台自动执行,并保护素材库与仍被分享引用的图片。改动天数后请先「预览」确认数量级。
          </p>

          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", margin: "18px 0" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>参考图保留天数</span>
              <input
                className="ad-input"
                type="number"
                min={0}
                placeholder="留空=永不删"
                value={refDays}
                onChange={(e) => setRefDays(e.target.value)}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>生成图保留天数</span>
              <input
                className="ad-input"
                type="number"
                min={0}
                placeholder="留空=永不删"
                value={resDays}
                onChange={(e) => setResDays(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="ad-btn sm ghost" onClick={runPreview} disabled={busy}>
              预览将删除
            </button>
            <button className="ad-btn sm" onClick={save} disabled={busy}>
              保存策略
            </button>
            <button className="ad-btn sm danger" onClick={runNow} disabled={busy}>
              立即执行清理
            </button>
          </div>

          {preview ? (
            <div style={{ marginTop: 22 }}>
              <div className="ad-kpi-row" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2,1fr)" }}>
                <Kpi
                  label={`参考图 (${preview.reference.retentionDays ?? "禁用"}天)`}
                  value={preview.reference.deletable}
                  unit={`个 · ${fmtBytes(preview.reference.bytes)}`}
                />
                <Kpi
                  label={`生成图 (${preview.result.retentionDays ?? "禁用"}天)`}
                  value={preview.result.deletable}
                  unit={`个 · ${fmtBytes(preview.result.bytes)}`}
                />
              </div>
              <p style={{ color: "var(--ad-fg-dim)", fontSize: 13, marginTop: 10 }}>
                预览为试算,未删除任何数据。「立即执行清理」按<b>已保存</b>的策略执行,请先保存再执行。
              </p>
            </div>
          ) : null}
        </div>
      )}
      {dialog}
    </PageShell>
  );
}
