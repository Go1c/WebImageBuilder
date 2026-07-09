import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { listReviewQueue } from "@/server/admin/queries/safety";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const rows = await listReviewQueue();
    return jsonOk({ rows });
  } catch (error) {
    return jsonError(error);
  }
}
