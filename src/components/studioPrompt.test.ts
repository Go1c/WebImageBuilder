import { describe, expect, it } from "vitest";
import {
  appendPromptToken,
  buildPromptFromLibraryItem,
  readPromptFromSearchParam,
  readPromptFromUrl
} from "./studioPrompt";

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

  it("reads a shared prompt from the URL query string", () => {
    expect(
      readPromptFromUrl("https://img.lumio.games/?prompt=%E8%B5%9B%E5%8D%9A%E7%8C%AB")
    ).toBe("赛博猫");
  });

  it("ignores blank shared prompt URL values", () => {
    expect(readPromptFromUrl("https://img.lumio.games/?prompt=%20%20")).toBeNull();
    expect(readPromptFromUrl("not a url")).toBeNull();
  });

  it("normalizes a server search param prompt for initial render", () => {
    expect(readPromptFromSearchParam("  赛博猫  ")).toBe("赛博猫");
    expect(readPromptFromSearchParam(["first prompt", "second prompt"])).toBe("first prompt");
    expect(readPromptFromSearchParam(undefined)).toBeNull();
  });
});
