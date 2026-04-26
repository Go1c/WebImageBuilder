import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("home prompt prefill source", () => {
  it("passes the prompt query parameter into the studio initial render", () => {
    const pageSource = readFileSync("src/app/page.tsx", "utf8");
    const studioSource = readFileSync("src/components/ImageStudio.tsx", "utf8");

    expect(pageSource).toContain('dynamic = "force-dynamic"');
    expect(pageSource).toContain("revalidate = 0");
    expect(pageSource).toContain("searchParams");
    expect(pageSource).toContain("readPromptFromSearchParam");
    expect(pageSource).toContain("initialPrompt");
    expect(studioSource).toContain("initialPrompt");
    expect(studioSource).toContain("useState(initialPrompt)");
  });
});
