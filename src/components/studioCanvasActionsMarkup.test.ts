import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/ImageStudio.tsx", "utf8");
const shareDialogSource = readFileSync("src/components/SharePromptDialog.tsx", "utf8");

function readCanvasActionsMarkup(): string {
  const actionsStart = source.indexOf('<div className="canvas-actions">');
  const historyStart = source.indexOf('<div className="canvas-history">', actionsStart);

  if (actionsStart === -1 || historyStart === -1) {
    return "";
  }

  return source.slice(actionsStart, historyStart);
}

function readFunctionSource(name: string): string {
  const functionStart = source.indexOf(`function ${name}`);
  const nextFunctionStart = source.indexOf("\n  function ", functionStart + 1);

  if (functionStart === -1) {
    return "";
  }

  return source.slice(functionStart, nextFunctionStart === -1 ? undefined : nextFunctionStart);
}

function readHeaderContextPanelSource(): string {
  return readFunctionSource("HeaderContextPanel");
}

describe("studio canvas actions markup", () => {
  it("renders the full canvas action set", () => {
    const markup = readCanvasActionsMarkup();

    expect(markup).toContain("handleSaveToPortfolio");
    expect(markup).toContain("handleShareCurrentImage");
    expect(markup).toContain("分享提示词卡片");
    expect(markup).toContain("handleClearCanvas");
    expect(markup).toContain("handleUseCurrentAsReference");
    expect(markup).toContain("handleDownloadCurrentImage");
    expect(markup).toContain("handleRegenerate");
    expect(markup).not.toContain("handleOpenCurrentImage");
    expect(markup).not.toContain('name="expand"');
  });

  it("shows a compliance notice when creating a prompt share", () => {
    const handler = readFunctionSource("handleShareCurrentImage");

    expect(handler).toContain("仅供学习交流，禁止传播任何色情非法内容。");
    expect(handler).toContain("setShareDialog");
  });

  it("routes post-generation sharing guidance through the right-side tip instead of a blocking panel", () => {
    expect(source).not.toContain('className="generation-success-panel"');
    expect(source).not.toContain("generation-success-actions");
    expect(source).toContain("把这个提示词分享出去");
    expect(source).toContain("handleCopyCanvasPrompt");
    expect(source).toContain("<SharePromptDialog");
  });

  it("highlights copy share text instead of opening the share page", () => {
    expect(shareDialogSource).toContain('<a href={share.shareUrl}');
    expect(shareDialogSource).not.toContain('<a className="share-dialog-primary"');
    expect(shareDialogSource).toContain('<button className="share-dialog-primary" type="button" onClick={() => void copyShareText()}>');
  });

  it("nudges users to share after saving a generated image", () => {
    const handler = readFunctionSource("handleSaveToPortfolio");

    expect(handler).toContain("已保存到作品集");
    expect(handler).toContain("分享提示词卡片");
  });

  it("explains whether image download used Chrome download or opened the original URL", () => {
    const handler = readFunctionSource("handleDownloadCurrentImage");

    expect(handler).toContain('downloadResult.mode === "opened"');
    expect(handler).toContain("下载已开始");
    expect(handler).toContain("已打开原图");
    expect(handler).toContain("Chrome");
  });

  it("auto closes tips after the default timeout", () => {
    expect(source).toContain("window.setTimeout(() => {");
    expect(source).toContain("setTip(null)");
    expect(source).toContain("5000");
  });

  it("clears stale request previews when selecting a history image", () => {
    const handler = readFunctionSource("handleHistoryThumbClick");

    expect(handler).toContain("setRequestPreview(null)");
  });

  it("refreshes the Sub2API session before submitting generation after idle time", () => {
    const handler = readFunctionSource("handleGenerate");
    const refreshIndex = handler.indexOf("await refreshSub2ApiSession({ silent: true })");
    const uploadIndex = handler.indexOf("uploadStudioAsset");
    const generateIndex = handler.indexOf('fetch("/api/generate"');

    expect(refreshIndex).toBeGreaterThan(-1);
    expect(uploadIndex).toBeGreaterThan(-1);
    expect(generateIndex).toBeGreaterThan(-1);
    expect(refreshIndex).toBeLessThan(uploadIndex);
    expect(refreshIndex).toBeLessThan(generateIndex);
  });

  it("documents pricing and invite rewards in the tutorial panels", () => {
    const panel = readHeaderContextPanelSource();

    expect(panel).toContain("1K：0.05 元/张");
    expect(panel).toContain("2K/4K：0.2 元/张");
    expect(panel).toContain("免费体验 3 次");
    expect(panel).toContain("注册送 20 次");
    expect(panel).toContain("邀请 1 人送 20 次");
    expect(panel).toContain("api.lumio.games");
    expect(panel).toContain("本站只记录普通用户免费体验 3 次");
    expect(panel).toContain("免费体验仅支持 1K");
    expect(panel).toContain("1K 请求超时时间为 250 秒");
    expect(panel).toContain("2K/4K 请求超时时间为 240 秒");
    expect(panel).toContain("context-highlight-grid");
    expect(panel).toContain("context-status-line");
    expect(panel).toContain("is-signed-out");
  });

  it("does not claim invite rewards through local site APIs", () => {
    expect(source).not.toContain("/api/invite/claim");
    expect(source).not.toContain("claimInviteFromUrl");
  });
});
