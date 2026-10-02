import type { OcrApiResponse, OcrLanguage } from "./ocrApi";

const OCR_CACHE_KEY = "logiai_ocr_cache_v1";
const MAX_CACHE_ENTRIES = 50;

type CachedOcrResult = Omit<OcrApiResponse, "image_preview"> & {
  fileHash: string;
  cachedAt: string;
};

function cacheKey(fileHash: string, language: OcrLanguage): string {
  return `${fileHash}:${language}`;
}

function readCache(): CachedOcrResult[] {
  try {
    const raw = localStorage.getItem(OCR_CACHE_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

export async function hashFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getCachedOcr(fileHash: string, language: OcrLanguage): CachedOcrResult | null {
  const key = cacheKey(fileHash, language);
  const entry = readCache().find((candidate) => cacheKey(candidate.fileHash, candidate.language) === key);
  if (!entry) return null;
  return {
    text: entry.text || "",
    spatial_text: entry.spatial_text || "",
    lines: Array.isArray(entry.lines) ? entry.lines : [],
    engine: entry.engine || "PaddleOCR",
    language: entry.language,
    page_count: entry.page_count,
    fileHash: entry.fileHash,
    cachedAt: entry.cachedAt,
  };
}

export function saveCachedOcr(fileHash: string, result: OcrApiResponse): void {
  try {
    const entries = readCache().filter(
      (entry) => cacheKey(entry.fileHash, entry.language) !== cacheKey(fileHash, result.language),
    );
    entries.unshift({
      text: result.text || "",
      spatial_text: result.spatial_text || "",
      lines: result.lines || [],
      engine: result.engine || "PaddleOCR",
      language: result.language,
      page_count: result.page_count,
      fileHash,
      cachedAt: new Date().toISOString(),
    });
    localStorage.setItem(OCR_CACHE_KEY, JSON.stringify(entries.slice(0, MAX_CACHE_ENTRIES)));
  } catch {
    // OCR results remain usable in memory when localStorage is unavailable.
  }
}

export function clearCachedOcr(fileHash: string, language: OcrLanguage): void {
  try {
    const entries = readCache().filter(
      (entry) => cacheKey(entry.fileHash, entry.language) !== cacheKey(fileHash, language),
    );
    localStorage.setItem(OCR_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore cache cleanup failures; the next OCR result will replace the entry.
  }
}

export type { CachedOcrResult };
