# OCR and SLM Integration Notes

เอกสารนี้ใช้บันทึกภาพรวมการตั้งค่า Frontend, Backend, วิธีรันระบบ, ขั้นตอน setup ตั้งแต่แรก และสิ่งที่ยังต้องทำต่อสำหรับโปรเจกต์ LogiAI Docs to JSON

ต้องอัปเดตไฟล์นี้ทุกครั้งเมื่อมีการเปลี่ยน workflow, dependency, endpoint, OCR backend, SLM backend หรือวิธีรันระบบ

## Frontend ใช้อะไร

Frontend อยู่ที่:

```text
E:\Logistics To JSON\Web
```

เทคโนโลยีที่ใช้:

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React สำหรับ icons

ไฟล์สำคัญ:

- `src/App.tsx`
  - คุม flow หลักของหน้าเว็บ
  - จัด state ของไฟล์ upload
  - ส่งไฟล์ไป OCR backend
  - แสดงผล OCR
  - แสดง placeholder ของ SLM
- `src/services/ocrApi.ts`
  - service สำหรับเรียก `/api/ocr`
- `src/components/DocumentUploader.tsx`
  - input file และ drag/drop upload
- `src/components/DocumentPreview.tsx`
  - แสดง preview ของรูปภาพที่ upload
- `src/components/AppHeader.tsx`
  - navbar ด้านบน
- `vite.config.ts`
  - ตั้ง proxy `/api` ไป backend

พฤติกรรมปัจจุบัน:

- ก่อน upload จะแสดงเฉพาะ upload card และ empty state
- หลัง upload จะแสดง document preview และ OCR result
- ถ้า upload เป็นรูปภาพ จะแสดงรูปนั้นใน preview
- ถ้า upload เป็น PDF ตอนนี้ยังไม่ได้ render PDF จริงใน preview
- OCR เลือกภาษาได้ 2 แบบ: `th` สำหรับไทย + English และ `en` สำหรับ English
- `JSON Schema Output`, `Confidence`, และ `Review Required` แสดงข้อความ `รอการเชื่อมต่อกับ SLM`
- `ฟิลด์สำคัญที่สกัดได้` ไม่ใช้ mock data และจะรอข้อมูลจริงจาก SLM
- `ประวัติงานล่าสุด` ไม่ใช้ mock data และจะแสดงเฉพาะไฟล์ที่ผู้ใช้เพิ่ง upload ใน session นี้

## Backend ใช้อะไร

Backend อยู่ที่:

```text
E:\Logistics To JSON\Web\backend
```

เทคโนโลยีที่ใช้:

- Python
- FastAPI
- Uvicorn
- PaddleOCR
- PaddlePaddle GPU
- NVIDIA CUDA 12.9 package build

ไฟล์สำคัญ:

- `backend/main.py`
  - FastAPI app
  - endpoint สำหรับ health check
  - endpoint สำหรับ OCR
  - โหลด PaddleOCR engine
  - แปลงผล OCR ให้อยู่ในรูปแบบที่ frontend ใช้งานง่าย
- `backend/requirements.txt`
  - Python dependencies
- `backend/.venv`
  - Python virtual environment
- `backend/.paddlex`
  - cache/model directory ของ PaddleOCR

AI/OCR backend ถูกตั้งให้ใช้ NVIDIA GPU:

```text
device=gpu:0
```

ตรวจล่าสุด:

```json
{"status":"ready","engine":"PaddleOCR","languages":"th,en","device":"gpu:0","cuda":"true"}
```

Backend endpoints:

```text
GET  /api/health
POST /api/ocr
```

`GET /api/health` ใช้ตรวจว่า backend พร้อมหรือไม่

ตัวอย่าง response:

```json
{"status":"ready","engine":"PaddleOCR"}
```

`POST /api/ocr` ใช้รับไฟล์เอกสารจาก frontend แล้วส่งเข้า PaddleOCR

รับ field เพิ่ม:

```text
lang=th | en
```

ค่า default คือ `th` เพื่อรองรับเอกสารไทยและอังกฤษปนกัน

ไฟล์ที่รองรับ:

- PDF
- JPG
- JPEG
- PNG

## วิธีรันระบบ

ต้องรัน 2 ส่วน:

1. Backend OCR
2. Frontend Web

### 1. รัน Backend OCR

เปิด terminal แล้วรัน:

```powershell
cd "E:\Logistics To JSON\Web\backend"
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

ตรวจว่า backend พร้อม:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health"
```

ผลที่ควรได้:

```json
{"status":"ready","engine":"PaddleOCR"}
```

### 2. รัน Frontend

เปิดอีก terminal แล้วรัน:

```powershell
cd "E:\Logistics To JSON\Web"
npm run dev
```

เปิดเว็บ:

```text
http://127.0.0.1:5173/
```

Frontend จะเรียก backend ผ่าน Vite proxy:

```text
/api -> http://127.0.0.1:8000
```

## วิธีตรวจคุณภาพก่อนส่งงาน

รันที่ root ของ frontend:

```powershell
cd "E:\Logistics To JSON\Web"
npm run typecheck
npm run lint
npm run build
```

ผลล่าสุด:

- Type Check: ผ่าน
- Lint: ผ่าน
- Build: ผ่าน
- Frontend: `http://127.0.0.1:5173/` ตอบ `200`
- Backend: `http://127.0.0.1:8000/api/health` ตอบ `{"status":"ready","engine":"PaddleOCR"}`

## ขั้นตอน Setup ตั้งแต่แรกจนเสร็จ

### 1. เข้าโฟลเดอร์โปรเจกต์

```powershell
cd "E:\Logistics To JSON\Web"
```

### 2. ติดตั้ง Frontend dependencies

```powershell
npm install
```

### 3. สร้าง Python virtual environment สำหรับ Backend

```powershell
py -m venv backend\.venv
```

### 4. ติดตั้ง Backend dependencies

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

dependencies หลักใน `backend/requirements.txt`:

```text
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.20
pillow==11.0.0
--extra-index-url https://www.paddlepaddle.org.cn/packages/stable/cu129/
paddlepaddle-gpu==3.3.1
paddleocr @ git+https://github.com/PaddlePaddle/PaddleOCR.git
```

### 5. ตรวจว่า PaddleOCR import ได้

```powershell
backend\.venv\Scripts\python.exe -c "import paddle, paddleocr; print('paddle', paddle.__version__); print('paddleocr', getattr(paddleocr, '__version__', 'unknown'))"
```

เวอร์ชันที่ใช้งานได้ล่าสุด:

```text
paddle 3.3.1
paddleocr 3.8.0.dev11+g2661c7c0e
cuda compiled true
device gpu:0
```

### 6. ตั้งค่า PaddleOCR cache ให้อยู่ในโปรเจกต์

ทำไว้แล้วใน `backend/main.py`

```py
CACHE_DIR = BASE_DIR / ".paddlex"
os.environ.setdefault("PADDLE_PDX_CACHE_HOME", str(CACHE_DIR))
```

เหตุผล:

- ป้องกันปัญหา permission เมื่อตัว PaddleOCR พยายามเขียน model/cache ไปที่ user profile
- ทำให้ cache อยู่ใน `Web/backend/.paddlex`

### 7. ปิด MKLDNN ใน PaddleOCR

ทำไว้แล้วใน `backend/main.py`

```py
PaddleOCR(
    lang="en",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    enable_mkldnn=False,
)
```

เหตุผล:

- ระหว่างทดสอบพบ runtime error จาก oneDNN/MKLDNN
- ปิดเพื่อให้ OCR ทำงานนิ่งขึ้นบนเครื่องนี้

### 8. ตั้งค่าให้ PaddleOCR ใช้ NVIDIA GPU

ติดตั้ง `paddlepaddle-gpu==3.3.1` จาก CUDA 12.9 package index เพราะเครื่องนี้ใช้ NVIDIA driver ที่รายงาน CUDA 12.9

```powershell
backend\.venv\Scripts\python.exe -m pip uninstall -y paddlepaddle paddlepaddle-gpu
backend\.venv\Scripts\python.exe -m pip install paddlepaddle-gpu==3.3.1 -i https://www.paddlepaddle.org.cn/packages/stable/cu129/
```

ใน `backend/main.py` ตั้งค่า:

```py
OCR_DEVICE = os.environ.get("LOGIAI_OCR_DEVICE", "gpu:0")
paddle.set_device(OCR_DEVICE)
PaddleOCR(..., device=OCR_DEVICE)
```

บน Windows ต้องเติม path ไปยัง DLL ที่ pip ติดตั้งไว้ใน `backend/.venv/Lib/site-packages/nvidia/*/bin` ก่อน import Paddle/PaddleOCR

ตรวจ GPU:

```powershell
nvidia-smi
```

ตรวจ backend:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health"
```

ผลที่ควรได้:

```json
{"status":"ready","engine":"PaddleOCR","languages":"th,en","device":"gpu:0","cuda":"true"}
```

### 9. ตั้งค่า Vite proxy

ทำไว้แล้วใน `vite.config.ts`

```ts
server: {
  proxy: {
    "/api": "http://127.0.0.1:8000",
  },
},
```

เหตุผล:

- frontend เรียก `/api/ocr`
- Vite proxy ส่งต่อไป `http://127.0.0.1:8000/api/ocr`
- ไม่ต้อง hardcode backend URL ใน React component

### 10. รัน Backend

```powershell
cd "E:\Logistics To JSON\Web\backend"
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 11. รัน Frontend

```powershell
cd "E:\Logistics To JSON\Web"
npm run dev
```

### 12. ทดสอบผ่านหน้าเว็บ

1. เปิด `http://127.0.0.1:5173/`
2. เลือกภาษา OCR เป็น `ไทย + English` หรือ `English`
3. เลือกไฟล์ PDF/JPG/PNG
4. ถ้าเป็นรูปภาพ ระบบจะแสดงรูปใน preview
5. ระบบส่งไฟล์และภาษา OCR ไป PaddleOCR backend
6. ผล OCR จะแสดงใน OCR Result
7. ส่วน SLM จะแสดง `รอการเชื่อมต่อกับ SLM`

## สิ่งที่ยังขาด / ต้องทำต่อ

### 1. เชื่อม SLM จริง

ตอนนี้ยังไม่มี backend สำหรับ SLM

ต้องเพิ่ม endpoint เช่น:

```text
POST /api/slm/extract
```

หน้าที่ของ SLM:

- รับ OCR text
- วิเคราะห์ประเภทเอกสาร
- ดึง field สำคัญ
- แปลงเป็น JSON Schema
- คำนวณ confidence
- สร้างรายการที่ต้อง manual review

### 2. สร้าง Frontend service สำหรับ SLM

ควรเพิ่มไฟล์:

```text
src/services/slmApi.ts
```

ฟังก์ชันที่ควรมี:

```ts
runSlmExtraction(ocrResult, documentTypeHint)
```

### 3. เปลี่ยน placeholder เป็น component จริงหลัง SLM พร้อม

ตอนนี้ 3 ส่วนนี้เป็น placeholder:

- `JSON Schema Output`
- `ความมั่นใจ / Confidence`
- `ต้องตรวจสอบโดยมนุษย์ (Review Required)`

หลังเชื่อม SLM แล้วให้เปลี่ยนกลับไปใช้:

- `JSONOutputPanel`
- `ConfidenceCard`
- `ManualReviewCard`

### 4. สร้าง contract ของ SLM response

ต้องกำหนด schema ชัดเจน เช่น:

```json
{
  "json_schema": {},
  "fields": [],
  "confidence": {},
  "review_items": []
}
```

และต้อง validate response ก่อนนำไปแสดง

### 5. ทำ PDF preview จริง

ตอนนี้ถ้า upload เป็นรูปภาพจะแสดงรูปจริงใน preview

แต่ถ้า upload เป็น PDF ยังไม่ได้ render หน้า PDF จริง

ต้องเพิ่ม PDF renderer เช่น:

- `pdfjs-dist`
- หรือ backend แปลง PDF หน้าแรกเป็น image

### 6. บันทึกงานจริง

ตอนนี้ Recent Jobs ยังเป็น mock

ต้องเพิ่ม:

- database หรือ file storage
- job id
- upload timestamp
- OCR result
- SLM result
- final JSON
- manual review history

### 7. จัดการ error state ให้ละเอียดขึ้น

ควรแยก error เป็น:

- upload failed
- OCR backend offline
- OCR failed
- SLM backend offline
- SLM failed
- SLM output ไม่ใช่ JSON
- SLM output schema ไม่ตรง

### 8. เพิ่ม validation ก่อน export JSON

ต้องตรวจ:

- required fields
- type ของ number fields
- date format
- field ที่ไม่รู้จักต้องอยู่ใน `other`
- JSON ต้อง valid ก่อน download

## Update Log

### 2026-08-03

- สร้าง React/Vite frontend dashboard
- สร้าง FastAPI backend สำหรับ PaddleOCR
- ติดตั้ง PaddleOCR จาก GitHub repo ของ PaddlePaddle
- ตั้ง Vite proxy `/api` ไป backend
- เพิ่ม upload flow ให้ส่งไฟล์ไป OCR จริง
- เพิ่ม image preview จากไฟล์ที่ผู้ใช้เลือก
- ปรับ UI ไม่ให้แสดงผลลัพธ์ก่อน upload
- เอา Sidebar ออกและใช้ Top Navbar
- เปลี่ยน JSON/Confidence/Review เป็น placeholder `รอการเชื่อมต่อกับ SLM`
- เปลี่ยน `ฟิลด์สำคัญที่สกัดได้` ให้รอข้อมูลจริงจาก SLM แทน mock data
- เปลี่ยน `ประวัติงานล่าสุด` ให้แสดงเฉพาะไฟล์ที่ upload จริงใน session แทน mock data
- เพิ่มการเลือกภาษา OCR ระหว่าง `th` และ `en`
- ปรับ backend ให้ cache PaddleOCR engine แยกตามภาษา
- เปลี่ยน PaddlePaddle จาก CPU build เป็น GPU build (`paddlepaddle-gpu==3.3.1`)
- ตั้ง backend ให้ใช้ NVIDIA GPU `gpu:0`
- เพิ่ม DLL path สำหรับ CUDA package ที่ติดตั้งผ่าน pip บน Windows
- สร้างเอกสาร integration notes สำหรับบันทึก setup และงานที่ต้องทำต่อ
