import { adminQuery, isLocalPreview } from "../db";
import { parseRetentionDays, type RetentionSettings } from "../../maintenance/retention-policy";

export const REFERENCE_RETENTION_KEY = "reference_retention_days";
export const RESULT_RETENTION_KEY = "result_retention_days";

/**
 * Read the asset retention policy from app_settings. Missing / disabled values
 * come back as null. In local preview (no DB) the policy is disabled so the
 * offline backend never implies deletion.
 */
export async function getRetentionSettings(): Promise<RetentionSettings> {
  if (isLocalPreview()) {
    return { referenceDays: null, resultDays: null };
  }
  const result = await adminQuery<{ key: string; value: string }>(
    `select key, value from app_settings where key = any($1)`,
    [[REFERENCE_RETENTION_KEY, RESULT_RETENTION_KEY]]
  );
  const map = new Map(result.rows.map((row) => [row.key, row.value]));
  return {
    referenceDays: parseRetentionDays(map.get(REFERENCE_RETENTION_KEY)),
    resultDays: parseRetentionDays(map.get(RESULT_RETENTION_KEY))
  };
}

/**
 * Persist retention days. null (or 0) stores "0" = disabled. Values are clamped
 * to non-negative integers before writing.
 */
export async function setRetentionSettings(
  input: { referenceDays: number | null; resultDays: number | null },
  updatedBy: string
): Promise<void> {
  if (isLocalPreview()) {
    return;
  }
  const toStored = (value: number | null): string => {
    const parsed = parseRetentionDays(value);
    return String(parsed ?? 0);
  };
  const rows: Array<[string, string]> = [
    [REFERENCE_RETENTION_KEY, toStored(input.referenceDays)],
    [RESULT_RETENTION_KEY, toStored(input.resultDays)]
  ];
  for (const [key, value] of rows) {
    await adminQuery(
      `insert into app_settings (key, value, updated_by, updated_at)
       values ($1, $2, $3, now())
       on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      [key, value, updatedBy]
    );
  }
}
