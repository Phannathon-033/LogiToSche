## ตารางผลการทดลอง 5-Fold Cross-Validation ระบบแปลงเอกสารสู่ JSON Schema
**จำนวนเอกสาร:** 300 ฉบับ | **Prompt version:** v1 | **Run ID:** `run_20260927_184811_766374`

| ฟิลด์ข้อมูลหลัก | ความแม่นยำเฉลี่ย (Mean ± SD) | F1-Score |
| :--- | :---: | :---: |
| 1. ประเภทเอกสาร (document_type) | 92.7% ± 1.7% | 92.7% |
| 2. เลขที่เอกสาร (document_number) | 64.0% ± 4.5% | 64.7% |
| 3. วันที่เอกสาร (document_date) | 57.0% ± 4.1% | 62.8% |
| 4. ผู้ส่ง / ผู้ขาย (sender) | 50.3% ± 6.9% | 52.1% |
| 5. ผู้รับ / ผู้ซื้อ (receiver) | 86.0% ± 3.3% | 87.5% |
| 6. ต้นทาง (origin) | 51.3% ± 3.6% | 52.4% |
| 7. ปลายทาง (destination) | 48.7% ± 4.6% | 53.1% |
| 8. เลขที่อ้างอิง (reference_number) | 81.7% ± 3.5% | 87.5% |
| 9. ราคาต่อหน่วย (unit_price) | 74.3% ± 5.7% | 74.3% |
| 10. มูลค่ารวม (total_amount) | 76.3% ± 4.1% | 76.3% |
| 11. สกุลเงิน (currency) | 97.3% ± 0.8% | 97.3% |

**Overall Accuracy:** 70.88% ± 1.70%
**F1-Score:** 73.02% ± 1.60%
**Predictions:** `C:\Users\Administrator\LogiToSche\Web\backend\reports\run_20260927_184811_766374_predictions.json`