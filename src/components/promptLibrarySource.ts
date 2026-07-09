import type { PromptLibraryItem } from "./promptLibrary";

export type PublicMaterial = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  imageUrl: string;
  caseNumber?: number;
};

/**
 * Map the DB-backed public materials into the shape the studio gallery renders.
 * Items without a usable image are dropped so the caller can fall back to the
 * bundled static library instead of showing broken thumbnails.
 */
export function mapPublicMaterials(items: PublicMaterial[]): PromptLibraryItem[] {
  return items
    .filter((item) => item && typeof item.imageUrl === "string" && item.imageUrl.trim().length > 0)
    .map((item, index) => ({
      id: item.id,
      caseNumber: typeof item.caseNumber === "number" && item.caseNumber > 0 ? item.caseNumber : index + 1,
      title: item.title || "未命名素材",
      category: item.category || "",
      image: item.imageUrl,
      prompt: item.prompt || ""
    }));
}

/**
 * Fetch the admin-managed material library. Returns an empty array on any
 * failure (network, non-200, empty DB) so the studio keeps its static fallback.
 */
export async function fetchPromptLibrary(signal?: AbortSignal): Promise<PromptLibraryItem[]> {
  try {
    const res = await fetch("/api/materials", { credentials: "include", signal });
    if (!res.ok) {
      return [];
    }
    const body = (await res.json()) as { items?: PublicMaterial[] };
    if (!body || !Array.isArray(body.items)) {
      return [];
    }
    return mapPublicMaterials(body.items);
  } catch {
    return [];
  }
}
