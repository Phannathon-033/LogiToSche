# LogiAI Web Application

เว็บแอปพลิเคชันและระบบประเมินผลประสิทธิภาพสกัดข้อมูลเอกสารโลจิสติกส์สู่ 11 ฟิลด์มาตรฐาน (JSON Schema)

---

## 📖 คู่มือการติดตั้งและรันทีละขั้นตอน (Interactive HTML Guide)
- เปิดไฟล์คู่มือในบราวเซอร์เพื่อคลิกก็อปปี้คำสั่ง: 👉 [`RUN_GUIDE.html`](RUN_GUIDE.html)

---

## 📦 ซอฟต์แวร์ที่ต้องใช้ (Prerequisites)
ติดตั้งผ่าน PowerShell (Run as Administrator) ด้วยคำสั่งเดียว:
```powershell
winget install --id Git.Git -e --source winget ; winget install --id Python.Python.3.10 -e --source winget ; winget install --id OpenJS.NodeJS.LTS -e --source winget
```
หรือติดตั้งแยก:
- **Git:** `winget install --id Git.Git -e --source winget`
- **Python 3.10:** `winget install --id Python.Python.3.10 -e --source winget`
- **Node.js LTS:** `winget install --id OpenJS.NodeJS.LTS -e --source winget`

---

## 🛠️ คำสั่งใช้งานหลัก (NPM Scripts)

| คำสั่ง | รายละเอียด |
| :--- | :--- |
| `npm run dev` | รันเฉพาะ Vite Web Frontend (Port 5173) |
| `npm run dev:windows` | **(แนะนำ)** รันครบ 3 เซอร์วิสอัตโนมัติ (Frontend + Gateway + SLM) |
| `npm run dev:all` | รันระบบทั้งหมดผ่าน PowerShell Background Daemon |
| `npm run stop` | หยุดเซอร์วิสทั้งหมดที่รันอยู่ |
| `npm run build` | บิลด์ Frontend สำหรับโปรดักชัน (`tsc -b && vite build`) |

---

## 💻 พอร์ตการทำงาน
- **Frontend (Web UI):** http://localhost:5173
- **AI Gateway & PaddleOCR API:** http://localhost:8000 (Swagger Docs: http://localhost:8000/docs)
- **Dedicated SLM Engine (Qwen2.5-1.5B):** http://localhost:8001
