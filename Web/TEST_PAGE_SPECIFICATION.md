# 📋 เอกสารสเปกหน้าทดสอบและประเมินผล (K-Fold Evaluation Page Specification)
> **สำหรับส่งให้ ChatGPT / UI-UX Designer เพื่อออกแบบหน้าจอ (UI Redesign Prompt)**  
> **โปรเจกต์:** LogiToSche (LogiAI Document Intelligence Architecture)  
> **โมเดล AI:** Small Language Model (`Qwen2.5-1.5B-Instruct`) + `PaddleOCR` (ภาษาไทย-อังกฤษ)  
> **ขนาดชุดข้อมูล:** N = 300 ฉบับ (11 ฟิลด์มาตรฐานตาม JSON Schema)  

---

## 🎯 1. วัตถุประสงค์และบริบทของหน้านี้ (Page Purpose & Context)
หน้านี้เป็นหน้า **"ทดสอบและประเมินผลประสิทธิภาพ (Evaluation & Thesis Benchmark)"** ของระบบแปลงเอกสารโลจิสติกส์สู่โครงสร้าง JSON มาตรฐาน 11 ฟิลด์ 
* **กลุ่มผู้ใช้งาน:** นักวิจัย, คณะกรรมการสอบวิทยานิพนธ์, และวิศวกร AI/Logistics
* **เป้าหมายหลัก:**
  1. ควบคุมและสั่งรันการทดสอบโมเดลทั้งแบบ **1 ฉบับสดบน GPU**, แบบ **Fold เดี่ยว (60 ฉบับ)**, หรือ **5-Fold ครบ 300 ฉบับ**
  2. สลับเปรียบเทียบเทคนิค Prompt ได้แก่ **Zero-Shot** (ไม่มีตัวอย่าง), **One-Shot** (มี 1 ตัวอย่าง), และ **Few-Shot** (มี 2-3 ตัวอย่าง)
  3. ติดตามสถานะการรันแบบ Real-time โดยไม่หลุด Timeout (Background Worker Engine)
  4. ดูผลวิเคราะห์ความแม่นยำ (Accuracy, F1-Score, Precision, Recall, Text Similarity) และเวลาประมวลผล (Latency)
  5. ส่งออกรายงาน (Export) เป็น **ตาราง Markdown สำหรับเล่มวิทยานิพนธ์**, **ไฟล์ Excel 4 ชีตสมบูรณ์ (.xlsx)**, และ **CSV/JSON**

---

## 🏗️ 2. สถาปัตยกรรมและฟังก์ชันหลักทั้งหมด (Feature Breakdown)

### 📌 ส่วนที่ 1: ส่วนหัวหน้าเว็บและแถบปุ่ม Export (Header & Quick Actions)
* **ชื่อหน้า:** ระบบประเมินผล 5-Fold Cross-Validation (Thesis Benchmark)
* **Badge ระบุสเปกระบบ:** `Qwen2.5-1.5B-Instruct` | `PaddleOCR (Thai/EN)` | `N=300 Documents` | `11 Canonical Fields`
* **ปุ่ม Export สำคัญ 4 ปุ่ม (มุมบนขวา):**
  1. `📋 คัดลอกตารางวิทยานิพนธ์ (Copy Thesis Markdown)`: คัดลอกตารางสรุป 5-Fold ครบ 11 ฟิลด์เข้า Clipboard ทันที
  2. `📊 ดาวน์โหลดสรุป Excel (.xlsx)`: ดาวน์โหลดสมุดงาน Excel 4 ชีต (Executive Summary, รายฉบับ, เมทริกซ์ 11 ฟิลด์, Error Analysis)
  3. `📥 ดาวน์โหลดตาราง CSV`: ดึงข้อมูลตารางสรุปผล
  4. `🧾 ดาวน์โหลดรายงาน JSON`: ดึงโครงสร้าง JSON ดิบทั้งหมด

---

### 📌 ส่วนที่ 2: แผงควบคุมการทดสอบ (Control Panel & Configuration)
ผู้ใช้สามารถตั้งค่าตัวแปรก่อนกดรันได้ดังนี้:
1. **โหมดการประเมินผล (Evaluation Mode Switcher):**
   * `1 ฉบับ (สด)`: รันสดบน GPU สำหรับเอกสารที่เลือก 1 ใบ (ทดสอบเร็ว รู้ผลใน ~2 วินาที)
   * `รอบเดี่ยว (Fold 1-5: 60 ฉบับ)`: เลือกรอบทดสอบเดี่ยวรอบละ 60 ฉบับ
   * `5-Fold ครบ 300 ฉบับ`: รัน 5 รอบต่อเนื่องครบทั้งชุดข้อมูล (ใช้เวลา ~45-60 นาที)
2. **ตัวเลือกเฉพาะโหมด (Conditional Selectors):**
   * *เมื่อเลือก 1 ฉบับ:* จะมี Dropdown ให้เลือกเอกสารเป้าหมาย เช่น `DOC-001 (INV_2024.png)` ถึง `DOC-300`
   * *เมื่อเลือกรอบเดี่ยว:* จะมีปุ่มเลือก Fold ให้กดเลือก `Fold 1`, `Fold 2`, `Fold 3`, `Fold 4`, `Fold 5`
3. **Prompt Variant Selector (สำคัญมาก):**
   * `Zero-shot`: สกัดโดยไม่มีตัวอย่าง (วัดความสามารถ Base Model)
   * `One-shot`: ดึงตัวอย่าง 1 ฉบับจาก Training Set ใส่ใน Prompt
   * `Few-shot`: ดึงตัวอย่าง 2–3 ฉบับจาก Training Set ใส่ใน Prompt
4. **Random Seed:** Dropdown สุ่มแบ่ง Fold เช่น `Seed: 42 (Default)`, `123`, `999`
5. **ปุ่มสั่งเริ่มงาน (Run CTA Button):**
   * แสดงสถานะชัดเจน เช่น `"เริ่มทดสอบสด 1 ฉบับ (DOC-001)"` หรือ `"เริ่มประเมิน 5-Fold ครบ 300 ฉบับ"`
   * เมื่อรันอยู่จะเปลี่ยนเป็นปุ่ม Loading พร้อมข้อความบอกความคืบหน้า

---

### 📌 ส่วนที่ 3: แดชบอร์ดติดตามงานสด (Background Job Dashboard - Zero Timeout Engine)
กล่องคอนโซลสดที่แสดงขึ้นมาระหว่างโมเดลกำลังประมวลผลบน GPU:
1. **Header ของ Job:**
   * Job ID (เช่น `eval_20260924_153000_5f`)
   * ป้ายสถานะ: `● กำลังประมวลผลบน GPU (Running)`, `✓ เสร็จสมบูรณ์ (Completed)`, หรือ `⏸ พักชั่วคราว (Stopped)`
   * ป้ายโหมด: `VARIANT: ZERO-SHOT` / `VARIANT: ONE-SHOT` / `VARIANT: FEW-SHOT`
2. **ปุ่มควบคุมการรัน (Live Job Controls):**
   * `Checkbox: Resume (ข้ามเอกสารเดิม)`: หากเคยรันไปแล้ว จะข้ามเอกสารที่มีแคชเพื่อประหยัดเวลา
   * `ปุ่ม: หยุดการประมวลผล (Stop)`: ส่งสัญญาณให้หยุดหลังจบฉบับปัจจุบันอย่างปลอดภัย
   * `ปุ่ม: รันต่อ (Resume)`: รันต่อจากจุดที่ค้างไว้
   * `ปุ่ม: รีเซ็ต (Reset)`: ล้างงานเดิมเพื่อเริ่มใหม่
3. **หลอดความคืบหน้าคู่ (Dual Progress Bars):**
   * **Overall Progress:** แสดงความคืบหน้ารวมทั้งระบบ (เช่น `150 / 300 ฉบับ (50.0%)`)
   * **Fold Progress:** แสดงความคืบหน้าใน Fold ปัจจุบัน (เช่น `30 / 60 ฉบับ (50.0%)`)
4. **การ์ดตัวเลขสถิติสด (Live Metric Cards):**
   * *Current Document:* แสดง `DOC-045` และชื่อไฟล์ภาพ
   * *Elapsed Time:* เวลาที่เดินไปแล้ว (รูปแบบ `MM:SS`)
   * *Live Accuracy:* ความแม่นยำสะสม ณ ปัจจุบัน (เช่น `95.2%`)
   * *Processed Count:* จำนวนฉบับที่รันสดบน GPU vs ดึงจากแคช
5. **กล่องแสดง Log สด (Live Console Terminal Logs):**
   * แสดงผลบันทึกรายบรรทัดแบบ Terminal autoscroll เช่น:  
     `[GPU LIVE] DOC-042 (Fold 1 42/60) -> 11/11 PASS | OCR: 0.85s, SLM: 1.15s, Total: 2.00s | Acc: 95.2%`

---

### 📌 ส่วนที่ 4: แถบแสดงผลลัพธ์และรายงานผล (Results & Analytics Tabs)
แบ่งเป็น 4 แท็บย่อย:

#### 📊 แท็บ 1: ภาพรวมสถิติ (Overview Dashboard)
* **การ์ดสรุปเมตริกหลัก 4 ค่า:**
  1. **Overall Accuracy (ความแม่นยำรวม):** แสดงค่าเฉลี่ย ± ส่วนเบี่ยงเบนมาตรฐาน (เช่น `95.42% ± 1.15%`)
  2. **Overall F1-Score:** ค่าเฉลี่ย F1 รวมทุกฟิลด์ (เช่น `94.80%`)
  3. **Document-Level Accuracy (ความสมบูรณ์ระดับฉบับ):** ร้อยละของฉบับที่สกัดถูกต้อง 100% ครบทั้ง 11 ฟิลด์ (เช่น `78.3%`)
  4. **Mean Text Similarity:** ความคล้ายคลึงของข้อความด้วย Levenshtein Distance (เช่น `97.10%`)
* **การ์ดสถิติเวลาประมวลผล (Latency Benchmark):**
  * เวลา OCR เฉลี่ยต่อฉบับ (เช่น `0.85s`)
  * เวลา SLM Inference เฉลี่ยต่อฉบับ (เช่น `1.15s`)
  * เวลารวม End-to-End เฉลี่ยต่อฉบับ (เช่น `2.00s`)
* **ตารางสรุปความแม่นยำรายฟิลด์ 11 ฟิลด์ (11 Core Fields Matrix Table):**
  * ตารางเปรียบเทียบคะแนนแยก Fold 1, Fold 2, Fold 3, Fold 4, Fold 5
  * คอลัมน์: `ฟิลด์ข้อมูล`, `Fold 1-5 (%)`, `Mean Accuracy (%)`, `Precision (%)`, `Recall (%)`, `F1-Score (%)`

#### ⏱️ แท็บ 2: บันทึกประสิทธิภาพการทำงาน (Performance Logs)
* ช่อง Search ค้นหาตาม Doc ID, ชื่อไฟล์ หรือ Fold
* ตารางแสดงบันทึกทุกฉบับ: `Timestamp`, `Doc ID`, `Filename`, `Fold`, `OCR Time`, `SLM Time`, `Total Time`, `Matched Fields (เช่น 11/11)`, `Accuracy (%)`
* ปุ่ม `ดาวน์โหลด CSV Log` และ `ล้างบันทึก Log`

#### 📑 แท็บ 3: รายละเอียดแต่ละ Fold (Folds Matrix)
* ข้อมูลเจาะลึกคะแนนและตัวเลขสถิติของแต่ละ Fold เพื่อดูการกระจายตัว (Variance)

#### 🖼️ แท็บ 4: คลังเอกสารและการตรวจคำตอบ (Documents & Ground Truth Viewer)
* แกลเลอรีรายชื่อเอกสารทั้งหมด 300 ฉบับ พร้อมแท็กประเภทเอกสาร
* มี Modal / Side-by-Side Panel ดูเปรียบเทียบ:
  * รูปภาพสแกนเอกสารจริง (Scanned Document Viewer)
  * เฉลยที่ถูกต้อง (Ground Truth JSON)
  * ผลลัพธ์ที่ AI ทำนายได้ (Predicted JSON)
  * ไฮไลต์สี: **สีเขียว = ถูกต้อง (Match)**, **สีแดง = ผิดพลาด (Mismatch)**

---

## 📋 3. ข้อมูล 11 ฟิลด์มาตรฐาน (The 11 Canonical Fields Dictionary)
ระบบสกัดข้อมูลเข้าสู่ 11 ฟิลด์นี้:
1. `document_type`: ประเภทเอกสาร (เช่น Invoice, Tax Invoice, Bill of Lading, PO)
2. `document_number`: เลขที่เอกสาร / เลขที่ใบกำกับ / ใบส่งของ
3. `document_date`: วันที่ออกเอกสาร (แปลงเป็นรูปแบบสากล `YYYY-MM-DD`)
4. `sender`: ชื่อผู้ส่ง / ผู้ขาย / ผู้ให้บริการ (Vendor / Shipper / Seller)
5. `receiver`: ชื่อผู้รับ / ลูกค้า / ผู้ซื้อ (Customer / Consignee / Buyer)
6. `origin`: สถานที่ต้นทาง / ท่าเรือต้นทาง / จุดรับสินค้า (Loading Port / Pickup)
7. `destination`: สถานที่ปลายทาง / ท่าเรือปลายทาง / จุดส่งสินค้า (Discharge Port / Delivery)
8. `reference_number`: เลขที่อ้างอิง / เลขที่ใบสั่งซื้อ (PO No / Booking No / Job Ref)
9. `unit_price`: ราคาต่อหน่วย (Numeric Float)
10. `total_amount`: มูลค่ารวมสุทธิ (Numeric Float)
11. `currency`: สกุลเงิน (เช่น `THB`, `USD`, `EUR`)

---

## 💡 4. Prompt สำเร็จรูปสำหรับส่งให้ ChatGPT ออกแบบ UI ใหม่
*(สามารถคัดลอกข้อความในกล่องด้านล่างนี้ ส่งให้ ChatGPT เพื่อให้ออกแบบ UI ได้ทันที)*

```markdown
คุณคือ Senior UI/UX Designer และ Lead Frontend Architect ที่เชี่ยวชาญ Tailwind CSS และ React
ช่วยออกแบบ UI ใหม่สำหรับ "หน้าทดสอบและประเมินผล AI โลจิสติกส์ (5-Fold Cross-Validation Thesis Benchmark)" ให้สวยงาม ทันสมัย ใช้งานง่าย มีความเป็นมืออาชีพทางวิชาการและ AI Dashboard ระดับสูง (AI-First & Modern Analytics)

[ข้อมูลระบบและฟังก์ชันที่ต้องมีในหน้าจอ]:
1. Header & Navigation:
   - แสดงชื่อระบบ: ระบบประเมินผล 5-Fold Cross-Validation (LogiAI Framework)
   - โมเดลที่ใช้: Qwen2.5-1.5B-Instruct + PaddleOCR (ไทย-อังกฤษ) | N=300 ฉบับ | 11 ฟิลด์มาตรฐาน
   - ปุ่ม Action ด้านบน: คัดลอกตารางวิทยานิพนธ์, ดาวน์โหลดรายงาน Excel (.xlsx), ดาวน์โหลด CSV, ดาวน์โหลด JSON

2. Control Bar (แผงตั้งค่าการทดสอบ):
   - เลือกระหว่าง: "1 ฉบับ (สด)", "รอบเดี่ยว (Fold 1-5: 60 ฉบับ)", หรือ "5-Fold (ครบ 300 ฉบับ)"
   - เลือก Prompt Variant: Zero-Shot / One-Shot / Few-Shot (ออกแบบ Badge/Selector ให้เด่นชัด)
   - Dropdown เลือกเอกสาร (DOC-001 ถึง DOC-300) หรือเลือก Fold (1-5)
   - ตัวเลือก Random Seed (42, 123, 999)
   - ปุ่มหลัก: "เริ่มประมวลผล" (มี Loading State และเปลี่ยนสีตามโหมด)

3. Live Evaluation Dashboard (ขณะ GPU กำลังประมวลผล Background Job):
   - สถานะ Job ID, สถานะ Running/Completed/Stopped, และป้าย Variant ที่กำลังรัน
   - ปุ่ม Pause/Stop, Resume Toggle (ข้ามแคชเดิม), Reset
   - หลอด Progress Bar คู่: Overall Progress (0-300 ฉบับ) และ Fold Progress (0-60 ฉบับ)
   - ตัวเลขสถิติสด: เอกสารปัจจุบันที่อ่าน, เวลาที่ผ่านไป (MM:SS), ความแม่นยำสด (Live Acc %), จำนวนฉบับ GPU vs Cache
   - กล่อง Terminal Live Logs สี Dark/Cyber แสดงข้อความการประมวลผลทีละฉบับ

4. Tabbed Results View (แถบแสดงผลหลังทดสอบ):
   - แท็บ 1: ภาพรวมสถิติ (การ์ดสรุป Overall Accuracy, F1-Score, Doc-Level Acc, Text Similarity + เวลากินแรง OCR/SLM + ตาราง 11 ฟิลด์แยก 5 Fold)
   - แท็บ 2: บันทึกประสิทธิภาพ (ตารางค้นหา Log ประสิทธิภาพรายฉบับพร้อมเวลา OCR/SLM)
   - แท็บ 3: รายละเอียด Fold 1-5 (Matrix วิเคราะห์แต่ละ Fold)
   - แท็บ 4: คลังเอกสาร & Ground Truth (ดูรูปภาพต้นฉบับ เทียบผลที่ AI สกัดกับเฉลย พร้อมไฮไลต์สีเขียว/แดง)

[ความต้องการด้านการออกแบบ]:
- สไตล์: Modern Clean Tech ผสมผสาน Dashboard สไตล์ Stripe / Vercel / Linear (พื้นหลัง Slate/Zinc หรือ Dark Cyber accents)
- ใช้ Tailwind CSS classes เป็นหลัก
- จัดวาง Information Hierarchy ให้ชัดเจน ส่วนไหนสำคัญ ส่วนไหนเป็นรายละเอียด
- รองรับ Responsive และใช้งานง่าย ไม่รกสายตา
- ช่วยเขียนโครงสร้าง Layout (Wireframe / Component Architecture) พร้อมโค้ดตัวอย่าง React + Tailwind CSS และคำแนะนำด้าน UX ให้ด้วยครับ
```
