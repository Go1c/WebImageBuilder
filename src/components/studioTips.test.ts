import { describe, expect, it } from "vitest";
import type { ApiErrorDetail } from "./apiErrors";
import { tipFromActionFailure, tipFromApiError } from "./studioTips";

describe("studio tips", () => {
  it.each([
    ["quota_exhausted", "额度已用完", "可用生成次数"],
    ["rate_limited", "请求过于频繁", "稍后再试"],
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
