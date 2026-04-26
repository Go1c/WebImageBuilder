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
      message: "当前可用生成次数不足，请登录、邀请好友或稍后再试。"
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
  const mappedTip = error.code ? apiErrorTipMap.get(error.code) : undefined;

  if (mappedTip) {
    return {
      ...mappedTip,
      message: withDebugDetail(mappedTip.message, error.message)
    };
  }

  const fallbackDetail = error.message || `HTTP ${error.status}${error.statusText ? ` ${error.statusText}` : ""}`;

  return {
    type: "error",
    title: "请求失败",
    message: withDebugDetail("请求没有完成，请稍后重试。", fallbackDetail)
  };
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

function withDebugDetail(message: string, detail?: string): string {
  const cleanedDetail = sanitizeTipText(detail);

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

function sanitizeTipText(text: string | undefined): string {
  if (!text) {
    return "";
  }

  const cleaned = text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 300 ? `${cleaned.slice(0, 300).trim()}...` : cleaned;
}
