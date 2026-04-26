import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/ImageStudio.tsx", "utf8");

function readCanvasActionsMarkup(): string {
  const actionsStart = source.indexOf('<div className="canvas-actions">');
  const historyStart = source.indexOf('<div className="canvas-history">', actionsStart);

  if (actionsStart === -1 || historyStart === -1) {
    return "";
  }

  return source.slice(actionsStart, historyStart);
}

describe("studio canvas actions markup", () => {
  it("renders the full canvas action set", () => {
    const markup = readCanvasActionsMarkup();

    expect(markup).toContain("handleSaveToPortfolio");
    expect(markup).toContain("handleClearCanvas");
    expect(markup).toContain("handleUseCurrentAsReference");
    expect(markup).toContain("handleDownloadCurrentImage");
    expect(markup).toContain("handleRegenerate");
    expect(markup).not.toContain("handleOpenCurrentImage");
    expect(markup).not.toContain('name="expand"');
  });
});
