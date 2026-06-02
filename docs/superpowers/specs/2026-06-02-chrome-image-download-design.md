# Chrome Image Download Design

## Goal

Make generated-image downloads feel like a real Chrome download. The user should get clear feedback when the app starts a download or falls back to opening the image URL.

## User Experience

- The download button first tries to fetch the image, create a blob URL, and click an anchor with a stable file name.
- If the blob path works, Chrome handles the file through its normal download flow.
- If the blob path fails, the app opens the original image URL in a new tab.
- The toast explains which path ran: download started, original image opened, or download failed.
- Disabled states stay unchanged and still show the current action tips.

## Implementation

- Update `src/components/imageDownload.ts` to return a structured result instead of `void`.
- Use `fetch(image.url)`, `response.blob()`, `URL.createObjectURL(blob)`, and `URL.revokeObjectURL()`.
- Keep file-name generation in `buildDownloadFileName`.
- Add a dependency-injected `window.open` fallback so tests can verify the new-tab behavior.
- Update `src/components/ImageStudio.tsx` to show success copy for the blob path and fallback copy for the new-tab path.

## Testing

- Add failing tests for the blob download path.
- Add failing tests for the fetch-failure fallback that opens a new URL.
- Keep existing file-name tests.
- Run focused component-helper tests, then run the full test suite and build.
