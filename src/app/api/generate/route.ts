import type { NextRequest } from "next/server";
import { generateImagesForActor } from "@/server/generation/service";
import { jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const result = await generateImagesForActor({
      actor: context.actor,
      rawInput: await request.json(),
      sub2ApiAccessToken: context.sub2ApiAccessToken
    });

    const response = jsonOk(result);
    return applyContextCookies(response, context);
  } catch (error) {
    console.error("[api/generate] request failed", error);
    return jsonError(error);
  }
}
