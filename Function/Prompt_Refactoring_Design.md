# บันทึกการออกแบบระบบ Prompt & SLM (Design Notes: Prompt & SLM Refactoring)

บันทึกข้อเสนอและแนวทางการปรับปรุงระบบการส่งข้อมูลเข้าโมเดลภาษาขนาดเล็ก (SLM) และการจัดการไฟล์ Prompt สำหรับโครงการ **LogiToSche**

---

## 1. การส่งค่าความมั่นใจ OCR ให้ SLM ประเมิน (Confidence-Aware Prompting)

### 💡 แนวคิดหลัก
แทนการส่งเฉพาะข้อความดิบ (`ocr_text`) ให้เปลี่ยนเป็นส่งข้อความพร้อมระบุ **ค่าความมั่นใจรายบรรทัด (OCR Line Confidence)** ที่ได้จาก PaddleOCR เพื่อให้ SLM ทราบว่าจุดไหนของเอกสารที่มีความไม่ชัดเจน และนำมาประกอบการประเมินความมั่นใจสุดท้ายของตัวเอง

### 📝 ตัวอย่างโครงสร้างการส่งเข้า Prompt
```text
OCR Text with Confidence Score:
- "ABC Logistics Co., Ltd." (Confidence: 99.2%)
- "INV-2025-001" (Confidence: 98.5%)
- "71-443Z" (Confidence: 68.4%)  <-- ข้อความจุดนี้มีความมั่นใจต่ำ
```

### 🧠 บทบาทของ SLM
1.  **Typo Correction:** หากพบข้อความที่ความมั่นใจต่ำ เช่น `71-443Z` และบริบทชี้ว่าเป็นทะเบียนรถไทย SLM สามารถใช้ความเข้าใจบริบทแก้เป็น `71-4432` ได้
2.  **Self-Evaluation:** SLM จะใช้ข้อมูลความมั่นใจของ OCR ร่วมกับผลลัพธ์การสกัดข้อมูลของตัวเองเพื่อประเมินค่า **Overall Confidence** และ **SLM Confidence** ส่งกลับมาใน JSON โดยระบบจะยึดค่านี่เป็นหลัก

---

## 2. การแยกไฟล์ Prompt ออกจากโค้ดระบบ (Prompt Separation)

### 📂 โครงสร้างโฟลเดอร์แนะนำ
แนะนำให้แยกไฟล์วิศวกรรมคำสั่ง (Prompt Engineering) ออกมาไว้ที่โฟลเดอร์สำหรับแอดมินและผู้พัฒนาโดยเฉพาะ:
```text
Web/backend/
├── prompts/
│   ├── system_prompt.txt       # คำสั่งระดับระบบ (System Role)
│   └── user_template.txt       # โครงสร้างคำสั่งหลัก (User Prompt Template)
├── main.py
└── slm_app.py
```

### 💻 ตัวอย่างการโหลดใช้งานใน Python (`main.py` / `slm_app.py`)
```python
def load_prompt_template(filename: str) -> str:
    prompt_path = Path(__file__).resolve().parent / "prompts" / filename
    with open(prompt_path, "r", encoding="utf-8") as f:
        return f.read()

def build_slm_prompt(payload: SlmExtractRequest) -> str:
    # โหลดไฟล์เทมเพลตคำสั่ง
    user_template = load_prompt_template("user_template.txt")
    
    # แปลง OCR Lines พร้อมระดับความมั่นใจเป็นข้อความ
    ocr_lines_with_conf = []
    for line in payload.ocr_lines:
        ocr_lines_with_conf.append(f'- "{line.text}" (Confidence: {line.confidence * 100:.1f}%)')
    formatted_ocr = "\n".join(ocr_lines_with_conf)
    
    # แทนที่ตัวแปรใน Template
    prompt = user_template.format(
        document_type_hint=payload.document_type_hint,
        ocr_content=formatted_ocr
    )
    return prompt
```

### 🎯 ประโยชน์ที่จะได้รับ
*   **แอดมินปรับจูน Prompt ได้ง่าย:** สามารถทดลองเปลี่ยนข้อกำหนด กฎเกณฑ์ หรือวิธีคิดของ SLM ในไฟล์ `.txt` ได้ทันที
*   **ปรับเปลี่ยนทันทีไม่ต้อง Restart Server:** ระบบจะอ่านไฟล์เวอร์ชันล่าสุดเสมอ ทำให้ประหยัดเวลาในการทดสอบ Prompt
*   **โค้ดสั้นและสะอาดขึ้น:** แยกส่วนจัดการ API เครือข่าย ออกจากข้อมูลคำสั่ง AI อย่างชัดเจน
