/**
 * P3 stub: PSD export
 *
 * NOT WIRED to a route yet — this is a server-side helper waiting for
 * a real ag-psd integration. Returns a placeholder ArrayBuffer.
 *
 * To finish: `pnpm add ag-psd`, then replace the stub body with:
 *   import { writePsdBuffer } from "ag-psd";
 *   const psd: Psd = { width, height, children: layers.map(...) };
 *   return writePsdBuffer(psd);
 */
export type PsdLayer = {
  name: string;
  url: string; // public URL of layer image
  x?: number;
  y?: number;
  opacity?: number; // 0..1
  blendMode?: "normal" | "multiply" | "screen" | "overlay";
};

export type PsdExportInput = {
  width: number;
  height: number;
  layers: PsdLayer[];
};

export async function exportPsd(_input: PsdExportInput): Promise<ArrayBuffer> {
  // TODO(P3): replace with ag-psd. For now return a 0-byte buffer so
  // call sites can integrate and detect "not implemented".
  throw new Error("PSD export not implemented — install ag-psd and finish src/server/export/psd.ts");
}
