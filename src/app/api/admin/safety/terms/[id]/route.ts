import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import { deleteBlockedTerm } from "@/server/admin/queries/safety";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const ok = await deleteBlockedTerm(id);
    if (!ok) {
      throw new ApiError(404, "not_found", "违禁词不存在");
    }
    await writeAuditLog({
      adminEmail: admin.email,
      action: "safety.term.delete",
      targetType: "blocked_term",
      targetId: id
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
