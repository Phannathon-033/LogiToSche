import { normalizeLogisticsJsonSchema } from "./dataValidationService";
import { getCachedOcr, hashFile, saveCachedOcr } from "./ocrCache";
import { runPaddleOcr, type OcrApiResponse, type OcrLanguage } from "./ocrApi";
import { runSlmExtraction, type SlmExtractionResult } from "./slmApi";

interface ProcessDocumentOptions {
  file: File;
  documentTypeHint: string;
  sourceFile: string;
  language: OcrLanguage;
  useOcrCache?: boolean;
}

export interface ProcessedDocumentResult {
  ocr: OcrApiResponse;
  slm: SlmExtractionResult;
  normalizedSchema: ReturnType<typeof normalizeLogisticsJsonSchema>["normalized"];
  fileHash?: string;
  usedCachedOcr: boolean;
}

export async function runSharedOcr(file: File, language: OcrLanguage, useOcrCache = true) {
  let fileHash: string | undefined;
  let cachedOcr: OcrApiResponse | null = null;

  if (useOcrCache) {
    fileHash = await hashFile(file);
    cachedOcr = getCachedOcr(fileHash, language);
  }

  const ocr = cachedOcr || await runPaddleOcr(file, language);
  if (!cachedOcr && fileHash) saveCachedOcr(fileHash, ocr);

  return { ocr, fileHash, usedCachedOcr: Boolean(cachedOcr) };
}

export async function runSharedSlm(documentTypeHint: string, sourceFile: string, ocr: OcrApiResponse) {
  const slm = await runSlmExtraction({
    documentTypeHint,
    sourceFile,
    ocrText: ocr.text || "PaddleOCR ไม่พบข้อความในไฟล์นี้",
    ocrLines: ocr.lines,
  });
  return { slm, normalizedSchema: normalizeLogisticsJsonSchema(slm.jsonOutput).normalized };
}

export async function processDocumentWithOcrAndSlm({
  file,
  documentTypeHint,
  sourceFile,
  language,
  useOcrCache = true,
}: ProcessDocumentOptions): Promise<ProcessedDocumentResult> {
  const { ocr, fileHash, usedCachedOcr } = await runSharedOcr(file, language, useOcrCache);
  const { slm, normalizedSchema } = await runSharedSlm(documentTypeHint, sourceFile, ocr);

  return { ocr, slm, normalizedSchema, fileHash, usedCachedOcr };
}
