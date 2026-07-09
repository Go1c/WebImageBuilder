import { describe, expect, it } from "vitest";
import { mapPublicMaterials, type PublicMaterial } from "./promptLibrarySource";

function material(overrides: Partial<PublicMaterial>): PublicMaterial {
  return {
    id: "m1",
    title: "示例素材",
    category: "测试分类",
    prompt: "a prompt",
    imageUrl: "https://cdn.lumio.games/m1.png",
    caseNumber: 7,
    ...overrides
  };
}

describe("mapPublicMaterials", () => {
  it("maps imageUrl to image and preserves caseNumber", () => {
    const [item] = mapPublicMaterials([material({})]);
    expect(item).toMatchObject({
      id: "m1",
      title: "示例素材",
      category: "测试分类",
      image: "https://cdn.lumio.games/m1.png",
      prompt: "a prompt",
      caseNumber: 7
    });
  });

  it("drops items without a usable image so the caller can fall back", () => {
    const mapped = mapPublicMaterials([
      material({ id: "a", imageUrl: "" }),
      material({ id: "b", imageUrl: "   " }),
      material({ id: "c", imageUrl: "https://cdn.lumio.games/c.png" })
    ]);
    expect(mapped.map((m) => m.id)).toEqual(["c"]);
  });

  it("falls back to a 1-based index when caseNumber is missing or invalid", () => {
    const mapped = mapPublicMaterials([
      material({ id: "a", caseNumber: undefined }),
      material({ id: "b", caseNumber: 0 })
    ]);
    expect(mapped[0].caseNumber).toBe(1);
    expect(mapped[1].caseNumber).toBe(2);
  });

  it("supplies safe defaults for empty title/prompt", () => {
    const [item] = mapPublicMaterials([material({ title: "", prompt: "" })]);
    expect(item.title).toBe("未命名素材");
    expect(item.prompt).toBe("");
  });
});
