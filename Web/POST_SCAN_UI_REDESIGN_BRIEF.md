# Post-Scan UI Redesign Brief

## เป้าหมายของหน้านี้

หน้าหลังจากผู้ใช้อัปโหลด/สแกนไฟล์เสร็จ ต้องเป็น workspace สำหรับตรวจเอกสารโลจิสติกส์แบบครบจบในหน้าเดียว:

- ดูไฟล์ต้นฉบับ
- ดูผล OCR
- แก้ OCR ถ้าอ่านผิด
- ให้ SLM วิเคราะห์ใหม่จาก OCR ที่แก้แล้ว
- ดู/แก้ JSON 11 ฟิลด์หลัก
- Export หรือ Save ผลลัพธ์

## Flow หลักหลังผู้ใช้เลือกไฟล์

1. ผู้ใช้เลือก 1 ไฟล์หรือหลายไฟล์
   - รองรับ image และ PDF
   - รองรับ batch หลายเอกสาร
   - เลือกภาษา OCR ได้ เช่น ไทย/อังกฤษ

2. ระบบสร้างรายการเอกสารทั้งหมดใน batch
   - แต่ละไฟล์มีสถานะของตัวเอง
   - สถานะสำคัญ: queued, OCR processing, OCR completed, SLM processing, completed, error

3. Phase 1: OCR ทุกไฟล์ก่อน
   - ระบบส่งไฟล์เข้า PaddleOCR GPU
   - ระหว่างทำงานแสดง progress รายไฟล์
   - เมื่อ OCR เสร็จ เก็บ raw text และ OCR lines พร้อมตำแหน่งกล่องข้อความ

4. Phase 2: SLM วิเคราะห์ทีละไฟล์
   - ส่ง OCR text/lines เข้า Qwen SLM GPU
   - ระบบดึงข้อมูลเป็น JSON ตาม schema 11 ฟิลด์หลัก
   - เมื่อเสร็จ แสดงผล JSON และ confidence/review state

5. ผู้ใช้ตรวจและแก้ผลลัพธ์
   - ถ้า OCR ผิด แก้ OCR แล้วให้ SLM วิเคราะห์ใหม่
   - ถ้า JSON ผิด แก้ JSON ได้ในหน้า
   - Export หรือบันทึก Firebase ได้

## Layout ที่ควรมี

### 1. Top Workspace Bar

ใช้สำหรับบอกภาพรวมของ batch ปัจจุบัน

ต้องแสดง:

- ชื่อไฟล์ที่เลือกอยู่
- ขนาดไฟล์
- จำนวนเอกสารใน batch
- จำนวนเอกสารที่เสร็จแล้ว
- progress รวมของ batch
- สถานะ cloud sync ถ้ามี

ปุ่มสำคัญ:

- Add files
- Re-run OCR
- Export Excel
- Export CSV
- Export JSON

### 2. Document Switcher

แสดงเมื่อมีหลายไฟล์

หน้าที่:

- ให้ผู้ใช้สลับเอกสารใน batch
- เห็นสถานะของแต่ละเอกสารทันที
- เห็นว่าเอกสารไหนต้องตรวจเพิ่ม

ข้อมูลในแต่ละ item:

- ลำดับเอกสาร
- ชื่อไฟล์แบบย่อ
- สถานะ processing/completed/error
- confidence หรือ completeness score

สีแนะนำ:

- เขียว: ผลลัพธ์ดี/ครบ
- เหลือง: ต้องตรวจบางจุด
- แดง: confidence ต่ำหรือ error

### 3. Processing Step Tracker

แสดงขั้นตอนปัจจุบันของเอกสารที่เลือก

ขั้นตอนหลัก:

1. Upload received
2. OCR processing
3. OCR completed
4. SLM extracting
5. JSON ready
6. Review/export

ต้องสื่อให้ชัดว่าไฟล์กำลังอยู่ขั้นไหน ไม่ควรให้ผู้ใช้เดาว่าระบบค้างหรือทำงานอยู่

## Main Content Layout

แนะนำให้แบ่งเป็น 2 คอลัมน์หลัก

```text
+---------------------------------------------------------+
| Top Workspace Bar                                       |
+---------------------------------------------------------+
| Document Switcher / Batch Progress                      |
+-----------------------------+---------------------------+
| Left: Document + OCR        | Right: SLM JSON Result     |
| Preview / OCR Studio        | Summary / JSON Editor      |
+-----------------------------+---------------------------+
```

## Left Panel: Document Preview + OCR Result Studio

### A. Document Preview

ต้องมี:

- preview รูปภาพหรือ PDF
- overlay bounding boxes จาก OCR
- highlight box เมื่อเลือก OCR line
- toggle เปิด/ปิดกล่อง OCR ทั้งหมด
- zoom/fit view ถ้าออกแบบใหม่ควรมี

หน้าที่หลัก:

- ให้ผู้ใช้เทียบภาพจริงกับข้อความ OCR
- เห็นว่า OCR line มาจากตำแหน่งไหนในเอกสาร

### B. OCR Result Studio

หัวข้อเดิม: `OCR Result (PaddleOCR GPU)`

ต้องแสดง:

- จำนวน OCR lines
- engine/device เช่น PaddleOCR GPU / CUDA
- OCR confidence ถ้ามี

Tabs สำคัญ:

1. Table
2. Raw Text
3. JSON

#### Table Tab

ใช้สำหรับตรวจ OCR line-by-line

ต้องมี:

- search OCR text
- filter confidence เช่น All / High / Review
- list OCR lines
- confidence ต่อบรรทัด
- region/position ถ้ามี
- ปุ่ม edit line
- ปุ่ม delete line
- ปุ่ม undo delete
- ปุ่ม add manual line

เมื่อผู้ใช้เลือก line:

- highlight แถว OCR
- highlight bounding box บน document preview

เมื่อผู้ใช้แก้ OCR line:

- mark line เป็น manual/edited
- confidence เป็น 1.0 หรือแสดงว่าแก้เอง
- trigger ให้ SLM วิเคราะห์ใหม่จาก OCR ใหม่

#### Raw Text Tab

ใช้สำหรับแก้ OCR แบบเร็วทั้งก้อน

ต้องมี:

- textarea ของ OCR text ทั้งหมด
- Save
- Cancel

เมื่อ save:

- split text เป็น OCR lines ใหม่
- mark เป็น manual/edited
- trigger SLM วิเคราะห์ใหม่

#### JSON Tab

ใช้สำหรับดู OCR output แบบ raw JSON

เหมาะสำหรับ power user/debug เท่านั้น ไม่ควรเด่นกว่าหน้า Table และ Raw Text

## Right Panel: SLM JSON Result

หัวข้อเดิม: `SLM JSON Result`

ต้องแสดง:

- model/service badge เช่น Qwen2.5-1.5B Local GPU
- schema badge เช่น 11 Core Logistics Fields
- สถานะ processing/waiting/completed/error

### States ที่ต้องมี

#### Waiting for OCR

แสดงเมื่อ OCR ยังไม่เสร็จ

ข้อความควรสื่อว่า:

- ยังไม่สามารถสร้าง JSON ได้
- ต้องรอ OCR ก่อน

#### SLM Processing

แสดง animation หรือ loading state

ข้อความควรสื่อว่า:

- กำลังวิเคราะห์ข้อมูลจาก OCR
- กำลังสร้าง JSON logistics schema

#### Completed

แสดง 2 ส่วนหลัก:

1. Summary ของ 11 ฟิลด์หลัก
2. Editable JSON panel

#### Error

ต้องแสดง:

- error message ชัดเจน
- เอกสารที่ error
- action ที่ทำต่อได้ เช่น re-run OCR หรือ retry SLM

## 11 Core Logistics Fields

JSON output ต้องเน้น field เหล่านี้เป็นหลัก:

```json
{
  "document_type": "",
  "document_number": "",
  "document_date": "",
  "sender": "",
  "receiver": "",
  "origin": "",
  "destination": "",
  "reference_number": "",
  "unit_price": 0,
  "total_amount": 0,
  "currency": "",
  "other": {}
}
```

ควรออกแบบให้ field สำคัญอ่านง่ายกว่าการโชว์ JSON ดิบอย่างเดียว

## Actions ใน SLM Result Panel

ปุ่มสำคัญ:

- Expand JSON / Split View
- Copy JSON
- Download JSON
- Download Excel
- Download CSV
- Save Firebase

ถ้าเป็น batch:

- ต้องแยกให้ชัดระหว่าง export เอกสารเดียวกับ export ทั้ง batch

## Editable JSON Panel

ต้องมี:

- แสดง JSON แบบอ่านง่าย
- แก้ field ได้
- validate JSON syntax
- copy/download ได้
- บอกสถานะ unsaved/saved ถ้ามีการแก้

ไม่ควรบังคับให้ผู้ใช้แก้ JSON ดิบอย่างเดียว ถ้า redesign ได้ควรมี form view สำหรับ 11 fields แล้วมี raw JSON เป็น advanced view

## Footer / Telemetry ที่สำคัญ

แสดงเฉพาะข้อมูลที่ช่วยตัดสินใจ:

- OCR confidence/accuracy
- จำนวน OCR lines
- processing time
- OCR engine/device
- SLM model/device
- cloud sync status

ไม่ควรทำให้เด่นเกิน main workflow

## Error Handling ที่ UI ต้องรองรับ

กรณีสำคัญ:

- OCR service ไม่พร้อม
- SLM service ไม่พร้อม
- OCR อ่านไม่เจอข้อความ
- SLM สร้าง JSON ไม่สำเร็จ
- ไฟล์บางไฟล์ใน batch error แต่ไฟล์อื่นสำเร็จ
- save Firebase ล้มเหลว
- export ไม่สำเร็จ

ทุก error ควรบอก:

- เกิดกับไฟล์ไหน
- เกิดในขั้นตอนไหน
- ผู้ใช้ทำอะไรต่อได้

## Redesign Priorities

1. ให้ผู้ใช้เข้าใจสถานะเอกสารทันที
2. ทำให้การตรวจ OCR กับภาพต้นฉบับเร็วที่สุด
3. ทำให้ 11 fields สำคัญอ่าน/แก้ง่ายกว่า JSON ดิบ
4. แยก action เอกสารเดียวกับ batch ให้ชัด
5. ลดความรกของ debug/technical JSON แต่ยังเข้าถึงได้
6. Error ต้องอ่านแล้วรู้ทางแก้ ไม่ใช่แค่แสดง stack/error ดิบ

## สิ่งที่ไม่ควรเอาเป็นจุดเด่น

- รายละเอียด benchmark/K-Fold
- technical logs ยาว ๆ
- cache/internal implementation
- raw JSON เต็มจอเป็น default
- ปุ่ม export เยอะจนไม่รู้ว่า export อะไร
- animation ใหญ่เกินจนบังงานตรวจเอกสาร

## หน้าจอที่ควรออกแบบจาก brief นี้

อย่างน้อยควรมี state mockup เหล่านี้:

1. Batch กำลัง OCR
2. OCR เสร็จ กำลัง SLM
3. Completed พร้อม JSON
4. OCR edit แล้ว re-analyzing
5. Batch หลายไฟล์ มีบางไฟล์ error
6. Empty/error state ของ SLM
