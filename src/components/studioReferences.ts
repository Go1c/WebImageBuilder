export type ReferencePreviewItem = {
  id: string;
  kind: "file" | "reused";
  url: string;
  alt: string;
  fileIndex?: number;
  reusedIndex?: number;
};

export type ReusedReferenceLike = {
  key: string;
  url: string;
};

export function appendReferenceFiles(currentFiles: File[], selectedFiles: Iterable<File> | null): File[] {
  const nextFiles = Array.from(selectedFiles || []);

  if (!nextFiles.length) {
    return currentFiles;
  }

  return [...currentFiles, ...nextFiles];
}

export function removeReferenceFileAt(files: File[], indexToRemove: number): File[] {
  return files.filter((_, index) => index !== indexToRemove);
}

export function appendReusedReference<T extends ReusedReferenceLike>(
  currentReferences: T[],
  nextReference: T
): T[] {
  return [...currentReferences, nextReference];
}

export function removeReusedReferenceAt<T>(references: T[], indexToRemove: number): T[] {
  return references.filter((_, index) => index !== indexToRemove);
}

export function buildReferencePreviewItems(input: {
  reusedReferenceUrls?: string[];
  filePreviewUrls: string[];
}): ReferencePreviewItem[] {
  const items: ReferencePreviewItem[] = [];

  (input.reusedReferenceUrls || []).forEach((url, reusedIndex) => {
    items.push({
      id: `reused-reference-${reusedIndex}`,
      kind: "reused",
      reusedIndex,
      url,
      alt: `参考图 ${items.length + 1}`
    });
  });

  input.filePreviewUrls.forEach((url, fileIndex) => {
    items.push({
      id: `file-reference-${fileIndex}`,
      kind: "file",
      fileIndex,
      url,
      alt: `参考图 ${items.length + 1}`
    });
  });

  return items;
}
