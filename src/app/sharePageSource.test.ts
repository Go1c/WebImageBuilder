import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("public prompt share page source", () => {
  it("shows the compliance notice and report control on the public share page", () => {
    expect(existsSync("src/app/share/[id]/page.tsx")).toBe(true);
    expect(existsSync("src/components/ShareReportButton.tsx")).toBe(true);

    const pageSource = readFileSync("src/app/share/[id]/page.tsx", "utf8");
    const buttonSource = readFileSync("src/components/ShareReportButton.tsx", "utf8");
    const unavailableSource = readFileSync("src/components/ShareUnavailableRedirect.tsx", "utf8");

    expect(pageSource).toContain('dynamic = "force-dynamic"');
    expect(pageSource).toContain("revalidate = 0");
    expect(pageSource).toContain("<ShareUnavailableRedirect />");
    expect(pageSource).toContain("PROMPT_SHARE_COMPLIANCE_NOTICE");
    expect(pageSource).toContain("快去试试");
    expect(pageSource).toContain("share-watermark");
    expect(pageSource).toContain("{PROMPT_SHARE_COMPLIANCE_NOTICE}");
    expect(unavailableSource).toContain("window.setTimeout");
    expect(unavailableSource).toContain("2000");
    expect(unavailableSource).toContain('router.replace("/")');
    expect(unavailableSource).toContain("2 秒后返回主页");
    expect(buttonSource).toContain("举报");
    expect(buttonSource).toContain("/api/shares/");
    expect(buttonSource).toContain("/report");
    expect(buttonSource).toContain("router.refresh");
  });
});
