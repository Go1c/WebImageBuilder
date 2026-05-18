import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "quota_exhausted"
  | "trial_resolution_unsupported"
  | "rate_limited"
  | "account_unavailable"
  | "not_found"
  | "provider_error"
  | "configuration_error"
  | "internal_error";

export type ApiErrorUpstreamDetail = {
  statusCode?: number;
  gatewayStatus?: number;
  code?: string;
  type?: string;
  message?: string;
  rawResponse?: unknown;
  contentType?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly upstream?: ApiErrorUpstreamDetail;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options: { upstream?: ApiErrorUpstreamDetail } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.upstream = options.upstream;
  }
}

export function jsonOk<T>(body: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(body, init);
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.upstream ? { upstream: error.upstream } : {})
        }
      },
      { status: error.status }
    );
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message
      }
    },
    { status: 500 }
  );
}
