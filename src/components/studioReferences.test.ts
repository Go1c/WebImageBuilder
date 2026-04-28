import { describe, expect, it } from "vitest";
import {
  appendReferenceFiles,
  appendReusedReference,
  buildReferencePreviewItems,
  removeReferenceFileAt,
  removeReusedReferenceAt
} from "./studioReferences";

describe("studio reference images", () => {
  it("appends newly selected reference files instead of replacing existing files", () => {
    const first = new File(["first"], "first.png", { type: "image/png" });
    const second = new File(["second"], "second.png", { type: "image/png" });
    const third = new File(["third"], "third.png", { type: "image/png" });

    expect(appendReferenceFiles([first], [second, third])).toEqual([first, second, third]);
  });

  it("removes only the selected uploaded reference file", () => {
    const first = new File(["first"], "first.png", { type: "image/png" });
    const second = new File(["second"], "second.png", { type: "image/png" });
    const third = new File(["third"], "third.png", { type: "image/png" });

    expect(removeReferenceFileAt([first, second, third], 1)).toEqual([first, third]);
  });

  it("appends reused canvas or library references instead of replacing uploaded files", () => {
    const first = { key: "library/one.png", url: "/prompt-library/one.png" };
    const second = { key: "library/two.png", url: "/prompt-library/two.png" };

    expect(appendReusedReference([first], second)).toEqual([first, second]);
  });

  it("removes only the selected reused reference", () => {
    const first = { key: "library/one.png", url: "/prompt-library/one.png" };
    const second = { key: "library/two.png", url: "/prompt-library/two.png" };
    const third = { key: "library/three.png", url: "/prompt-library/three.png" };

    expect(removeReusedReferenceAt([first, second, third], 1)).toEqual([first, third]);
  });

  it("builds removable preview items for reused and uploaded references", () => {
    expect(
      buildReferencePreviewItems({
        reusedReferenceUrls: [
          "https://cdn.example.com/reused-one.png",
          "https://cdn.example.com/reused-two.png"
        ],
        filePreviewUrls: ["blob:first", "blob:second"]
      })
    ).toEqual([
      {
        id: "reused-reference-0",
        kind: "reused",
        reusedIndex: 0,
        url: "https://cdn.example.com/reused-one.png",
        alt: "参考图 1"
      },
      {
        id: "reused-reference-1",
        kind: "reused",
        reusedIndex: 1,
        url: "https://cdn.example.com/reused-two.png",
        alt: "参考图 2"
      },
      {
        id: "file-reference-0",
        kind: "file",
        fileIndex: 0,
        url: "blob:first",
        alt: "参考图 3"
      },
      {
        id: "file-reference-1",
        kind: "file",
        fileIndex: 1,
        url: "blob:second",
        alt: "参考图 4"
      }
    ]);
  });
});
