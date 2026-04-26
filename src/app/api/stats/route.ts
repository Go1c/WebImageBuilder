import { getGlobalGenerationStats } from "@/server/db/repositories";
import { jsonError, jsonOk } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonOk(await getGlobalGenerationStats());
  } catch (error) {
    return jsonError(error);
  }
}
