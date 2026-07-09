// Pure, dependency-free retention rules. Kept isolated from DB/S3 so the
// safety-critical decisions (what is deletable) are unit-tested in full.

export type RetentionSettings = {
  /** null = disabled (never delete this class). */
  referenceDays: number | null;
  resultDays: number | null;
};

export type AssetCandidate = {
  id: string;
  storageKey: string;
  assetType: string;
};

/**
 * Parse a stored/inputted retention-days value into a positive integer, or null
 * when it means "disabled". 0, negative, empty, and non-numeric all → null so a
 * misconfigured value can never silently mass-delete.
 */
export function parseRetentionDays(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  if (n <= 0) return null;
  return Math.floor(n);
}

/** Only user-upload (reference/) and generation-result (generated/) objects are
 *  ever eligible. Anything else — materials/, unknown prefixes — is protected. */
const DELETABLE_PREFIXES = ["reference/", "generated/"] as const;

export function isDeletablePrefix(key: string): boolean {
  return DELETABLE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * Final safety gate applied to every candidate before deletion:
 *  1. key must sit under a deletable prefix (never touch materials/ or others), and
 *  2. key must NOT still be referenced by an active share or the material library.
 * Both conditions must hold; when in doubt the candidate is kept.
 */
export function selectDeletableCandidates(
  candidates: AssetCandidate[],
  referencedKeys: Set<string>
): AssetCandidate[] {
  return candidates.filter(
    (candidate) =>
      isDeletablePrefix(candidate.storageKey) && !referencedKeys.has(candidate.storageKey)
  );
}
