import { describe, expect, it } from "vitest";
import { appendPromptToken, buildPromptFromLibraryItem } from "./studioPrompt";

describe("studio prompt helpers", () => {
  it("appends a prompt token without duplicating existing text", () => {
    expect(appendPromptToken("柔和晨光下的山间湖泊", "电影感")).toBe(
      "柔和晨光下的山间湖泊，电影感"
    );
  });

  it("does not append a token that is already present", () => {
    expect(appendPromptToken("柔和晨光下的山间湖泊，电影感", "电影感")).toBe(
      "柔和晨光下的山间湖泊，电影感"
    );
  });

  it("builds a usable prompt when a library item is applied to an empty prompt", () => {
    expect(buildPromptFromLibraryItem("", "赛博朋克")).toBe(
      "赛博朋克，精致构图，高质量图像"
    );
  });
});
