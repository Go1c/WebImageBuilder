import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync("src/app/layout.tsx", "utf8");

describe("creation center theme bootstrap", () => {
  it("injects a pre-paint script that can set the dark theme", () => {
    expect(layoutSource).toContain("dangerouslySetInnerHTML");
    expect(layoutSource).toContain('data-theme');
    expect(layoutSource).toContain("setAttribute('data-theme','dark')");
  });

  it("reads the ?theme override and persists it under a stable key", () => {
    expect(layoutSource).toContain("searchParams.get('theme')");
    expect(layoutSource).toContain("lumio-theme");
    expect(layoutSource).toContain("localStorage");
  });

  it("defaults to light by removing the attribute when no dark preference is set", () => {
    // No stored preference must leave the document in the untouched light theme.
    expect(layoutSource).toContain("removeAttribute('data-theme')");
  });
});
