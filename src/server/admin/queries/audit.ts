import { adminQuery, isLocalPreview } from "../db";

export type AuditCategory = "all" | "material" | "share" | "safety" | "announcement";

export type AuditRow = {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

const MOCK: AuditRow[] = [
  {
    id: "au_01",
    adminEmail: "admin@lumio.games",
    action: "share.takedown",
    targetType: "share",
    targetId: "wD4jM8",
    detail: { note: "举报数达6，违规下架" },
    createdAt: new Date(Date.now() - 10 * 60000).toISOString()
  },
  {
    id: "au_02",
    adminEmail: "admin@lumio.games",
    action: "material.update",
    targetType: "material",
    targetId: "#3",
    detail: { note: "更新提示词与排序" },
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "au_03",
    adminEmail: "admin@lumio.games",
    action: "safety.term.add",
    targetType: "term",
    targetId: "赌博",
    detail: { note: "添加违禁词" },
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString()
  },
  {
    id: "au_04",
    adminEmail: "admin@lumio.games",
    action: "announcement.create",
    targetType: "announce",
    targetId: "夏季大赛",
    detail: { note: "新建公告" },
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString()
  },
  {
    id: "au_05",
    adminEmail: "admin@lumio.games",
    action: "material.hide",
    targetType: "material",
    targetId: "#11",
    detail: { note: "隐藏素材" },
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString()
  }
];

export async function listAudit(params: { category?: AuditCategory }): Promise<AuditRow[]> {
  const category = params.category || "all";

  if (isLocalPreview()) {
    if (category === "all") {
      return MOCK;
    }
    return MOCK.filter((r) => r.action.startsWith(`${category}.`));
  }

  const args: unknown[] = [];
  const conditions: string[] = [];
  if (category !== "all") {
    args.push(`${category}.%`);
    conditions.push(`action like $${args.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const result = await adminQuery<{
    id: string;
    admin_email: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    detail: Record<string, unknown> | null;
    created_at: string;
  }>(
    `
      select id, admin_email, action, target_type, target_id, detail, created_at
      from admin_audit_logs
      ${where}
      order by created_at desc
      limit 100
    `,
    args
  );

  return result.rows.map((r) => ({
    id: r.id,
    adminEmail: r.admin_email,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    detail: r.detail,
    createdAt: r.created_at
  }));
}
