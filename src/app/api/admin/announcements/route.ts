import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import { createAnnouncement, listAnnouncements } from "@/server/admin/queries/announcements";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const rows = await listAnnouncements();
    return jsonOk({ rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      throw new ApiError(400, "bad_request", "标题不能为空");
    }

    const id = await createAnnouncement({
      title,
      body: typeof body.body === "string" ? body.body : "",
      placement: typeof body.placement === "string" ? body.placement : "home_notice",
      status: typeof body.status === "string" ? body.status : "draft",
      startsAt: typeof body.startsAt === "string" && body.startsAt ? body.startsAt : null,
      endsAt: typeof body.endsAt === "string" && body.endsAt ? body.endsAt : null
    });

    await writeAuditLog({
      adminEmail: admin.email,
      action: "announcement.create",
      targetType: "announcement",
      targetId: id,
      detail: { title }
    });

    return jsonOk({ id });
  } catch (error) {
    return jsonError(error);
  }
}
