export function getPromptLibraryImageLoading(index: number): "eager" | "lazy" {
  return index >= 0 && index < 8 ? "eager" : "lazy";
}
