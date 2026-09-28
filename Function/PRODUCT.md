# Product

## Register

LogiSchema

## Product Name

LogiSchema: Multi-format Logistics Document Conversion into JSON Schema Using OCR and SLMs

## Project Context

LogiSchema is a student research prototype for converting logistics documents into a consistent JSON Schema. The project proposal is for undergraduate research funding at Prince of Songkla University, Surat Thani Campus, fiscal year 2569, semester 1/2569.

The research problem is that logistics operations rely on many document types, such as delivery orders, bills of lading, invoices, packing lists, purchase orders, and scanned transport documents. These documents often come from different companies with different layouts and field labels. Manual re-keying is slow, error-prone, and delays downstream systems.

OCR can convert PDFs, images, and scans into text, but OCR alone does not understand semantic context. LogiSchema combines OCR with a Small Language Model (SLM) so labels with the same meaning, such as `Consignee`, `Receiver`, and `Ship To`, can map to one standard field.

## Users

Primary users are logistics operations staff, document controllers, and reviewers who need to convert English-language logistics documents into structured data for databases, ERP systems, APIs, and dashboards.

Secondary users are researchers and developers evaluating document information extraction accuracy, prompt design, confidence scoring, and schema validation.

## Product Purpose

LogiSchema turns multi-format logistics documents into normalized JSON. The product demonstrates a workflow from document upload through OCR extraction, semantic field mapping, JSON generation, validation, manual review, and export.

The intended production system should reduce manual data entry, reduce repeated keying work, improve processing speed, reduce human error, and make logistics data easier to store, search, verify, and connect to other information systems.

## Research Objectives

- Develop a working OCR + SLM pipeline for extracting information from logistics documents.
- Convert multiple logistics document formats into a common JSON Schema.
- Define a reusable JSON Schema for storing logistics document data in one standard structure.
- Evaluate extraction correctness using metrics such as Precision, Recall, and F1 Score against ground truth data.

## Supported Inputs

- PDF documents
- JPG images
- PNG images
- Scanned document images

The research scope currently targets English-language logistics documents only.

## Target Output

The output is structured JSON validated against a predefined JSON Schema. Out-of-scope or extra fields should be retained in an `other` field so the system does not silently discard useful data.

Target schema fields are based on shipping and invoice extraction research:

- `ocean_vessel_name`
- `port_of_loading`
- `invoice_date`
- `shipped_on_board_date`
- `quantity`
- `invoice_no`
- `total_amount`
- `carrier_company`
- `bill_of_lading_no`
- `total_containers_no`
- `containers_20ft_no`
- `containers_40ft_no`
- `packing`
- `other`

The current web prototype uses a smaller mock delivery-order schema with fields such as `receiver_name`, `truck_plate`, `delivery_order_no`, and `gross_weight_kg`.

## Workflow

1. Upload a logistics document.
2. Preview document metadata and page content.
3. Pre-process the document image, including noise reduction where needed.
4. Run OCR to detect text areas and extract raw text, bounding boxes, and confidence scores.
5. Prepare OCR output as input for the language model.
6. Use an SLM with prompt engineering to map source labels to standard schema fields.
7. Generate normalized JSON.
8. Validate JSON structure, required fields, data types, and confidence thresholds.
9. Send low-confidence or suspicious fields to manual review.
10. Export JSON or store approved data for downstream systems.

Presentation shorthand:

- OCR is the "eyes" of the system: it reads document characters and locations.
- SLM is the "brain" of the system: it interprets meaning, performs semantic mapping, and structures results into the target schema.

## OCR Processing Steps

The presentation describes OCR as a simple document-reading pipeline:

1. Receive a PDF, JPG, or PNG document.
2. Automatically improve the image and reduce noise.
3. Detect text regions in the document.
4. Convert detected text into digital text.
5. Return text, position data, and confidence scores for downstream SLM analysis.

PaddleOCR is selected because it can read text and numbers, locate text positions, produce confidence scores, and support multiple document formats. Its limitation is that it reads text but does not understand semantic meaning, and accuracy can drop when scans are unclear.

## SLM Role

Qwen2.5-1.5B-Instruct is the target SLM in the prototype direction. It is selected because it is small enough for limited-resource experimentation, can follow prompts, can analyze OCR text, can help with semantic mapping, can generate JSON according to a schema, and can potentially be fine-tuned in the future.

The SLM is responsible for:

- Understanding field meaning from raw OCR text.
- Mapping different labels with the same meaning into one standard field.
- Identifying important logistics data.
- Producing structured JSON according to the target JSON Schema.

## Technology Direction

- Frontend prototype: Next.js 14, React 18, TypeScript, Tailwind CSS, lucide-react.
- OCR target: PaddleOCR for text detection, recognition, bounding boxes, and confidence scores.
- Language model target: Qwen2.5-1.5B-Instruct as the SLM for semantic mapping and structured extraction.
- Prompt strategy: Prompt Engineering with room for APE, IPC, Few-shot examples, and prompt tuning.
- Data validation: JSON Schema validation plus rule-based post-processing for domain-specific formats.
- Database target: Firebase Cloud Firestore for storing validated JSON as documents and collections.
- Runtime/experimentation: Google Colab for model loading and inference during research.

## Prototype Status

The current `Web_App` is a frontend-only prototype. It does not run real OCR, SLM inference, Firestore persistence, or file upload processing yet.

Implemented prototype behavior:

- Bilingual UI scaffold for Thai and English.
- Step workflow: Upload, Preview, OCR, Mapping, JSON, Validation, Review, Export.
- Mock upload and document preview.
- Mock OCR line confidence.
- Mock semantic mapping into schema keys.
- Mock JSON output.
- Mock validation and confidence warnings.
- Manual review UI for correcting a low-confidence field.
- Mock export actions for JSON, API send, and review save.

## Validation And Review Principles

- Confidence scores must remain visible from OCR through review.
- Low-confidence fields should not be exported without reviewer confirmation.
- Validation should cover completeness, data type, date format, numeric format, schema compliance, and domain-specific formats such as vehicle registration or container counts.
- Reviewers should be able to compare extracted values with suggested corrections and confirm corrected data before export.

## Product Requirements

- Keep the document-processing pipeline inspectable.
- Make confidence, validation state, and manual-review status visible at all times.
- Separate extraction data from UI components so real OCR, SLM, and database APIs can replace mock data later.
- Support future integration with ERP, API, dashboard, and database workflows.
- Preserve extra extracted information in `other` rather than dropping it.
- Require internet connectivity for the target research system where cloud database and cloud runtime are used.

## Evaluation Plan

The system should be evaluated by:

- OCR extraction quality across different document layouts.
- JSON conversion correctness against the target schema.
- Precision, Recall, and F1 Score against ground truth.
- Document-level extraction accuracy.
- Error analysis for OCR mistakes, date formats, numeric values, container counts, and semantic field mismatches.

## Research References Reflected In Product Direction

- Wang and Shen (2025), Hybrid OCR-LLM framework for enterprise-scale document information extraction under copy-heavy task.
- Chen et al. (2025), Evaluation of prompt engineering on the performance of a large language model in document information extraction.
- Qwen Team (2025), Qwen2.5 technical report.
- Firebase documentation for Cloud Firestore.
- RVL-CDIP dataset as a reference dataset for document classification/extraction experiments.

## Local Source Documents Read

- Thai research proposal `.doc`
- Signed Thai research proposal `.pdf`
- `Hybrid OCR-LLM Framework for Enterprise-Scale Document.pdf`
- `Evaluation of Prompt Engineering on the Performance of a Large.pdf`
- Project SLM logistics-document conversion slide deck `.pdf`

## Brand Personality

Clear, precise, operational, and review-focused.

## Anti-references

Avoid marketing landing-page composition, decorative AI imagery, novelty controls, and interfaces that hide document review details behind oversized hero sections.

## Design Principles

- Show the document pipeline as an inspectable workflow.
- Keep confidence, validation, and manual review visible at all times.
- Use familiar dashboard patterns so operators can trust the output.
- Prioritize dense but readable operational UI over decorative presentation.
- Separate mock extraction data from UI components so real APIs can replace it later.

## Accessibility & Inclusion

Target WCAG AA contrast, visible focus states, keyboard-accessible controls, clear form labels, predictable navigation, and reduced-motion-safe interactions.
