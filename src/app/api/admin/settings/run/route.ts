import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { runRetentionCleanup } from "@/server/maintenance/retention-runner";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Run the retention cleanup immediately with the currently saved policy. Real
 * deletion — audited inside the runner with the triggering admin's email.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const report = await runRetentionCleanup({ dryRun: false, actorEmail: admin.email });
    return jsonOk({ report });
  } catch (error) {
    return jsonError(error);
  }
}
