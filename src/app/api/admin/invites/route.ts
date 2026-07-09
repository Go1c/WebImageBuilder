import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { getInviteStats, listInvites } from "@/server/admin/queries/invites";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const [stats, rows] = await Promise.all([getInviteStats(), listInvites({ status })]);
    return jsonOk({ stats, rows });
  } catch (error) {
    return jsonError(error);
  }
}
