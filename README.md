# LogiToSche (LogiAI Document Intelligence Architecture)

ระบบแปลงเอกสารโลจิสติกส์สู่ 11 ฟิลด์มาตรฐาน (JSON Schema) ด้วยสถาปัตยกรรม Small Language Model (Qwen2.5-1.5B-Instruct) ร่วมกับ PaddleOCR ภาษาไทย-อังกฤษ พร้อมระบบประเมินผล 5-Fold Cross-Validation (300 ฉบับ)

---

## 📖 คู่มือการติดตั้งและรันโปรเจกต์ (Step-by-Step Setup Guide)

เราได้จัดทำคู่มือแบบอินเทอร์แอคทีฟที่สามารถ **คลิกปุ่มคัดลอกคำสั่งรันทีละขั้นตอนได้ทันที**:
- **เปิดไฟล์คู่มือแบบ HTML ในบราวเซอร์:** 👉 [`Web/RUN_GUIDE.html`](Web/RUN_GUIDE.html)

---

## 📦 ซอฟต์แวร์ที่ต้องใช้และการติดตั้ง (Prerequisites)
ก่อนเริ่มรันโปรเจกต์ จำเป็นต้องมี 3 ซอฟต์แวร์หลัก หากยังไม่มีสามารถติดตั้งได้ทันทีผ่าน PowerShell (Run as Administrator):

### ⚡ คำสั่งติดตั้งรวดเดียวครบทั้ง 3 ซอฟต์แวร์ (All-in-One via winget):
```powershell
winget install --id Git.Git -e --source winget ; winget install --id Python.Python.3.10 -e --source winget ; winget install --id OpenJS.NodeJS.LTS -e --source winget
```

### หรือเลือกติดตั้งและตรวจเช็คทีละโปรแกรม:
1. **Git (Version Control):**
   ```powershell
   winget install --id Git.Git -e --source winget
   git --version
   ```
   *(หรือดาวน์โหลดตัวติดตั้ง .exe จาก [git-scm.com](https://git-scm.com/download/win))*

2. **Python 3.10 / 3.11 (Backend SLM & PaddleOCR):**
   ```powershell
   winget install --id Python.Python.3.10 -e --source winget
   python --version
   ```
   *(หรือดาวน์โหลดตัวติดตั้ง .exe จาก [python.org](https://www.python.org/downloads/) - สำคัญ: หากติดตั้งผ่าน .exe ต้องติ๊ก **"Add python.exe to PATH"**)*

3. **Node.js 18+ LTS (React Web Frontend):**
   ```powershell
   winget install --id OpenJS.NodeJS.LTS -e --source winget
   node -v
   ```
   *(หรือดาวน์โหลดตัวติดตั้ง .msi จาก [nodejs.org](https://nodejs.org/))*

---

## 🚀 เริ่มต้นใช้งานด่วน (Quick Start)

### 1. โคลนโปรเจกต์และเข้าสู่โฟลเดอร์ Web
```bash
git clone https://github.com/Phannathon-033/LogiToSche.git
cd LogiToSche/Web
```

### 2. ตั้งค่าแบบรวดเร็ว (1-Click Setup สำหรับ Windows)
ดับเบิ้ลคลิกไฟล์หรือรันใน Terminal:
```cmd
scripts\setup.bat
```
*(สคริปต์จะตรวจสอบ Python, Node.js, สร้าง venv, ติดตั้ง dependencies ทั้งหมด และคัดลอก `.env` ให้อัตโนมัติ)*

### 3. รันระบบทั้งหมดพร้อมกัน (3 เซอร์วิส)
```cmd
scripts\run-all-windows.bat
# หรือรันผ่าน npm:
npm run dev:windows
```
- **Web UI:** http://localhost:5173
- **AI Gateway & OCR:** http://localhost:8000
- **SLM Model Server:** http://localhost:8001

---

## 📊 การประเมินผล 5-Fold Cross-Validation และส่งออก Excel
1. เข้าไปที่หน้าเว็บ [http://localhost:5173](http://localhost:5173) เมนู **"ประเมินผล K-Fold Cross-Validation"**
2. เลือกโหมด **5-Fold Cross-Validation (ครบ 300 ฉบับ)**
3. คลิกปุ่ม **"เริ่มประเมิน 5-Fold ครบ 300 ฉบับ"**
4. ระบบประมวลผลใน Background ปล่อยเครื่องรันประมาณ 1 ชั่วโมงได้ทันที ไม่หลุด timeout
5. เมื่อเสร็จสิ้น สามารถคลิกปุ่ม **"ดาวน์โหลดรายงานสรุป Excel (.xlsx)"** เพื่อรับรายงานสรุป 4 ชีตสมบูรณ์
