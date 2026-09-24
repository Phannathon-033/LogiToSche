# 📊 เอกสารสเปกฟังก์ชันแดชบอร์ดทั้งหมด (Dashboard Specification & UI Redesign Prompt)
> **สำหรับส่งให้ ChatGPT / UI-UX Designer เพื่อนำไปออกแบบหน้าจอแดชบอร์ดใหม่ทั้งหมด**  
> **โปรเจกต์:** LogiToSche (LogiAI Document Intelligence Architecture)  
> **ระบบ:** ระบบบริหารจัดการ AI, ตรวจสอบสุขภาพระบบ, และประเมินผลเอกสารโลจิสติกส์  

---

## 🧭 1. ภาพรวมสถาปัตยกรรมแดชบอร์ด (Dashboard Architecture)

ในระบบ **LogiAI** มีแดชบอร์ดหลักครอบคลุม 2 ส่วนสำคัญ:
1. **🖥️ Operations & Admin Management Dashboard:** แดชบอร์ดสำหรับผู้ดูแลระบบและวิศวกร AI เพื่อติดตามสถานะเซิร์ฟเวอร์, ปริมาณเอกสาร, ปรับแต่ง Prompt & Model, และตรวจทานเอกสารในคิว
2. **⚡ Real-time Background Evaluation Job Dashboard:** วิดเจ็ตแดชบอร์ดสดสำหรับติดตามการประเมินผล 5-Fold Cross-Validation บน GPU แบบไม่หลุด Timeout

---

## 📌 2. ฟังก์ชันใน Operations & Admin Dashboard (แจกแจงทีละโมดูล)

### 📊 โมดูลที่ 1: หน้าภาพรวมระบบและการทำงานของเครื่อง (Admin Overview & System Telemetry)
*หน้านี้เปรียบเสมือน Mission Control แสดงสุขภาพของระบบและปริมาณงานทั้งหมด*

1. **การ์ด KPI สรุปสถานะ 4 ตัวหลัก:**
   * **เอกสารทั้งหมด (Total Documents):** จำนวนเอกสารทั้งหมดที่เข้าสู่ระบบ
   * **อัตราประมวลผลสำเร็จ (Success Rate %):** ร้อยละของเอกสารที่สกัดข้อมูลผ่านเกณฑ์ความเชื่อมั่น (> 85%)
   * **คิวที่ต้องตรวจสอบ (Review Queue):** เอกสารที่มีฟิลด์ความมั่นใจต่ำ หรือมีข้อขัดแย้ง ต้องให้เจ้าหน้าที่ตรวจ
   * **อัตราข้อผิดพลาด (Error Rate %):** เอกสารที่ไม่สามารถอ่าน OCR หรือโครงสร้างไม่ตรง
2. **กล่องตรวจสุขภาพระบบและฮาร์ดแวร์แบบสด (Live Hardware & System Telemetry Card):**
   * *Polling อัปเดตสถานะอัตโนมัติทุก 4 วินาที:*
   * **GPU CUDA Status:** แสดงสถานะการทำงานของการ์ดจอ NVIDIA, ชื่อรุ่น GPU, อุณหภูมิ และปริมาณการใช้ VRAM
   * **AI Gateway API (Port 8000):** แสดงสถานะ FastAPI + PaddleOCR Engine พร้อม Response Time (Latency ms)
   * **Dedicated SLM Server (Port 8001):** แสดงสถานะโมเดล Qwen2.5-1.5B พร้อมสถานะ Memory
   * **Host System CPU & RAM:** เปอร์เซ็นต์การใช้งาน CPU และ RAM ของเครื่องแม่ข่าย
   * *ปุ่ม Refresh:* กดรีเฟรชสถานะฮาร์ดแวร์ได้ทันที
3. **กราฟปริมาณงานและแนวโน้ม (Throughput & Processing Timeline):**
   * กราฟแสดงจำนวนเอกสารที่ประมวลผลสำเร็จในแต่ละช่วงเวลา (ชั่วโมง/วัน)
4. **การวิเคราะห์กลุ่มข้อผิดพลาด (Error Clusters & Failure Analysis):**
   * จัดกลุ่มสาเหตุที่เอกสารติด Review หรือ Error บ่อย เช่น:
     * `Missing Tax ID / Document Number` (เลขที่เอกสารไม่ชัดเจน)
     * `Date Format Disambiguation` (วันที่ พ.ศ. / ค.ศ. คลุมเครือ)
     * `Low OCR Confidence in Address` (ตัวอักษรจาง / เบลอ)
5. **ตารางเอกสารล่าสุดที่ต้องการการจัดการ (Recent Actionable Documents Queue):**
   * แสดง 5 เอกสารล่าสุดที่ติดสถานะ `Review` หรือ `Error` พร้อมปุ่มคลิกเข้าไปแก้ไขได้ทันที

---

### 🧪 โมดูลที่ 2: ห้องทดลองปรับแต่ง AI และ Prompt (Prompt Lab & AI Tuning)
*ศูนย์กลางการควบคุมพฤติกรรมของโมเดล Small Language Model (SLM)*

1. **ตัวเลือกโมเดล AI (Active Model Selector):**
   * เลือกโมเดลที่ต้องการใช้งาน:
     * `Qwen2.5-1.5B-Instruct` (Default - เบา รวดเร็ว รันบน GPU ในเครื่องได้ลื่นไหล)
     * `Qwen2.5-7B-Instruct` (ความฉลาดสูงขึ้น สำหรับเอกสารซับซ้อน)
     * `Llama-3.1-8B-Instruct` (โมเดลมาตรฐานสากล)
2. **ตัวปรับเกณฑ์ความเชื่อมั่น (Confidence Threshold Slider):**
   * แถบสไลเดอร์ปรับค่าระหว่าง `50% - 98%` (ค่ามาตรฐาน: `85%`)
   * หากค่าความมั่นใจของฟิลด์ใดต่ำกว่าเกณฑ์ ระบบจะส่งเข้า Review Items เพื่อให้คนตรวจสอบ
3. **ตัวเลือกฟิลด์ที่ต้องเฝ้าระวังเข้มงวด (Monitored Fields Checklist):**
   * ติ๊กเลือกฟิลด์สำคัญใน 11 ฟิลด์มาตรฐาน เช่น `document_number`, `document_date`, `receiver`, `total_amount`
4. **กล่องข้อความคำสั่งหลัก (System Prompt Editor):**
   * ช่องแก้ไข System Instruction หลัก พร้อมคำแนะนำสไตล์และกฎเกณฑ์
5. **คลังแม่แบบสำเร็จรูป (Prompt Presets Library):**
   * มีแม่แบบให้เลือกโหลดและปรับแต่งได้ทันที:
     * *Standard Core 11 Fields:* มาตรฐานสกัด 11 ฟิลด์หลัก
     * *Bilingual Thai/EN & Buddhist Era:* จัดการเอกสารสองภาษาและแปลง พ.ศ. เป็น ค.ศ.
     * *Maritime & Air Logistics:* สกัดใบตราส่ง B/L และ AWB แยก Port of Loading / Discharge
     * *Synonym Disambiguation:* จัดกลุ่มคำที่มีความหมายเดียวกัน (Buyer/Consignee/ผู้รับ, PO/Tax Inv)
     * *Summarization & Validation:* สรุปใจความสั้น และตรวจสอบผลรวมเงิน (Subtotal + VAT = Total)
6. **ระบบกฎเสริมความปลอดภัย (Dynamic Fallback Rules Manager):**
   * เพิ่ม/ลบ/แก้ไขกฎเสริม เช่น:
     * *"ถ้าเจอทั้ง Subtotal และ Total Amount ให้เลือก Total Amount"*
     * *"ชื่อธนาคารให้จัดเป็นช่องทางชำระเงิน ห้ามใส่เป็น Sender หรือ Receiver"*
7. **ปุ่มทดสอบสด (Live Prompt Assistant Modal):**
   * กดเปิดหน้าต่างทดลองรัน Prompt กับข้อความ OCR จำลอง เพื่อดูผลลัพธ์ JSON ทันทีโดยไม่ต้องอัปโหลดไฟล์ใหม่

---

### 📑 โมดูลที่ 3: คิวตรวจทานและแก้ไขเอกสาร (Documents & Review Queue)
*พื้นที่ทำงานสำหรับ Operator ในการตรวจสอบและยืนยันความถูกต้องของข้อมูล*

1. **ตัวกรองและค้นหาเอกสาร (Filters & Search Bar):**
   * ค้นหาตามชื่อไฟล์, ชื่อผู้ใช้ที่อัปโหลด, หรือเลขอ้างอิง
   * ปุ่มแท็บกรองสถานะ: `ทั้งหมด (All)`, `สำเร็จ (Success)`, `กำลังทำ (Processing)`, `ต้องตรวจ (Review)`, `ผิดพลาด (Error)`
2. **ตารางรายการเอกสาร (Document Table List):**
   * คอลัมน์: ชื่อไฟล์และประเภท, ผู้ส่งตรวจ, วันเวลาที่อัปโหลด, สถานะ (Status Badge), ค่าความมั่นใจเฉลี่ย, และปุ่มเปิดดู
3. **หน้าจอตรวจทานแบบแยกฝั่ง (Side-by-Side Review Workspace):**
   * *ฝั่งซ้าย:* รูปภาพสแกนเอกสารต้นฉบับ พร้อมระบบซูม ย่อ-ขยาย
   * *ฝั่งขวา:* ฟอร์มแก้ไขฟิลด์ JSON Schema ทั้ง 11 ฟิลด์ พร้อมไฮไลต์สี:
     * 🟢 สีเขียว: AI มั่นใจสูง (> 85%)
     * 🟡 สีเหลือง: AI มั่นใจปานกลาง / มีคำเตือนให้ตรวจทาน (Review Flag)
     * 🔴 สีแดง: ฟิลด์ที่ขาดหายไปหรือไม่พบในเอกสาร
   * *บันทึกเหตุผลการแก้ไข (Audit Reason Log):* ช่องระบุเหตุผลที่ผู้ใช้ปรับแก้ค่า เพื่อนำไปใช้เป็นข้อมูลปรับปรุงโมเดลในอนาคต

---

### 📈 โมดูลที่ 4: รายงานเชิงลึกและสถิติข้อผิดพลาด (Analytics & Reports)
1. **เมทริกซ์ความแม่นยำรายฟิลด์ (Field-Level Accuracy Matrix):**
   * แผนภูมิแท่งเปรียบเทียบว่าฟิลด์ใดที่โมเดลสกัดได้แม่นยำที่สุด (เช่น `total_amount 98%`) และฟิลด์ใดที่ผิดพลาดบ่อย (เช่น `origin / destination 82%`)
2. **การแจกแจงตามประเภทเอกสาร (Category Distribution):**
   * สถิติแยกตาม Invoice, Bill of Lading, Packing List, Purchase Order
3. **ปุ่มดาวน์โหลดรายงานผู้บริหาร (Export Executive PDF / CSV):**
   * ส่งออกรายงานสถิติสำหรับนำเสนอผู้บริหารหรือแนบรายงานประจำเดือน

---

### 👥 โมดูลที่ 5: จัดการผู้ใช้งานและบันทึกกิจกรรม (Users & Activity Logs)
1. **การจัดการบัญชีผู้ใช้งาน (User & Role Management):**
   * รายชื่อผู้ใช้ในระบบ, อีเมล, บทบาท (`Admin`, `User`, `Reviewer`), สถานะ (`Active`, `Inactive`)
   * สวิตช์เปิด/ปิดการใช้งานบัญชี และปุ่มเพิ่มผู้ใช้งานใหม่
2. **บันทึกกิจกรรมระบบ (Audit Trail & Activity Logs):**
   * ตารางประวัติการทำงาน: ใครทำอะไร ที่เอกสารใด เมื่อไหร่ (เช่น *Admin ปรับแก้ไขค่า total_amount ใน DOC-012*, *System อัปเดต Prompt Preset*)

---

## ⚡ 3. ฟังก์ชันใน Background Evaluation Job Dashboard (K-Fold Benchmark Engine)

เมื่อผู้ใช้กดเริ่มประเมินผล 5-Fold Cross-Validation (300 ฉบับ) กล่องแดชบอร์ดนี้จะทำงานแบบ **Zero Timeout Engine**:
1. **Live Header & Badges:**
   * รหัสงาน (Job ID)
   * ป้ายสถานะแบบมี Animation Pulse (`● Running on GPU`, `✓ Completed`, `⏸ Stopped`)
   * ป้ายโหมด Variant: **`VARIANT: ZERO-SHOT`** / **`VARIANT: ONE-SHOT`** / **`VARIANT: FEW-SHOT`**
2. **Dual Real-time Progress Bars:**
   * **Overall Progress Bar:** ความคืบหน้ารวม 300 ฉบับ พร้อมเปอร์เซ็นต์สะสม
   * **Fold Progress Bar:** ความคืบหน้าของ Fold ปัจจุบัน (รอบละ 60 ฉบับ)
3. **Live Metric Cards (ตัวชี้วัดสด):**
   * *Current File:* แสดงชื่อเอกสารและ Doc ID ปัจจุบันที่กำลังผ่าน OCR + SLM
   * *Elapsed Time:* นาฬิกานับเวลาที่ใช้ไปจริง (รูปแบบ `MM:SS`)
   * *Live Accuracy:* คำนวณความแม่นยำสะสมแบบ Real-time ณ ปัจจุบัน
   * *GPU Live vs Cache Counter:* แสดงจำนวนฉบับที่รันสดบน GPU เทียบกับฉบับที่ดึงจากแคชเดิม
4. **Action Controls (การควบคุมงานสด):**
   * `ปุ่มหยุดชั่วคราว (Stop)`: สั่งให้หยุดหลังจบเอกสารฉบับปัจจุบันอย่างปลอดภัย
   * `Checkbox Resume (ข้ามเอกสารเดิม)`: หากเคยรันไปแล้ว จะข้ามฉบับเดิมเพื่อประหยัดเวลา
   * `ปุ่มเริ่มต่อ (Resume)` และ `ปุ่มรีเซ็ต (Reset)`
5. **Live Terminal Console (กล่องบันทึกบรรทัดคำสั่งสด):**
   * แสดงข้อความ Log แบบเรียลไทม์ เช่น:  
     `[GPU LIVE] DOC-018 (Fold 1 18/60) -> 11/11 PASS | OCR: 0.85s, SLM: 1.10s, Total: 1.95s | Acc: 96.2%`
6. **ปุ่มดาวน์โหลดรายงานสรุป Excel 4 ชีต:**
   * เมื่อประมวลผลเสร็จ จะมีปุ่มดาวน์โหลดรายงานสรุป Excel (.xlsx) ทันที

---

## 💡 4. Prompt สำเร็จรูปสำหรับส่งให้ ChatGPT ออกแบบ UI แดชบอร์ดใหม่

*(สามารถคัดลอกข้อความในกล่องนี้ไปวางใน ChatGPT เพื่อให้ออกแบบหน้าแดชบอร์ดได้ทันที)*

```markdown
คุณคือ Lead UI/UX Designer และ Senior Frontend Architect ที่เชี่ยวชาญ Tailwind CSS และ React
ช่วยออกแบบ UI แดชบอร์ดใหม่สำหรับ "ระบบบริหารจัดการ AI โลจิสติกส์ (LogiAI Admin & Operations Dashboard)" ให้มีความสวยงาม ทันสมัย ใช้งานง่าย มีความน่าเชื่อถือระดับ Enterprise และสไตล์ AI-Native Analytics (คล้ายกับ Vercel, Supabase, Stripe หรือ Linear)

[องค์ประกอบและฟังก์ชันที่ต้องมีในแดชบอร์ด]:
1. Navigation & Header Bar:
   - โลโก้ LogiAI พร้อมป้ายบอกสถานะสิทธิ์ Admin
   - เมนูสลับหน้า:
     • Overview (ภาพรวมระบบและฮาร์ดแวร์)
     • Documents Queue (คิวตรวจเอกสาร)
     • Prompt Lab (ห้องทดลอง Prompt & AI Tuning)
     • Analytics & Reports (รายงานวิเคราะห์)
     • 5-Fold Benchmark (ระบบประเมินผลวิทยานิพนธ์)
     • Users & Activity (ผู้ใช้งานและบันทึกประวัติ)
   - สวิตช์สลับไปหน้าระดับ User ธรรมดา และปุ่ม Logout

2. Overview & Live System Telemetry Section:
   - การ์ด KPI 4 ตัวหลัก: เอกสารทั้งหมด, อัตราความสำเร็จ (Success Rate), คิวที่ต้องตรวจ (Review Queue), อัตราข้อผิดพลาด (Error Rate)
   - การ์ด Live System Health:
     • แสดงสถานะ GPU CUDA (NVIDIA VRAM Usage, Temp, Status)
     • แสดงสถานะ Gateway API Port 8000 (PaddleOCR Engine)
     • แสดงสถานะ SLM Server Port 8001 (Qwen2.5-1.5B)
     • CPU & System RAM Usage
   - กราฟแนวโน้มปริมาณเอกสารและการกระจายตัวของข้อผิดพลาด (Error Clusters)
   - ตารางรายการเอกสารล่าสุดที่ต้องการการตรวจสอบด่วน (Actionable Queue)

3. Prompt Lab & Model Tuning Studio:
   - ตัวเลือกโมเดล (Qwen2.5-1.5B / Qwen2.5-7B / Llama-3.1-8B)
   - แถบปรับ Confidence Threshold Slider (50% - 98%)
   - กล่อง System Prompt Editor และแถบเลือก Prompt Presets (Standard, Bilingual, Maritime B/L, Synonym Check)
   - จัดการ Dynamic Fallback Rules (เพิ่ม/ลบกฎช่วยตัดสินใจ)
   - ปุ่ม Quick Test Prompt เพื่อลองรันกับตัวอย่าง OCR ได้ทันที

4. Real-time Background Evaluation Runner Widget:
   - วิดเจ็ตแดชบอร์ดขนาดกะทัดรัดแต่ทรงพลัง แสดงเมื่อมีการรันประเมินผลบน GPU
   - แสดง Job ID, ป้ายโหมด Variant (Zero-shot / One-shot / Few-shot)
   - หลอด Progress Bar คู่: Overall 300 docs vs Current Fold 60 docs
   - Live Counter: เวลาที่ผ่านไป (MM:SS), ความแม่นยำสะสมสด (Live Acc %), เอกสารที่กำลังอ่าน
   - กล่อง Terminal Live Log แสดงสถานะรายฉบับ
   - ปุ่ม Pause/Stop, Resume Toggle, และปุ่มส่งออก Excel 4 ชีต

[ความต้องการด้านการออกแบบ]:
- สไตล์: Modern Clean Tech ผสมผสาน Dark/Light Theme ปรับแต่งได้ (เน้นโทน Slate, Indigo, Cyan, Emerald)
- ใช้ Tailwind CSS classes เป็นหลัก พร้อมจัดวาง Grid และ Flexbox อย่างเป็นระเบียบ
- ออกแบบ Micro-interactions, Badges, และ Data Visualizations ให้อ่านง่าย ชัดเจน ไม่รก
- ช่วยสรุป Component Architecture และเขียนโค้ดตัวอย่างหน้าแดชบอร์ดหลักใน React + Tailwind CSS ให้ด้วยครับ
```
