import { describe, expect, it } from "vitest";
import { selectCanvasImage } from "./studioCanvas";

describe("studio canvas helpers", () => {
  it("does not select a default image before the user generates or chooses one", () => {
    expect(selectCanvasImage({ images: [], selectedInspirationImage: null })).toBeNull();
  });

  it("prefers generated images over selected inspiration images", () => {
    expect(
      selectCanvasImage({
        images: [{ url: "https://cdn.lumio.games/result.png", mimeType: "image/png" }],
        selectedInspirationImage: "/prompt-library/case1.jpg"
      })
    ).toEqual({
      url: "https://cdn.lumio.games/result.png",
      mimeType: "image/png"
    });
  });

  it("preserves generated image keys for later reference reuse", () => {
    expect(
      selectCanvasImage({
        images: [
          {
            key: "generated/result-key",
            url: "https://cdn.lumio.games/result.png",
            mimeType: "image/png"
          }
        ],
        selectedInspirationImage: null
      })
    ).toEqual({
      key: "generated/result-key",
      url: "https://cdn.lumio.games/result.png",
      mimeType: "image/png"
    });
  });
});
