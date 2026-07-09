import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { getOverview } from "@/server/admin/queries/overview";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return jsonOk(await getOverview());
  } catch (error) {
    return jsonError(error);
  }
}
