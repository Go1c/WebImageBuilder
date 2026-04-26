const generationTotalFormatter = new Intl.NumberFormat("en-US");

export function formatGlobalGenerationTotal(
  totalGenerations: number | null | undefined,
  options: { compact?: boolean } = {}
): string {
  const countText = formatGenerationCount(totalGenerations);
  return options.compact ? `${countText} 次` : `全站已生成 ${countText} 次`;
}

function formatGenerationCount(totalGenerations: number | null | undefined): string {
  if (!Number.isFinite(totalGenerations)) {
    return "--";
  }

  return generationTotalFormatter.format(Math.max(0, Math.floor(totalGenerations as number)));
}
