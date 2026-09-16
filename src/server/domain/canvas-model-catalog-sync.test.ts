import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { modelKeys } from "./models";

describe("canvas image model catalog stays aligned with the studio", () => {
  it("hardcodes the same default image model ids as domain modelKeys", () => {
    expect(readCanvasDefaultImageModelIds()).toEqual(modelKeys);
  });

  it("publishes those model ids in the /canvas SPA bundle", () => {
    const bundle = readPublishedCanvasBundle();
    const missing = modelKeys.filter((key) => !bundle.includes(`"${key}"`));

    expect(missing).toEqual([]);
  });
});

function readCanvasDefaultImageModelIds() {
  const source = readFileSync("canvas-app/src/stores/use-config-store.ts", "utf8");
  const match = source.match(/const DEFAULT_IMAGE_MODEL_IDS = \[([\s\S]*?)\];/);

  expect(match).toBeTruthy();

  return [...match![1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function readPublishedCanvasBundle() {
  const index = readFileSync("public/canvas/index.html", "utf8");
  const match = index.match(/src="\/canvas\/assets\/([^"]+\.js)"/);

  expect(match).toBeTruthy();

  return readFileSync(`public/canvas/assets/${match![1]}`, "utf8");
}
