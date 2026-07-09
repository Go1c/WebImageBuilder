import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { listUsers } from "@/server/admin/queries/users";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const data = await listUsers({
      search: searchParams.get("search") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: Number(searchParams.get("page") || "1")
    });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
