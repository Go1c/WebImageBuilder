import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "quota_exhausted"
  | "rate_limited"
  | "not_found"
  | "provider_error"
  | "configuration_error"
  | "internal_error";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
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
          message: error.message
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
