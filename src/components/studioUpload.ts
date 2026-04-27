import { readApiError } from "./apiErrors";

export type StudioUploadAssetType = "reference" | "mask";

export type StudioUploadedAsset = {
  key: string;
  url: string;
  mimeType?: string;
};

export async function uploadStudioAsset(
  file: File,
  assetType: StudioUploadAssetType
): Promise<StudioUploadedAsset> {
  const body = new FormData();
  body.set("file", file);
  body.set("assetType", assetType);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as StudioUploadedAsset;
}
