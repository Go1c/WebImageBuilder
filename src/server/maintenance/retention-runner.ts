import { getAppConfig } from "../config";
import { query, transaction } from "../db/client";
import { writeAuditLog } from "../admin/db";
import { getRetentionSettings } from "../admin/queries/settings";
import { deleteStoredObjects, isStorageConfigured, listObjectsWithSize } from "../storage/s3";
import {
  selectDeletableCandidates,
  type AssetCandidate,
  type RetentionSettings
} from "./retention-policy";

export type RetentionClassReport = {
  retentionDays: number | null;
  candidates: number;
  deletable: number;
  bytes: number;
};

export type RetentionReport = {
  dryRun: boolean;
  enabled: boolean;
  reference: RetentionClassReport;
  result: RetentionClassReport;
  deletedObjects: number;
  deletedRows: number;
};

function emptyClass(retentionDays: number | null): RetentionClassReport {
  return { retentionDays, candidates: 0, deletable: 0, bytes: 0 };
}

async function loadExpired(assetType: string, days: number): Promise<AssetCandidate[]> {
  const result = await query<{ id: string; storageKey: string; assetType: string }>(
    `select id::text as id, storage_key as "storageKey", asset_type as "assetType"
       from assets
      where asset_type = $1
        and storage_key is not null
        and created_at < now() - make_interval(days => $2::int)`,
    [assetType, days]
  );
  return result.rows;
}

/** Every R2 key still referenced by a share or the material library — never deleted. */
async function loadReferencedKeys(): Promise<Set<string>> {
  const result = await query<{ k: string }>(
    `select image_storage_key as k from prompt_shares where image_storage_key is not null
     union
     select storage_key as k from material_items where storage_key is not null`
  );
  return new Set(result.rows.map((row) => row.k));
}

/**
 * Apply the asset retention policy. With dryRun=true it only measures the
 * deletion set (count + bytes) and touches nothing. With dryRun=false it deletes
 * the R2 objects first (idempotent) then the assets rows, and writes an audit log.
 *
 * Safety: disabled classes (days=null) are skipped; materials/ and share-referenced
 * keys are filtered out by selectDeletableCandidates; nothing runs without a DB.
 */
export async function runRetentionCleanup(options?: {
  dryRun?: boolean;
  settings?: RetentionSettings;
  actorEmail?: string;
}): Promise<RetentionReport> {
  const dryRun = options?.dryRun ?? false;
  const config = getAppConfig();
  const settings = options?.settings ?? (await getRetentionSettings());
  const enabled = settings.referenceDays != null || settings.resultDays != null;

  const report: RetentionReport = {
    dryRun,
    enabled,
    reference: emptyClass(settings.referenceDays),
    result: emptyClass(settings.resultDays),
    deletedObjects: 0,
    deletedRows: 0
  };

  if (!config.databaseUrl || !enabled) {
    return report;
  }

  const referencedKeys = await loadReferencedKeys();

  const plan: Array<{ report: RetentionClassReport; prefix: string; candidates: AssetCandidate[] }> = [];
  if (settings.referenceDays != null) {
    const expired = await loadExpired("reference", settings.referenceDays);
    report.reference.candidates = expired.length;
    plan.push({
      report: report.reference,
      prefix: "reference/",
      candidates: selectDeletableCandidates(expired, referencedKeys)
    });
  }
  if (settings.resultDays != null) {
    const expired = await loadExpired("result", settings.resultDays);
    report.result.candidates = expired.length;
    plan.push({
      report: report.result,
      prefix: "generated/",
      candidates: selectDeletableCandidates(expired, referencedKeys)
    });
  }

  // Size the deletion set from one listing per distinct prefix.
  const sizeByPrefix = new Map<string, Map<string, number>>();
  for (const item of plan) {
    item.report.deletable = item.candidates.length;
    if (!sizeByPrefix.has(item.prefix)) {
      sizeByPrefix.set(item.prefix, await listObjectsWithSize(item.prefix));
    }
    const sizes = sizeByPrefix.get(item.prefix)!;
    item.report.bytes = item.candidates.reduce((sum, c) => sum + (sizes.get(c.storageKey) ?? 0), 0);
  }

  if (dryRun) {
    return report;
  }

  const candidates = plan.flatMap((item) => item.candidates);
  if (candidates.length === 0) {
    return report;
  }

  // Refuse to delete DB rows when object storage is unavailable — deleting the
  // rows without deleting the R2 objects would orphan them (the exact problem
  // this feature exists to prevent).
  if (!isStorageConfigured()) {
    return report;
  }

  await deleteStoredObjects(candidates.map((c) => c.storageKey));
  const ids = candidates.map((c) => c.id);
  await transaction(async (client) => {
    for (let i = 0; i < ids.length; i += 500) {
      await client.query(`delete from assets where id = any($1::uuid[])`, [ids.slice(i, i + 500)]);
    }
  });
  report.deletedObjects = candidates.length;
  report.deletedRows = ids.length;

  await writeAuditLog({
    adminEmail: options?.actorEmail ?? "system:retention-scheduler",
    action: "retention.cleanup",
    targetType: "assets",
    detail: {
      referenceDays: settings.referenceDays,
      resultDays: settings.resultDays,
      reference: report.reference,
      result: report.result,
      deletedObjects: report.deletedObjects,
      deletedRows: report.deletedRows
    }
  });

  return report;
}
