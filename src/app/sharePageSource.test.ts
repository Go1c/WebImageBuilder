import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("public prompt share page source", () => {
  it("renders the share landing controls and the visitor slim topbar", () => {
    expect(existsSync("src/app/share/[id]/page.tsx")).toBe(true);
    expect(existsSync("src/components/ShareReportButton.tsx")).toBe(true);

    const pageSource = readFileSync("src/app/share/[id]/page.tsx", "utf8");
    const buttonSource = readFileSync("src/components/ShareReportButton.tsx", "utf8");
    const protectedImageSource = readFileSync("src/components/ShareProtectedImage.tsx", "utf8");
    const unavailableSource = readFileSync("src/components/ShareUnavailableRedirect.tsx", "utf8");

    expect(pageSource).toContain('dynamic = "force-dynamic"');
    expect(pageSource).toContain("revalidate = 0");
    expect(pageSource).toContain("<ShareUnavailableRedirect />");
    expect(pageSource).toContain("buildPromptShareImageUrl");
    // Primary conversion CTA (design P6 · 全页唯一强按钮).
    expect(pageSource).toContain("share-cta");
    expect(pageSource).toContain("我也要生成");
    expect(pageSource).toContain("<SharePromptCopyButton");
    expect(pageSource).toContain("<ShareProtectedImage");
    // Visitor slim topbar: brand + quota + login, no full nav.
    expect(pageSource).toContain("studio-topbar");
    expect(pageSource).toContain("免费体验");
    expect(pageSource).toContain("login-pill");

    // Watermark protection preserved.
    expect(protectedImageSource).toContain("share-watermark");
    expect(protectedImageSource).toContain("{watermark}");

    // Report control opens a confirm flow, no compliance-notice body copy.
    expect(buttonSource).toContain("举报");
    expect(buttonSource).toContain("/api/shares/");
    expect(buttonSource).toContain("/report");
    expect(buttonSource).toContain("已举报");

    // Unavailable state is an experiential card, NOT an auto-redirect white screen.
    expect(unavailableSource).toContain("share-unavailable");
    expect(unavailableSource).toContain("去生成");
    expect(unavailableSource).not.toContain("window.setTimeout");
    expect(unavailableSource).not.toContain("router.replace");
  });

  it("does not expose the shared result as a direct right-clickable image", () => {
    expect(existsSync("src/components/ShareProtectedImage.tsx")).toBe(true);

    const pageSource = readFileSync("src/app/share/[id]/page.tsx", "utf8");
    const protectedImageSource = readFileSync("src/components/ShareProtectedImage.tsx", "utf8");

    expect(pageSource).toContain("<ShareProtectedImage");
    expect(pageSource).not.toContain("<img src={share.imageUrl}");
    expect(pageSource).not.toContain("imageUrl={share.imageUrl}");
    expect(protectedImageSource).toContain("onContextMenu");
    expect(protectedImageSource).toContain("event.preventDefault()");
    expect(protectedImageSource).toContain("onDragStart");
    expect(protectedImageSource).toContain("backgroundImage");
    expect(protectedImageSource).toContain("share-watermark");
  });

  it("uses a temporary toast for public share copy feedback", () => {
    const copyButtonSource = readFileSync("src/components/SharePromptCopyButton.tsx", "utf8");

    expect(copyButtonSource).toContain("share-copy-toast");
    expect(copyButtonSource).toContain("window.setTimeout");
    expect(copyButtonSource).toContain("setStatus(\"idle\")");
  });
});
