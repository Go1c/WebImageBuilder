import type { NextRequest } from "next/server";
import { recordMaterialClick } from "@/server/admin/queries/materials";
import { jsonError, jsonOk } from "@/server/http";
import { applyContextCookies, getRequestContext } from "@/server/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public endpoint: record a user click on a material. First click per actor per
 * day lifts the material's weighted sort_order by 0.1 (see recordMaterialClick).
 * Non-uuid ids (e.g. the static fallback library) are ignored, not errored.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = await getRequestContext(request);

    let counted = false;
    if (UUID_RE.test(id)) {
      const actorKey =
        context.actor.type === "user" ? `user:${context.actor.userId}` : `device:${context.deviceId}`;
      counted = await recordMaterialClick(id, actorKey);
    }

    const response = jsonOk({ ok: true, counted });
    return applyContextCookies(response, context);
  } catch (error) {
    return jsonError(error);
  }
}
