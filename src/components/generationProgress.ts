// Rough progress estimate for the generation wait shown on the studio canvas.
// The image gateway latency is highly variable (~80-230s observed), so instead
// of a linear bar against a fixed budget this eases toward — but never reaches —
// 100%. Completion is only ever rendered once the real result arrives, so the
// bar can't lie about being done. Returns an integer percentage in [0, 95].
const PROGRESS_TIME_CONSTANT_SECONDS = 90;
const PROGRESS_CEILING = 95;

export function estimateGenerationProgress(elapsedSeconds: number): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return 0;
  }

  const eased = 1 - Math.exp(-elapsedSeconds / PROGRESS_TIME_CONSTANT_SECONDS);
  return Math.min(PROGRESS_CEILING, Math.round(eased * 100));
}
