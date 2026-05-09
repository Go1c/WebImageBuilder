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

export function tipFromApiError(error: Pick<ApiErrorDetail, "code" | "message" | "status" | "statusText">): StudioTip {
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

  if (error.code === "bad_request" && isUnsupported4KSquareSize(error.message)) {
    return {
      type: "warning",
      title: "4K 不支持 1:1",
      message: withDebugDetail(
        "4K 分辨率不支持 1:1 方图。请改用 16:9（推荐 3840x2160），或先降到 1K/2K 再生成方图。",
        error.message
      )
    };
  }

  if (error.code === "bad_request" && isUnsupported4KRatioSize(error.message)) {
    return {
      type: "warning",
      title: "4K 尺寸不支持",
      message: withDebugDetail(
        "4K 的 4:3 请使用 3312x2480，3:4 请使用 2480x3312；16:9 推荐 3840x2160。",
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

  if (error.code === "provider_error" && isImageGatewayUnavailable(error.message)) {
    return {
      type: "error",
      title: "图片通道不可用",
      message: withDebugDetail(
        "上游图像通道返回 502，可能是通道临时不可用，也可能是提示词触发内容规范拦截。请先调整敏感、成人、暴力、违法或名人肖像等描述后再试；如果刚才只是偶发失败，可以再试一次。",
        error.message,
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

function isUnsupported4KSquareSize(message: string | undefined): boolean {
  const normalized = message || "";
  return normalized.includes("4K") && normalized.includes("1:1");
}

function isUnsupported4KRatioSize(message: string | undefined): boolean {
  const normalized = message || "";
  const includesRecommendedSize =
    normalized.includes("3312x2480") || normalized.includes("2480x3312");

  return (
    (normalized.includes("4K") &&
      (includesRecommendedSize || normalized.includes("size分辨率不合法"))) ||
    (normalized.includes("size分辨率不合法") && includesRecommendedSize)
  );
}

function isImageGatewayUnavailable(message: string | undefined): boolean {
  const normalized = (message || "").toLowerCase();
  return (
    normalized.includes("openai image request failed: 502") ||
    normalized.includes("upstream service temporarily unavailable") ||
    normalized.includes("origin web server returned an invalid or incomplete response") ||
    normalized.includes("origin is overloaded or misconfigured")
  );
}

function isGiftBalanceRechargeRequired(message: string | undefined): boolean {
  const normalized = message || "";
  return (
    normalized.includes("历史充值") &&
    normalized.includes("余额服务") &&
    normalized.includes("充值")
  );
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
