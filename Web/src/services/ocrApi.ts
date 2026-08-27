export interface OcrPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  region?: string;
  tag?: string;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bounding_box?: number[][];
  box?: number[][];
  position?: OcrPosition;
}

export interface OcrApiResponse {
  text: string;
  spatial_text?: string;
  lines: OcrLine[];
  engine: string;
  language: OcrLanguage;
}

export type OcrLanguage = "th" | "en";

export async function runPaddleOcr(file: File, language: OcrLanguage): Promise<OcrApiResponse> {
  const body = new FormData();
  body.append("file", file);
  body.append("lang", language);

  const response = await fetch("/api/ocr", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `OCR request failed with ${response.status}`);
  }

  return (await response.json()) as OcrApiResponse;
}
