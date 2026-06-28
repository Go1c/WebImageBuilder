import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

function readRule(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ruleMatch = css.match(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`));
  return ruleMatch?.[1] ?? "";
}

function readMediaRule(mediaQuery: string, selector: string): string {
  const mediaStart = css.indexOf(mediaQuery);
  if (mediaStart === -1) {
    return "";
  }

  const ruleMatch = css.slice(mediaStart).match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`));
  return ruleMatch?.[1] ?? "";
}

function readMediaRules(mediaQuery: string, selector: string): string[] {
  const mediaStart = css.indexOf(mediaQuery);
  if (mediaStart === -1) {
    return [];
  }

  const mediaEnd = css.indexOf("@media", mediaStart + mediaQuery.length);
  const mediaBody = css.slice(mediaStart, mediaEnd === -1 ? undefined : mediaEnd);
  const ruleMatcher = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "g");
  return Array.from(mediaBody.matchAll(ruleMatcher), (match) => match[1] ?? "");
}

describe("studio layout CSS", () => {
  it("lets the desktop studio shell adapt to short viewports", () => {
    const appRule = readRule(".studio-app");
    const gridRule = readRule(".studio-grid");
    const canvasRule = readRule(".canvas-area");
    const actionsRule = readRule(".canvas-actions");

    expect(appRule).toContain("height: 100dvh");
    expect(appRule).toContain("min-height: 0");
    expect(appRule).not.toContain("min-height: 663px");
    expect(gridRule).toContain("height: calc(100dvh - 56px)");
    expect(gridRule).toContain("min-height: 0");
    expect(gridRule).not.toContain("min-height: 607px");
    expect(canvasRule).toContain("grid-template-rows: auto minmax(0, 1fr) auto auto");
    expect(canvasRule).toContain("align-content: stretch");
    expect(actionsRule).toContain("position: relative");
    expect(actionsRule).toContain("z-index: 11");
  });

  it("keeps the completion toast away from canvas action buttons on desktop", () => {
    const rule = readRule(".studio-tip");

    expect(rule).toContain("right: 24px");
    expect(rule).toContain("bottom: 24px");
    expect(rule).toContain("min-width:");
    expect(rule).toContain("align-items: flex-start");
    expect(rule).toContain("transform: none");
    expect(rule).not.toContain("left: 50%");
    expect(rule).not.toContain("bottom: 18px");
  });

  it("keeps the ratio controls higher in the left panel", () => {
    const leftScrollRule = readRule(".left-panel-scroll");
    const promptCardRule = readRule(".prompt-card");
    const promptTextareaRule = readRule(".prompt-card textarea");
    const modelControlRule = readRule(".model-control-grid");

    expect(leftScrollRule).toContain("gap: 14px");
    expect(promptCardRule).toContain("min-height: 188px");
    expect(promptTextareaRule).toContain("min-height: 118px");
    expect(modelControlRule).toContain("grid-template-columns");
  });

  it("shows enabled icon buttons as active, not greyed out", () => {
    const iconRule = readRule(".icon-button");
    const disabledRules = readRule(".icon-button.is-disabled");

    expect(iconRule).toContain("color: var(--studio-text)");
    expect(disabledRules).toContain("color: var(--studio-muted)");
  });

  it("emphasizes the prompt share entry with color and motion", () => {
    const shareRule = readRule(".share-card-button");

    expect(shareRule).toContain("background: linear-gradient");
    expect(shareRule).toContain("animation: shareCtaPulse");
    expect(css).not.toContain(".generation-success-actions");
    expect(css).toContain("@keyframes shareCtaPulse");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("lets the main canvas preview follow the image aspect ratio", () => {
    const frameRule = readRule(".main-image-frame");
    const imageRule = readRule(".main-image-frame img");

    expect(frameRule).not.toContain("aspect-ratio: 1 / 1");
    expect(frameRule).toContain("max-height:");
    expect(imageRule).toContain("width: auto");
    expect(imageRule).toContain("height: auto");
    expect(imageRule).toContain("object-fit: contain");
  });

  it("uses a stable grid for multi-image canvas results", () => {
    const gridFrameRule = readRule(".main-image-frame.is-grid");
    const generatedGridRule = readRule(".generated-image-grid");
    const generatedTileRule = readRule(".generated-image-tile");
    const countThreeRule = readRule(".main-image-frame.count-3 .generated-image-grid");

    expect(gridFrameRule).toContain("aspect-ratio: 1 / 1");
    expect(generatedGridRule).toContain("grid-template-columns: repeat(2");
    expect(generatedGridRule).toContain("grid-template-rows: repeat(2");
    expect(countThreeRule).toContain("grid-template-columns: repeat(2");
    expect(generatedTileRule).toContain("border: 2px solid transparent");
  });

  it("keeps the prompt library scrollable on narrow viewports", () => {
    const rule = readMediaRule("@media (max-width: 980px)", ".library-scroll");

    expect(rule).toContain("overflow-y: auto");
    expect(rule).not.toContain("overflow: visible");
  });

  it("bounds the prompt library panel to the viewport on narrow viewports", () => {
    const rules = readMediaRules("@media (max-width: 980px)", ".library-panel").join("\n");

    expect(rules).not.toContain("height: auto");
    expect(rules).toContain("height: calc(100vh - 24px)");
    expect(rules).toContain("grid-template-rows: auto auto minmax(0, 1fr)");
  });
});
