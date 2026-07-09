import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import { deleteMaterial, updateMaterial, type MaterialPatch } from "@/server/admin/queries/materials";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const patch: MaterialPatch = {};
    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.category === "string") patch.category = body.category.trim();
    if (typeof body.prompt === "string") patch.prompt = body.prompt;
    if (typeof body.imageUrl === "string") patch.imageUrl = body.imageUrl.trim();
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) patch.sortOrder = Math.trunc(body.sortOrder);
    if (body.status === "active" || body.status === "hidden") patch.status = body.status;

    const ok = await updateMaterial(id, patch);
    if (!ok) {
      throw new ApiError(404, "not_found", "素材不存在或无改动");
    }

    await writeAuditLog({ adminEmail: admin.email, action: "material.update", targetType: "material", targetId: id, detail: patch });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    const ok = await deleteMaterial(id);
    if (!ok) {
      throw new ApiError(404, "not_found", "素材不存在");
    }

    await writeAuditLog({ adminEmail: admin.email, action: "material.delete", targetType: "material", targetId: id });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
