/**
 * Native hook for a later dev build. A store build can swap this file’s
 * body for on-device Vision or ML Kit (for example expo-text-extractor)
 * without changing the review screen. The photo or PDF stays on the device.
 */
export async function extractImageText(_file: Blob): Promise<string> {
  throw new Error("Photo reading on iOS and Android is ready for an on-device text engine. Use a PDF or the sample stub in this build.");
}

export async function extractPdfText(_data: ArrayBuffer): Promise<string> {
  throw new Error("PDF reading on iOS and Android is ready for the same on-device path. This installed copy reads PDFs in the browser build.");
}
