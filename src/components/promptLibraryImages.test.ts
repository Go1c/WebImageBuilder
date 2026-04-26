import { describe, expect, it } from "vitest";
import { getPromptLibraryImageLoading } from "./promptLibraryImages";

describe("prompt library image loading", () => {
  it("loads initially visible prompt library images eagerly", () => {
    expect(getPromptLibraryImageLoading(0)).toBe("eager");
    expect(getPromptLibraryImageLoading(7)).toBe("eager");
  });

  it("keeps offscreen prompt library images lazy", () => {
    expect(getPromptLibraryImageLoading(-1)).toBe("lazy");
    expect(getPromptLibraryImageLoading(8)).toBe("lazy");
  });
});
