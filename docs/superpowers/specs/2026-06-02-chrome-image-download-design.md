# Chrome Image Download Design

## Goal

Make generated-image downloads feel like a real Chrome download. The user should get clear feedback when the app prepares a download, completes the handoff to Chrome, or falls back to opening the image URL.

## User Experience

- The download button first tries the app download endpoint, then fetches the image, creates a blob URL, and clicks an anchor with a stable file name.
- If the blob path works, Chrome handles the file through its normal download flow.
- If the blob path fails, the app opens the original image URL in a new tab.
- The app does not call the File System Access save picker because that creates a Chrome permission indicator instead of a normal download.
- The toast explains which path ran: preparing download, download complete, original image opened, or download failed.
- Disabled states stay unchanged and still show the current action tips.

## Implementation

- Update `src/components/imageDownload.ts` to return a structured result instead of `void`.
- Use `/api/download` where possible, then `fetch(image.url)`, `response.blob()`, `URL.createObjectURL(blob)`, and `URL.revokeObjectURL()`.
- Keep file-name generation in `buildDownloadFileName`.
- Add a dependency-injected `window.open` fallback so tests can verify the new-tab behavior.
- Update `src/components/ImageStudio.tsx` to show success copy for the blob path and fallback copy for the new-tab path.

## Testing

- Add failing tests for the blob download path.
- Add failing tests for the fetch-failure fallback that opens a new URL.
- Keep existing file-name tests.
- Run focused component-helper tests, then run the full test suite and build.
