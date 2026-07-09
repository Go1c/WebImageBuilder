import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import { reorderMaterials } from "@/server/admin/queries/materials";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
    if (ids.length === 0) {
      throw new ApiError(400, "bad_request", "缺少排序列表");
    }

    await reorderMaterials(ids);
    await writeAuditLog({ adminEmail: admin.email, action: "material.reorder", targetType: "material", detail: { ids } });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
