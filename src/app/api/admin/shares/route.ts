import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { listShareRanking, listShares } from "@/server/admin/queries/shares";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);

    if (searchParams.get("view") === "rank") {
      return jsonOk({ rows: await listShareRanking() });
    }

    const data = await listShares({
      status: searchParams.get("status") || undefined,
      days: searchParams.get("days") !== null ? Number(searchParams.get("days")) : undefined
    });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
