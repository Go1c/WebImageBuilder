import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import { takedownShare } from "@/server/admin/queries/shares";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const ok = await takedownShare(id);
    if (!ok) {
      throw new ApiError(404, "not_found", "分享不存在");
    }
    await writeAuditLog({ adminEmail: admin.email, action: "share.takedown", targetType: "share", targetId: id });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
