import { getAppConfig } from "../config";
import { runRetentionCleanup } from "./retention-runner";

const DAY_MS = 24 * 60 * 60 * 1000;
// Delay the first run so it never competes with container boot / migration.
const FIRST_RUN_DELAY_MS = 5 * 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var lumioRetentionSchedulerStarted: boolean | undefined;
}

/**
 * Start the in-process daily retention cleanup. Idempotent (guarded by a global
 * flag so it survives HMR / repeated instrumentation registration). Never starts
 * in local mode or without a real DB, and never throws — a failed run is logged
 * and retried on the next tick.
 */
export function startRetentionScheduler(): void {
  if (globalThis.lumioRetentionSchedulerStarted) {
    return;
  }
  const config = getAppConfig();
  if (config.localMode || !config.databaseUrl) {
    return;
  }
  globalThis.lumioRetentionSchedulerStarted = true;

  const runSafe = async (): Promise<void> => {
    try {
      const report = await runRetentionCleanup({ dryRun: false });
      if (report.enabled) {
        console.log(
          `[retention] done deletedObjects=${report.deletedObjects} deletedRows=${report.deletedRows} ` +
            `reference(${report.reference.retentionDays}d)=${report.reference.deletable} ` +
            `result(${report.result.retentionDays}d)=${report.result.deletable}`
        );
      }
    } catch (error) {
      console.error("[retention] cleanup failed:", error);
    }
  };

  setTimeout(runSafe, FIRST_RUN_DELAY_MS);
  setInterval(runSafe, DAY_MS);
}
