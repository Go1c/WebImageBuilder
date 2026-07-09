// Next.js server instrumentation. Runs once when the Node server process boots
// (Zeabur runs the standalone server.js persistently), so it is the hook for
// the in-process retention scheduler.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { startRetentionScheduler } = await import("@/server/maintenance/scheduler");
  startRetentionScheduler();
}
