import { listPublicMaterials } from "@/server/admin/queries/materials";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listPublicMaterials();
    return jsonOk({ items });
  } catch (error) {
    return jsonError(error);
  }
}
