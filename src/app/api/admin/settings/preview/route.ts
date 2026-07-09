import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { parseRetentionDays } from "@/server/maintenance/retention-policy";
import { runRetentionCleanup } from "@/server/maintenance/retention-runner";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dry-run preview of the retention cleanup. Deletes nothing. Accepts optional
 * ?referenceDays=&resultDays= to preview values the admin has typed but not yet
 * saved; without them it previews the currently saved policy.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const refParam = url.searchParams.get("referenceDays");
    const resParam = url.searchParams.get("resultDays");

    const settings =
      refParam !== null || resParam !== null
        ? { referenceDays: parseRetentionDays(refParam), resultDays: parseRetentionDays(resParam) }
        : undefined;

    const report = await runRetentionCleanup({ dryRun: true, settings });
    return jsonOk({ report });
  } catch (error) {
    return jsonError(error);
  }
}
