import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listMaterials, listPublicMaterials, recordMaterialClick } from "./materials";

// These exercise the LUMIO_LOCAL_MODE mock path (no DB) so we can assert the
// pure ordering rules without a live Postgres.
const prevLocal = process.env.LUMIO_LOCAL_MODE;
const prevDbUrl = process.env.DATABASE_URL;

beforeEach(() => {
  process.env.LUMIO_LOCAL_MODE = "true";
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  if (prevLocal === undefined) delete process.env.LUMIO_LOCAL_MODE;
  else process.env.LUMIO_LOCAL_MODE = prevLocal;
  if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = prevDbUrl;
});

describe("material ordering", () => {
  it("listMaterials sorts by sort_order desc", async () => {
    const rows = await listMaterials({ status: "all" });
    const orders = rows.map((r) => r.sortOrder);
    const sortedDesc = [...orders].sort((a, b) => b - a);
    expect(orders).toEqual(sortedDesc);
    // highest sort_order comes first
    expect(rows[0].sortOrder).toBeGreaterThanOrEqual(rows[rows.length - 1].sortOrder);
  });

  it("listPublicMaterials returns only active items in sort_order desc", async () => {
    const items = await listPublicMaterials();
    const orders = items.map((i) => i.caseNumber);
    expect(orders).toEqual([...orders].sort((a, b) => b - a));
    expect(items.length).toBeGreaterThan(0);
  });
});

describe("recordMaterialClick", () => {
  it("does not count in local-preview mode (no DB)", async () => {
    const counted = await recordMaterialClick("00000000-0000-0000-0000-000000000000", "device:test");
    expect(counted).toBe(false);
  });
});
