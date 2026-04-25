import type { NextRequest } from "next/server";
import { generateImagesForActor } from "@/server/generation/service";
import { jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const result = await generateImagesForActor({
      actor: context.actor,
      rawInput: await request.json()
    });

    const response = jsonOk(result);
    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}
