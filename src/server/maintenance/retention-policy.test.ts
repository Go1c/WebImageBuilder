import { describe, expect, it } from "vitest";
import {
  isDeletablePrefix,
  parseRetentionDays,
  selectDeletableCandidates,
  type AssetCandidate
} from "./retention-policy";

describe("parseRetentionDays", () => {
  it("returns a positive integer for valid input", () => {
    expect(parseRetentionDays(7)).toBe(7);
    expect(parseRetentionDays("30")).toBe(30);
    expect(parseRetentionDays(" 3 ")).toBe(3);
    expect(parseRetentionDays(3.9)).toBe(3);
  });

  it("treats 0, negative, empty, and garbage as disabled (null)", () => {
    for (const bad of [0, -1, "", "  ", null, undefined, "abc", NaN, "-5"]) {
      expect(parseRetentionDays(bad)).toBeNull();
    }
  });
});

describe("isDeletablePrefix", () => {
  it("allows only reference/ and generated/ prefixes", () => {
    expect(isDeletablePrefix("reference/u/2026-01-01/x.png")).toBe(true);
    expect(isDeletablePrefix("generated/u/t/x.png")).toBe(true);
  });

  it("protects materials/ and any other prefix", () => {
    expect(isDeletablePrefix("materials/2026-01-01/x.png")).toBe(false);
    expect(isDeletablePrefix("other/x.png")).toBe(false);
    expect(isDeletablePrefix("x.png")).toBe(false);
    // near-miss must not pass via substring
    expect(isDeletablePrefix("safe/reference/x.png")).toBe(false);
  });
});

describe("selectDeletableCandidates", () => {
  const cand = (id: string, storageKey: string, assetType = "reference"): AssetCandidate => ({
    id,
    storageKey,
    assetType
  });

  it("keeps deletable-prefix candidates that are not referenced", () => {
    const candidates = [
      cand("1", "reference/u/2026-01-01/a.png"),
      cand("2", "generated/u/t/b.png", "result")
    ];
    const out = selectDeletableCandidates(candidates, new Set());
    expect(out.map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("drops candidates still referenced by shares/materials", () => {
    const shared = "generated/u/t/shared.png";
    const candidates = [cand("1", "reference/u/x.png"), cand("2", shared, "result")];
    const out = selectDeletableCandidates(candidates, new Set([shared]));
    expect(out.map((c) => c.id)).toEqual(["1"]);
  });

  it("drops candidates outside deletable prefixes even if unreferenced", () => {
    const candidates = [cand("1", "materials/x.png"), cand("2", "weird/x.png")];
    expect(selectDeletableCandidates(candidates, new Set())).toEqual([]);
  });
});
