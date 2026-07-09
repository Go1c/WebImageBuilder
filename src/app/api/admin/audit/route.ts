import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { listAudit, type AuditCategory } from "@/server/admin/queries/audit";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES: AuditCategory[] = ["all", "material", "share", "safety", "announcement"];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("category");
    const category = CATEGORIES.includes(raw as AuditCategory) ? (raw as AuditCategory) : "all";
    const rows = await listAudit({ category });
    return jsonOk({ rows });
  } catch (error) {
    return jsonError(error);
  }
}
