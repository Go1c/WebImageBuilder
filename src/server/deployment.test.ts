import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("deployment image", () => {
  it("copies public assets into the standalone runtime image", () => {
    const dockerfile = readFileSync(join(process.cwd(), "Dockerfile"), "utf8");

    expect(dockerfile).toContain(
      "COPY --from=builder --chown=nextjs:nodejs /app/public ./public"
    );
  });
});
