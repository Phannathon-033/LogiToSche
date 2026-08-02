# LogiAI PaddleOCR Backend

This service runs real OCR with PaddleOCR from:

https://github.com/PaddlePaddle/PaddleOCR

## Setup

```bash
cd "E:\Logistics To JSON\Web\backend"
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Then run the frontend:

```bash
cd "E:\Logistics To JSON\Web"
npm run dev
```

The frontend proxies `/api/ocr` to `http://127.0.0.1:8000`.
