import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPromptShare } from "@/server/db/repositories";
import { ApiError, jsonError } from "@/server/http";
import { fetchAsset } from "@/server/providers/types";
import { downloadStoredAsset } from "@/server/storage/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const share = await getPromptShare(id);
    if (!share) {
      throw new ApiError(404, "not_found", "Share image not found");
    }

    const asset =
      share.imageStorageKey && !share.imageUrl.startsWith("data:")
        ? await downloadStoredAsset(share.imageStorageKey)
        : await fetchAsset(share.imageUrl);

    return new NextResponse(Uint8Array.from(asset.buffer), {
      status: 200,
      headers: {
        "Content-Type": share.imageMimeType || asset.mimeType || "image/png",
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
