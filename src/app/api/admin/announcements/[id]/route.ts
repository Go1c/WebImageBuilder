import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import {
  deleteAnnouncement,
  updateAnnouncement,
  type AnnouncementInput
} from "@/server/admin/queries/announcements";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const patch: Partial<AnnouncementInput> = {};
    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) {
        throw new ApiError(400, "bad_request", "标题不能为空");
      }
      patch.title = title;
    }
    if (typeof body.body === "string") patch.body = body.body;
    if (typeof body.placement === "string") patch.placement = body.placement;
    if (typeof body.status === "string") patch.status = body.status;
    if ("startsAt" in body) patch.startsAt = typeof body.startsAt === "string" && body.startsAt ? body.startsAt : null;
    if ("endsAt" in body) patch.endsAt = typeof body.endsAt === "string" && body.endsAt ? body.endsAt : null;

    const ok = await updateAnnouncement(id, patch);
    if (!ok) {
      throw new ApiError(404, "not_found", "公告不存在或无更新字段");
    }

    await writeAuditLog({
      adminEmail: admin.email,
      action: "announcement.update",
      targetType: "announcement",
      targetId: id,
      detail: patch
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    const ok = await deleteAnnouncement(id);
    if (!ok) {
      throw new ApiError(404, "not_found", "公告不存在");
    }

    await writeAuditLog({
      adminEmail: admin.email,
      action: "announcement.delete",
      targetType: "announcement",
      targetId: id
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
