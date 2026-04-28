import { describe, expect, it } from "vitest";
import type { ApiErrorDetail } from "./apiErrors";
import { tipFromActionFailure, tipFromApiError } from "./studioTips";

describe("studio tips", () => {
  it.each([
    ["quota_exhausted", "额度已用完", "Lumio 账户"],
    ["trial_resolution_unsupported", "免费试用仅支持 1K", "登录"],
    ["rate_limited", "请求过于频繁", "稍后再试"],
    ["account_unavailable", "需要创建图片生成 Key", "Image-2"],
    ["provider_error", "生成服务暂时不可用", "上游图像服务"],
    ["configuration_error", "服务配置异常", "联系管理员"],
    ["unauthorized", "需要登录", "登录后"],
    ["bad_request", "请求参数有误", "检查提示词"]
  ])("maps API error code %s to a Chinese user tip", (code, title, messagePart) => {
    const tip = tipFromApiError(apiErrorDetail({ code, message: "Server detail for debugging" }));

    expect(tip.title).toBe(title);
    expect(tip.message).toContain(messagePart);
    expect(tip.message).toContain("Server detail for debugging");
  });

  it("guides users to create a Sub2API image key when no matching key exists", () => {
    const tip = tipFromApiError(
      apiErrorDetail({
        code: "account_unavailable",
        message:
          "未找到可用于图片生成的 active OpenAI API Key。请在 Sub2API 创建或启用一个 Key，并绑定到平台为 OpenAI、分组名包含 image 的分组，例如 Image-2（生图专用）。可查看教程或帮助文档完成创建。"
      })
    );

    expect(tip).toMatchObject({
      type: "warning",
      title: "需要创建图片生成 Key",
      actionLabel: "去创建 Key",
      actionHref: "https://api.lumio.games/keys"
    });
    expect(tip.message).toBe(
      "未找到可用于图片生成的 active OpenAI API Key。请在 Sub2API 创建或启用一个 Key，并绑定到平台为 OpenAI、分组名包含 image 的分组，例如 Image-2（生图专用）。可查看教程或帮助文档完成创建。"
    );
  });

  it("explains image gateway 502 errors as channel configuration issues", () => {
    const tip = tipFromApiError(
      apiErrorDetail({
        code: "provider_error",
        message: "OpenAI image request failed: 502"
      })
    );

    expect(tip).toMatchObject({
      type: "error",
      title: "图片通道不可用",
      actionLabel: "查看 Key",
      actionHref: "https://api.lumio.games/keys"
    });
    expect(tip.message).toContain("提示词");
    expect(tip.message).toContain("内容规范");
    expect(tip.message).toContain("可以再试一次");
    expect(tip.message).not.toContain("Sub2API");
  });

  it("recognizes Cloudflare invalid origin responses as image gateway 502 errors", () => {
    const tip = tipFromApiError(
      apiErrorDetail({
        code: "provider_error",
        message:
          "The origin web server returned an invalid or incomplete response to Cloudflare. This typically indicates the origin is overloaded or misconfigured."
      })
    );

    expect(tip).toMatchObject({
      type: "error",
      title: "图片通道不可用",
      actionLabel: "查看 Key",
      actionHref: "https://api.lumio.games/keys"
    });
    expect(tip.message).toContain("提示词");
    expect(tip.message).toContain("内容规范");
    expect(tip.message).not.toContain("Sub2API");
  });

  it("turns invalid 4K square requests into a direct size tip", () => {
    const tip = tipFromApiError(
      apiErrorDetail({
        code: "bad_request",
        message: "4K 不支持 1:1 尺寸，请改用 16:9。"
      })
    );

    expect(tip).toMatchObject({
      type: "warning",
      title: "4K 不支持 1:1"
    });
    expect(tip.message).toContain("16:9");
  });

  it("explains why gift balance requires prior recharge history", () => {
    const tip = tipFromApiError(
      apiErrorDetail({
        code: "provider_error",
        message: "账户历史充值需大于 9.90 才能使用余额服务，请先充值。"
      })
    );

    expect(tip).toMatchObject({
      type: "warning",
      title: "赠送余额暂不可用",
      actionLabel: "去充值",
      actionHref: "https://api.lumio.games/purchase"
    });
    expect(tip.message).toBe(
      "为防止恶意注册，使用赠送余额生成图片前，需要账户历史充值金额大于 10 元。请先完成充值，满足条件后即可继续使用赠送余额。"
    );
  });

  it("explains exhausted anonymous device trials instead of calling them frequent requests", () => {
    const tip = tipFromApiError(
      apiErrorDetail({
        code: "rate_limited",
        message: "device_quota_exhausted"
      })
    );

    expect(tip).toMatchObject({
      type: "warning",
      title: "免费体验已用完"
    });
    expect(tip.message).toContain("当前设备");
    expect(tip.message).toContain("登录");
    expect(tip.message).not.toContain("请求过于频繁");
  });

  it("keeps IP daily limits as frequency protection", () => {
    const tip = tipFromApiError(
      apiErrorDetail({
        code: "rate_limited",
        message: "ip_daily_limit_exhausted"
      })
    );

    expect(tip).toMatchObject({
      type: "warning",
      title: "请求过于频繁"
    });
    expect(tip.message).toContain("今日");
  });

  it("uses a useful fallback tip for unknown API errors", () => {
    const tip = tipFromApiError(apiErrorDetail({ code: "internal_error", message: "database unavailable" }));

    expect(tip).toMatchObject({
      type: "error",
      title: "请求失败"
    });
    expect(tip.message).toContain("database unavailable");
  });

  it("falls back safely for prototype-name API error codes", () => {
    const tip = tipFromApiError(apiErrorDetail({ code: "__proto__", message: "prototype lookup detail" }));

    expect(tip).toMatchObject({
      type: "error",
      title: "请求失败"
    });
    expect(tip.message).toContain("prototype lookup detail");
  });

  it("represents integration-shell actions as explicit tips", () => {
    const tip = tipFromActionFailure({
      kind: "integration",
      feature: "保存到作品集"
    });

    expect(tip).toMatchObject({
      type: "info",
      title: "暂未接入"
    });
    expect(tip.message).toContain("保存到作品集");
  });

  it("represents login-required actions as explicit tips", () => {
    const tip = tipFromActionFailure({
      kind: "login_required",
      action: "邀请好友领取额度",
      actionHref: "/login"
    });

    expect(tip).toMatchObject({
      type: "warning",
      title: "需要登录",
      actionLabel: "去登录",
      actionHref: "/login"
    });
    expect(tip.message).toContain("邀请好友领取额度");
  });

  it("maps disabled front-end actions to clear tips", () => {
    const tip = tipFromActionFailure({
      kind: "disabled",
      action: "下载图片",
      reason: "请先选择一张生成结果"
    });

    expect(tip).toMatchObject({
      type: "info",
      title: "操作不可用"
    });
    expect(tip.message).toContain("下载图片");
    expect(tip.message).toContain("请先选择一张生成结果");
  });
});

function apiErrorDetail(overrides: Partial<ApiErrorDetail>): ApiErrorDetail {
  return {
    isStructured: true,
    message: "Server detail",
    status: 500,
    statusText: "",
    ...overrides
  };
}
