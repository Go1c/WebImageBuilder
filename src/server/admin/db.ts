import { getAppConfig } from "../config";
import { query } from "../db/client";

/**
 * True when running without a real database (LUMIO_LOCAL_MODE). Admin queries
 * return seeded mock data in this mode so the backend UI can be previewed
 * offline. Mirrors shouldUseLocalRepository() in db/repositories.
 */
export function isLocalPreview(): boolean {
  const config = getAppConfig();
  return config.localMode && !config.databaseUrl;
}

export { query as adminQuery };

export async function writeAuditLog(input: {
  adminEmail: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: unknown;
}): Promise<void> {
  if (isLocalPreview()) {
    return;
  }
  await query(
    `
      insert into admin_audit_logs (admin_email, action, target_type, target_id, detail)
      values ($1, $2, $3, $4, $5)
    `,
    [
      input.adminEmail,
      input.action,
      input.targetType ?? null,
      input.targetId ?? null,
      JSON.stringify(input.detail ?? {})
    ]
  );
}
