import { describe, expect, it, vi } from "vitest";
import { getGlobalGenerationStats } from "@/server/db/repositories";
import { GET } from "./route";

vi.mock("@/server/db/repositories", () => ({
  getGlobalGenerationStats: vi.fn()
}));

describe("/api/stats", () => {
  it("returns global generation totals", async () => {
    vi.mocked(getGlobalGenerationStats).mockResolvedValueOnce({ totalGenerations: 42 });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ totalGenerations: 42 });
    expect(response.status).toBe(200);
  });
});
