import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import { createMaterial, listCategories, listMaterials } from "@/server/admin/queries/materials";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status = statusParam === "active" || statusParam === "hidden" ? statusParam : "all";
    const [rows, categories] = await Promise.all([
      listMaterials({ category: searchParams.get("category") || undefined, status }),
      listCategories()
    ]);
    return jsonOk({ rows, categories });
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
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

    const id = await createMaterial({
      title,
      category: typeof body.category === "string" ? body.category.trim() : "",
      prompt: typeof body.prompt === "string" ? body.prompt : "",
      imageUrl,
      storageKey: typeof body.storageKey === "string" ? body.storageKey : null,
      mimeType: typeof body.mimeType === "string" ? body.mimeType : null,
      createdBy: admin.email
    });

    await writeAuditLog({ adminEmail: admin.email, action: "material.create", targetType: "material", targetId: id, detail: { title } });
    return jsonOk({ id });
  } catch (error) {
    return jsonError(error);
  }
}
