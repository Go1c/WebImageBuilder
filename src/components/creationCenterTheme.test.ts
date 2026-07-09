import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

function readBlock(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) {
    return "";
  }
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return close === -1 ? "" : css.slice(open + 1, close);
}

describe("creation center design tokens", () => {
  it("exposes theme-agnostic Lumio brand tokens on :root", () => {
    const root = readBlock(":root");

    expect(root).toContain("--lumio-teal: #2cd4be");
    expect(root).toContain("--lumio-violet: #8b78f5");
    expect(root).toContain("--lumio-orange: #f3a63a");
    expect(root).toContain("--lumio-danger: #f0705e");
  });

  it("defines semantic role tokens that map to the light palette by default", () => {
    const root = readBlock(":root");

    expect(root).toContain("--ui-accent: var(--studio-purple)");
    expect(root).toContain("--ui-generate: var(--studio-purple)");
    expect(root).toContain("--ui-money: var(--studio-green)");
  });

  it("keeps the existing light theme untouched as the default", () => {
    const root = readBlock(":root");

    // Default must remain light so production is unaffected until a flag opts in.
    expect(root).toContain("--studio-bg: #fafafa");
    expect(root).toContain("--studio-text: #171717");
  });

  it("remaps the studio tokens to a dark palette under data-theme=dark", () => {
    const dark = readBlock('[data-theme="dark"]');

    expect(dark).not.toBe("");
    expect(dark).toContain("--studio-bg: #090a0f");
    expect(dark).toContain("--studio-surface: #14161f");
    expect(dark).toContain("--studio-text: #eeeff3");
    // Status color unifies on teal, generate on violet — matches the UXUE spec.
    expect(dark).toContain("--studio-green: var(--lumio-teal)");
    expect(dark).toContain("--studio-purple: var(--lumio-violet)");
    expect(dark).toContain("--ui-accent: var(--lumio-teal)");
  });

  it("defines the extended semantic tokens in both themes so no hardcoded color leaks", () => {
    const root = readBlock(":root");
    const dark = readBlock('[data-theme="dark"]');

    // Light values equal the original hardcoded colors → light stays pixel-identical.
    expect(root).toContain("--studio-hairline: #e5e5e5");
    expect(root).toContain("--studio-success: #047857");
    expect(root).toContain("--studio-danger-text: #b91c1c");
    expect(root).toContain("--studio-toast-ok-bg: #dcfce7");

    // Dark counterparts must be redefined (not inherit the light hardcoded value).
    expect(dark).toContain("--studio-hairline: rgba(255, 255, 255, 0.12)");
    expect(dark).toContain("--studio-success: #4fc98c");
    expect(dark).toContain("--studio-surface-2: #191c26");
    expect(dark).toContain("--studio-toast-ok-bg: rgba(79, 201, 140, 0.16)");
  });

  it("has migrated every hardcoded color in the gen-station rules to a token", () => {
    // Scope to the original studio styles; the /canvas workbench intentionally uses
    // literal, theme-agnostic brand colors (white→grey wordmark, white primary button).
    const canvasSectionMarker = "无限画布工作台 · 创作中心";
    const studioCss = css.includes(canvasSectionMarker)
      ? css.slice(0, css.indexOf(canvasSectionMarker))
      : css;

    // Only token *definitions* (and the historical --studio-black fallback) may carry a raw hex.
    const offenders = studioCss
      .split("\n")
      .filter((line) => /#[0-9a-fA-F]{3,8}/.test(line))
      // Allow token *definition* lines (they legitimately carry the raw hex).
      .filter((line) => !/^\s*--(studio|lumio|ui)[\w-]*:/.test(line))
      // Allow the historical --studio-black fallback usage.
      .filter((line) => !/var\(--studio-black, #171717\)/.test(line))
      .map((line) => line.trim());

    expect(offenders).toEqual([]);
  });
});
