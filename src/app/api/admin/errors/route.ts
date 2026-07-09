import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { listErrors } from "@/server/admin/queries/errors";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const data = await listErrors({
      type: searchParams.get("type") || undefined,
      model: searchParams.get("model") || undefined,
      search: searchParams.get("search") || undefined,
      hours: Number(searchParams.get("hours") || "24")
    });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
