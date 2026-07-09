import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import { addBlockedTerm, listBlockedTerms } from "@/server/admin/queries/safety";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const rows = await listBlockedTerms(searchParams.get("search") || undefined);
    return jsonOk({ rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { term?: string; category?: string; action?: string };
    const term = (body.term || "").trim();
    if (!term) {
      throw new ApiError(400, "bad_request", "违禁词不能为空");
    }
    const action = body.action === "block" ? "block" : "flag";
    const category = (body.category || "").trim();
    await addBlockedTerm({ term, category, action, createdBy: admin.email });
    await writeAuditLog({
      adminEmail: admin.email,
      action: "safety.term.add",
      targetType: "blocked_term",
      targetId: term,
      detail: { category, action }
    });
    return jsonOk({ ok: true, term });
  } catch (error) {
    return jsonError(error);
  }
}
