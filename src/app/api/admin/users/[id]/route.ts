import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { getUserDetail } from "@/server/admin/queries/users";
import { ApiError, jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const detail = await getUserDetail(id);
    if (!detail) {
      throw new ApiError(404, "not_found", "用户不存在");
    }
    return jsonOk(detail);
  } catch (error) {
    return jsonError(error);
  }
}
