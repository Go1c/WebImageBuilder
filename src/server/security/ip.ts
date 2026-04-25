import { createHash, randomUUID } from "crypto";
import type { NextRequest } from "next/server";

export const DEVICE_COOKIE = "lumio_device_id";
export const INVITE_COOKIE = "lumio_invite_code";

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function hashIdentifier(value: string, salt = process.env.FINGERPRINT_SALT || "lumio"): string {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function getOrCreateDeviceId(request: NextRequest): {
  deviceId: string;
  isNew: boolean;
} {
  const existing = request.cookies.get(DEVICE_COOKIE)?.value;
  if (existing) {
    return { deviceId: existing, isNew: false };
  }

  return { deviceId: randomUUID(), isNew: true };
}
