import type { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/auth";
import { writeAuditLog } from "@/server/admin/db";
import { getRetentionSettings, setRetentionSettings } from "@/server/admin/queries/settings";
import { parseRetentionDays } from "@/server/maintenance/retention-policy";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const settings = await getRetentionSettings();
    return jsonOk({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const referenceDays = parseRetentionDays(body.referenceDays);
    const resultDays = parseRetentionDays(body.resultDays);

    await setRetentionSettings({ referenceDays, resultDays }, admin.email);
    await writeAuditLog({
      adminEmail: admin.email,
      action: "retention.settings.update",
      targetType: "app_settings",
      detail: { referenceDays, resultDays }
    });

    return jsonOk({ settings: { referenceDays, resultDays } });
  } catch (error) {
    return jsonError(error);
  }
}
