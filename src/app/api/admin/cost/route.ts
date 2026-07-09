import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { getCostDashboard } from "@/server/admin/queries/cost";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const data = await getCostDashboard({
      days: Number(searchParams.get("days") || "30")
    });
    return jsonOk(data);
  } catch (error) {
    return jsonError(error);
  }
}
