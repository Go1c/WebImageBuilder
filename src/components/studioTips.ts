import type { ApiErrorDetail } from "./apiErrors";

export type StudioTipType = "info" | "warning" | "error" | "success";

export type StudioTip = {
  type: StudioTipType;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export type StudioActionFailure =
  | {
      kind: "integration";
      feature: string;
      detail?: string;
    }
  | {
      kind: "login_required";
      action: string;
      actionHref?: string;
    }
  | {
      kind: "disabled";
      action: string;
      reason?: string;
    }
  | {
      kind: "failed";
      action: string;
      error?: unknown;
    };

type ApiErrorTipTemplate = Omit<StudioTip, "message"> & { message: string };

const apiErrorTipMap = new Map<string, ApiErrorTipTemplate>([
  [
    "quota_exhausted",
    {
      type: "warning",
      title: "额度已用完",
      message: "本站 3 次免费体验已用完，请登录后使用 Lumio 账户 Key/余额继续生成；注册和邀请奖励请到 Lumio 账户中心查看。"
    }
  ],
  [
    "trial_resolution_unsupported",
    {
      type: "warning",
      title: "免费试用仅支持 1K",
      message: "免费 3 次体验只支持 1K 生成。请选择 1K，或登录后使用 Lumio 账户 Key/余额生成 2K 和 4K。"
    }
  ],
  [
    "rate_limited",
    {
      type: "warning",
      title: "请求过于频繁",
      message: "操作太快了，请稍后再试。"
    }
  ],
  [
    "account_unavailable",
    {
      type: "warning",
      title: "需要创建图片生成 Key",
      message:
        "未找到可用于图片生成的 active OpenAI API Key。请在 Sub2API 创建或启用一个 Key，并绑定到平台为 OpenAI、分组名包含 image 的分组，例如 Image-2（生图专用）。可查看教程或帮助文档完成创建。",
      actionLabel: "去创建 Key",
      actionHref: "https://api.lumio.games/keys"
    }
  ],
  [
    "provider_error",
    {
      type: "error",
      title: "生成服务暂时不可用",
      message: "上游图像服务返回错误，请稍后重试。"
    }
  ],
  [
    "configuration_error",
    {
      type: "error",
      title: "服务配置异常",
      message: "生成服务配置不完整，请联系管理员检查密钥或存储配置。"
    }
  ],
  [
    "unauthorized",
    {
      type: "warning",
      title: "需要登录",
      message: "请登录后继续此操作。"
    }
  ],
  [
    "bad_request",
    {
      type: "warning",
      title: "请求参数有误",
      message: "请检查提示词、尺寸或上传文件后重试。"
    }
  ]
]);

export function tipFromApiError(
  error: Pick<ApiErrorDetail, "code" | "message" | "status" | "statusText" | "upstream">
): StudioTip {
  if (
    (error.code === "rate_limited" || error.code === "quota_exhausted") &&
    isDeviceQuotaExhausted(error.message)
  ) {
    return {
      type: "warning",
      title: "免费体验已用完",
      message: "当前设备的免费体验次数已用完。请登录后使用 Lumio 账户 Key/余额继续生成；如果已经登录，请刷新页面或重新登录后再试。",
      actionLabel: "去登录",
      actionHref: "https://api.lumio.games/login"
    };
  }

  if (error.code === "rate_limited" && isIpDailyLimitExhausted(error.message)) {
    return {
      type: "warning",
      title: "请求过于频繁",
      message: "当前网络今日匿名生成次数已达上限。请明天再试，或登录后使用 Lumio 账户继续生成。"
    };
  }

  if (error.code === "bad_request" && isUnsupported4KRatioSize(error.message)) {
    return {
      type: "warning",
      title: "4K 尺寸不支持",
      message: withDebugDetail(
        "4K 的 4:3 请使用 3264x2448，3:4 请使用 2448x3264；1:1 使用 2880x2880，16:9 使用 3840x2160。",
        error.message
      )
    };
  }

  if (error.code === "bad_request" && isGptImage2OfficialSizeError(error.message)) {
    return {
      type: "warning",
      title: "尺寸不符合官方规格",
      message: withDebugDetail(
        "GPT Image 2 要求宽高为 16px 的倍数，最大边不超过 3840px，长短边比例不超过 3:1，总像素在 655,360 到 8,294,400 之间。请使用当前页面的分辨率和比例选项。",
        error.message
      )
    };
  }

  if (error.code === "provider_error" && isGiftBalanceRechargeRequired(error.message)) {
    return {
      type: "warning",
      title: "赠送余额暂不可用",
      message: "为防止恶意注册，使用赠送余额生成图片前，需要账户历史充值金额大于 10 元。请先完成充值，满足条件后即可继续使用赠送余额。",
      actionLabel: "去充值",
      actionHref: "https://api.lumio.games/purchase"
    };
  }

  if (error.code === "provider_error" && isPromptViolationError(error)) {
    return {
      type: "warning",
      title: "提示词违规",
      message: withDebugDetail(
        "上游图像服务判定提示词违规。请修改提示词，删减敏感、成人、暴力、违法、名人肖像、侵权或规避审核等描述后再试。",
        buildProviderDebugDetail(error),
        { preserveWhitespace: true }
      )
    };
  }

  if (error.code === "provider_error" && isUpstreamAuthOrRiskError(error)) {
    return {
      type: "warning",
      title: "上游账号或风控拦截",
      message: withDebugDetail(
        "上游账号认证失败，或触发了 403 风控/盾页面；系统已尝试切换账号但仍失败。请检查账号状态、Key 权限，或稍后再试。",
        buildProviderDebugDetail(error),
        { preserveWhitespace: true }
      ),
      actionLabel: "查看 Key",
      actionHref: "https://api.lumio.games/keys"
    };
  }

  if (error.code === "provider_error" && isReferenceRequiredError(error)) {
    return {
      type: "warning",
      title: "需要参考图",
      message: withDebugDetail(
        "这个请求需要提供参考图。请上传参考图，或先把画布/作品图设置为参考图后再生成。",
        buildProviderDebugDetail(error),
        { preserveWhitespace: true }
      )
    };
  }

  if (error.code === "provider_error" && isDrawingModeNotTriggeredError(error)) {
    return {
      type: "warning",
      title: "未触发画图模式",
      message: withDebugDetail(
        "上游没有进入画图模式。请在提示词中明确要求生成图片，避免只提问、聊天或让模型输出文字说明。",
        buildProviderDebugDetail(error),
        { preserveWhitespace: true }
      )
    };
  }

  if (error.code === "provider_error" && isUpstreamTimeoutError(error)) {
    return {
      type: "error",
      title: "上游生成超时",
      message: withDebugDetail(
        "上游生图等待超时。请稍后重试，或降低分辨率、减少参考图/单次生成数量后再试。",
        buildProviderDebugDetail(error),
        { preserveWhitespace: true }
      )
    };
  }

  if (error.code === "provider_error" && isUpstreamNotFoundError(error)) {
    return {
      type: "error",
      title: "上游接口不可用",
      message: withDebugDetail(
        "上游返回 404，可能是接口路径、模型名或通道配置不匹配。请检查上游 Base URL、模型和通道配置。",
        buildProviderDebugDetail(error),
        { preserveWhitespace: true }
      ),
      actionLabel: "查看 Key",
      actionHref: "https://api.lumio.games/keys"
    };
  }

  if (error.code === "provider_error" && isUpstreamBadRequestError(error)) {
    return {
      type: "warning",
      title: "上游拒绝请求",
      message: withDebugDetail(
        "上游以 400 拒绝了请求。请检查请求参数、提示词、尺寸、参考图和模型配置。",
        buildProviderDebugDetail(error),
        { preserveWhitespace: true }
      )
    };
  }

  if (error.code === "provider_error" && isUpstreamServiceUnavailable(error)) {
    return {
      type: "error",
      title: "上游服务临时不可用",
      message: withDebugDetail(
        "上游图像服务返回 502 或临时不可用。请稍后重试；如果连续出现，请检查上游通道、Base URL、模型或 Key 配置。",
        buildProviderDebugDetail(error),
        { preserveWhitespace: true }
      ),
      actionLabel: "查看 Key",
      actionHref: "https://api.lumio.games/keys"
    };
  }

  const mappedTip = error.code ? apiErrorTipMap.get(error.code) : undefined;

  if (mappedTip) {
    return {
      ...mappedTip,
      message: withDebugDetail(mappedTip.message, error.message, {
        preserveWhitespace: error.code === "provider_error"
      })
    };
  }

  const fallbackDetail = error.message || `HTTP ${error.status}${error.statusText ? ` ${error.statusText}` : ""}`;

  return {
    type: "error",
    title: "请求失败",
    message: withDebugDetail("请求没有完成，请稍后重试。", fallbackDetail)
  };
}

function isDeviceQuotaExhausted(message: string | undefined): boolean {
  const normalized = message || "";
  return (
    normalized.includes("device_quota_exhausted") ||
    (normalized.includes("当前设备") && normalized.includes("免费体验"))
  );
}

function isIpDailyLimitExhausted(message: string | undefined): boolean {
  return (message || "").includes("ip_daily_limit_exhausted");
}

function isUnsupported4KRatioSize(message: string | undefined): boolean {
  const normalized = message || "";
  const includesRecommendedSize =
    normalized.includes("3264x2448") || normalized.includes("2448x3264");

  return (
    (normalized.includes("4K") &&
      (includesRecommendedSize || normalized.includes("size分辨率不合法"))) ||
    (normalized.includes("size分辨率不合法") && includesRecommendedSize)
  );
}

function isGptImage2OfficialSizeError(message: string | undefined): boolean {
  const normalized = message || "";
  return normalized.includes("GPT Image 2") && normalized.includes("尺寸不支持");
}

function isUpstreamServiceUnavailable(error: Pick<ApiErrorDetail, "message" | "upstream">): boolean {
  const normalized = getProviderErrorText(error).toLowerCase();

  return (
    hasUpstreamCode(error, ["upstream_unavailable"]) ||
    normalized.includes("openai image request failed: 502") ||
    normalized.includes("upstream service temporarily unavailable") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("upstream_error") ||
    normalized.includes("origin web server returned an invalid or incomplete response") ||
    normalized.includes("origin is overloaded or misconfigured")
  );
}

function isPromptViolationError(
  error: Pick<ApiErrorDetail, "message" | "upstream">
): boolean {
  const text = getProviderErrorText(error);
  const normalized = text.toLowerCase();

  return (
    hasUpstreamCode(error, ["prompt_violation", "content_policy_violation"]) ||
    (text.includes("提示词违规") ||
      normalized.includes("content_policy") ||
      normalized.includes("policy violation") ||
      normalized.includes("safety"))
  );
}

function isUpstreamAuthOrRiskError(error: Pick<ApiErrorDetail, "message" | "upstream">): boolean {
  const text = getProviderErrorText(error);

  return (
    hasUpstreamCode(error, ["auth_required"]) ||
    text.includes("auth_required") ||
    text.includes("上游返回 403") ||
    text.includes("风控") ||
    text.includes("盾页面")
  );
}

function isReferenceRequiredError(error: Pick<ApiErrorDetail, "message" | "upstream">): boolean {
  const text = getProviderErrorText(error);

  return (
    hasUpstreamCode(error, ["reference_required"]) ||
    text.includes("需要提供参考图") ||
    (text.includes("参考图") && text.includes("需要"))
  );
}

function isDrawingModeNotTriggeredError(error: Pick<ApiErrorDetail, "message" | "upstream">): boolean {
  const text = getProviderErrorText(error);
  const normalized = text.toLowerCase();

  return (
    hasUpstreamCode(error, ["drawing_mode_not_triggered"]) ||
    text.includes("提示词没有触发画图模式") ||
    normalized.includes("drawing mode")
  );
}

function isUpstreamTimeoutError(error: Pick<ApiErrorDetail, "message" | "upstream">): boolean {
  const text = getProviderErrorText(error);
  const normalized = text.toLowerCase();

  return (
    hasUpstreamCode(error, ["upstream_timeout"]) ||
    text.includes("等待超时") ||
    normalized.includes("context deadline") ||
    normalized.includes("deadline exceeded") ||
    normalized.includes("timeout")
  );
}

function isUpstreamNotFoundError(error: Pick<ApiErrorDetail, "message" | "upstream">): boolean {
  const text = getProviderErrorText(error).toLowerCase();

  return (
    hasUpstreamCode(error, ["upstream_not_found"]) ||
    error.upstream?.statusCode === 404 ||
    readStatusCodeFromMessage(error.message) === 404 ||
    text.includes("bad response status code 404")
  );
}

function isUpstreamBadRequestError(error: Pick<ApiErrorDetail, "message" | "upstream">): boolean {
  return (
    hasUpstreamCode(error, ["upstream_bad_request"]) ||
    error.upstream?.statusCode === 400 ||
    readStatusCodeFromMessage(error.message) === 400
  );
}

function hasUpstreamCode(
  error: Pick<ApiErrorDetail, "upstream">,
  codes: string[]
): boolean {
  const code = (error.upstream?.code || "").toLowerCase();
  return codes.includes(code);
}

function getProviderErrorText(error: Pick<ApiErrorDetail, "message" | "upstream">): string {
  const rawResponse =
    error.upstream?.rawResponse !== undefined
      ? formatRawUpstreamResponse(error.upstream.rawResponse)
      : "";

  return [
    error.message,
    error.upstream?.message,
    error.upstream?.code,
    error.upstream?.type,
    rawResponse
  ]
    .filter(Boolean)
    .join(" ");
}

function isGiftBalanceRechargeRequired(message: string | undefined): boolean {
  const normalized = message || "";
  return (
    normalized.includes("历史充值") &&
    normalized.includes("余额服务") &&
    normalized.includes("充值")
  );
}

function readStatusCodeFromMessage(message: string | undefined): number | undefined {
  const match = (message || "").match(/\bstatus_code\s*=\s*(\d{3})\b/i);
  return match ? Number(match[1]) : undefined;
}

function buildProviderDebugDetail(
  error: Pick<ApiErrorDetail, "message" | "upstream">
): string | undefined {
  if (!error.upstream) {
    return error.message;
  }

  const upstreamLines = [
    error.upstream.statusCode ? `upstream_status_code=${error.upstream.statusCode}` : "",
    error.upstream.gatewayStatus ? `gateway_status=${error.upstream.gatewayStatus}` : "",
    error.upstream.code ? `upstream_code=${error.upstream.code}` : "",
    error.upstream.type ? `upstream_type=${error.upstream.type}` : "",
    error.upstream.message ? `upstream_message=${error.upstream.message}` : "",
    error.upstream.rawResponse !== undefined
      ? `upstream_response:\n${formatRawUpstreamResponse(error.upstream.rawResponse)}`
      : ""
  ].filter(Boolean);

  return [error.message, ...upstreamLines].filter(Boolean).join("\n");
}

function formatRawUpstreamResponse(rawResponse: unknown): string {
  if (typeof rawResponse === "string") {
    return rawResponse;
  }

  try {
    return JSON.stringify(rawResponse, null, 2);
  } catch {
    return String(rawResponse);
  }
}

export function tipFromActionFailure(failure: StudioActionFailure): StudioTip {
  switch (failure.kind) {
    case "integration":
      return {
        type: "info",
        title: "暂未接入",
        message: withOptionalDetail(`${failure.feature} 暂未接入后端服务。`, failure.detail)
      };
    case "login_required":
      return {
        type: "warning",
        title: "需要登录",
        message: `请登录后再${failure.action}。`,
        actionLabel: "去登录",
        actionHref: failure.actionHref
      };
    case "disabled":
      return {
        type: "info",
        title: "操作不可用",
        message: `${failure.action} 当前不可用。${sanitizeTipText(failure.reason) || "请完成必要步骤后再试。"}`
      };
    case "failed":
      return {
        type: "error",
        title: "操作失败",
        message: withDebugDetail(`${failure.action} 没有完成，请稍后重试。`, errorMessage(failure.error))
      };
  }
}

function withOptionalDetail(message: string, detail?: string): string {
  const cleanedDetail = sanitizeTipText(detail);
  return cleanedDetail ? `${message}${cleanedDetail}` : message;
}

function withDebugDetail(
  message: string,
  detail?: string,
  options: { preserveWhitespace?: boolean } = {}
): string {
  const cleanedDetail = sanitizeTipText(detail, options);

  if (!cleanedDetail || message.includes(cleanedDetail)) {
    return message;
  }

  return `${message}\n调试信息：${cleanedDetail}`;
}

function errorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : undefined;
}

function sanitizeTipText(
  text: string | undefined,
  options: { preserveWhitespace?: boolean } = {}
): string {
  if (!text) {
    return "";
  }

  if (options.preserveWhitespace) {
    return text.trim();
  }

  const withoutTags = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const cleaned = withoutTags.replace(/\s+/g, " ").trim();

  return cleaned.length > 300 ? `${cleaned.slice(0, 300).trim()}...` : cleaned;
}
