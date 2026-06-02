# Chrome Image Download Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make generated-image downloads use Chrome's native download flow first and open the original image URL in a new tab as the fallback.

**Architecture:** Keep the behavior in the existing `imageDownload` helper. The helper fetches the app download endpoint or image URL into a blob, triggers an anchor download with the existing Lumio file name, and returns a result that lets the UI show the right tip. If blob download fails, the helper opens the image URL in a new tab. It must not use the File System Access save picker because that creates a Chrome permission indicator instead of a normal download.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest.

---

### Task 1: Download Helper Tests

**Files:**
- Modify: `src/components/imageDownload.test.ts`
- Modify: `src/components/imageDownload.ts`

**Step 1: Write the failing blob-download test**

Add a test that stubs `fetch`, `URL.createObjectURL`, and `URL.revokeObjectURL`. Expect the helper to:
- fetch the image URL,
- click a link with the blob URL,
- set the stable download file name,
- revoke the blob URL,
- return `{ mode: "blob", fileName }`.

**Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/imageDownload.test.ts`

Expected: FAIL because the helper still returns `void` and does not fetch the blob.

**Step 3: Write the failing new-tab fallback test**

Add a test where `fetch` rejects. Expect the helper to:
- call `window.open(image.url, "_blank", "noopener,noreferrer")`,
- return `{ mode: "opened", fileName }`.

**Step 4: Run the test to verify it fails**

Run: `npm test -- src/components/imageDownload.test.ts`

Expected: FAIL because the helper does not accept an open fallback yet.

### Task 2: Download Helper Implementation

**Files:**
- Modify: `src/components/imageDownload.ts`

**Step 1: Implement the result type**

Add a union such as:

```ts
export type DownloadGeneratedImageResult =
  | { mode: "blob"; fileName: string }
  | { mode: "opened"; fileName: string };
```

**Step 2: Implement the blob path**

Use `fetch`, `response.blob()`, `URL.createObjectURL`, an anchor click, and `URL.revokeObjectURL`.

**Step 3: Implement the new-tab fallback**

If the blob path throws or the response is not OK, call `window.open(image.url, "_blank", "noopener,noreferrer")`. If the fallback cannot open a tab, throw an error so the UI can show the existing failure tip.

**Step 4: Run tests**

Run: `npm test -- src/components/imageDownload.test.ts`

Expected: PASS.

### Task 3: Image Studio Tips

**Files:**
- Modify: `src/components/ImageStudio.tsx`

**Step 1: Update the download handler**

Read the helper result. Show:
- `正在下载` before the helper starts work.
- `下载完成` when the helper returns a browser download mode.
- `已打开原图` when `mode === "opened"`.

**Step 2: Run focused tests**

Run: `npm test -- src/components/imageDownload.test.ts`

Expected: PASS.

### Task 4: Verification

**Files:**
- No code changes.

**Step 1: Run the full test suite**

Run: `npm test`

Expected: PASS.

**Step 2: Run the production build**

Run: `npm run build`

Expected: PASS.
