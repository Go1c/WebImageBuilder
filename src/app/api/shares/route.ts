import type { NextRequest } from "next/server";
import { z } from "zod";
import { createPromptShare } from "@/server/db/repositories";
import { ApiError, jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";
import { PROMPT_SHARE_COMPLIANCE_NOTICE, buildPromptShareUrl } from "@/server/shares";

export const runtime = "nodejs";

const shareSchema = z.object({
  taskId: z.string().min(1),
  imageUrl: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    const body = shareSchema.safeParse(await request.json());
    if (!body.success) {
      throw new ApiError(400, "bad_request", body.error.message);
    }

    const share = await createPromptShare({
      actor: context.actor,
      taskId: body.data.taskId,
      imageUrl: body.data.imageUrl
    });
    if (!share) {
      throw new ApiError(404, "not_found", "Shareable generation result not found");
    }

    const response = jsonOk({
      share: {
        id: share.id,
        url: buildPromptShareUrl(share.id, request),
        complianceNotice: PROMPT_SHARE_COMPLIANCE_NOTICE
      }
    });
    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}
