import assert from "node:assert/strict";

const { buildNormalizedDocumentPayload, buildNormalizedOcrPayload, buildNormalizedExtractedDataPayload, diffJsonSchema } =
  await import("../src/services/firebasePersistence.ts");

const id = "doc-test";
const schema = {
  document_type: "Invoice",
  document_number: "A-1",
  document_date: "2026-10-02",
  sender: "S",
  receiver: "R",
  origin: "A",
  destination: "B",
  reference_number: "R-1",
  unit_price: 2,
  total_amount: 4,
  currency: "THB",
  other: { truck: "T" },
};
const document = buildNormalizedDocumentPayload({
  id,
  userId: "u1",
  fileName: "a.pdf",
  fileType: "application/pdf",
  fileSize: "1 MB",
  fileHash: "hash-1",
  createdAt: "now",
  updatedAt: "now",
});
const ocr = buildNormalizedOcrPayload({
  documentId: id,
  lines: [{ text: "A", confidence: 0.9, bounding_box: [[1, 2], [3, 4]] }],
  rawText: "A",
  processedAt: "now",
});
const extracted = buildNormalizedExtractedDataPayload({
  documentId: id,
  schema,
  fields: [],
  confidenceScores: [],
  overallConfidence: 90,
  extractedAt: "now",
  updatedAt: "now",
});
const changed = diffJsonSchema(schema, { ...schema, other: { truck: "T2" } });

assert.equal(document.document_id, id);
assert.equal(document.file_hash, "hash-1");
assert.equal(ocr.document_id, id);
assert.equal(ocr.lines[0].bounding_box[0][0], 1);
assert.equal(extracted.other.truck, "T");
assert.deepEqual(changed.map(({ field }) => field), ["truck"]);
console.log("persistence self-check passed");
