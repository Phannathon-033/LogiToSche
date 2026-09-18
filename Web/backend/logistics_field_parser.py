"""
Pure Python Logistics 11-Core-Field Parser Engine
Upgraded with Intelligent Semantic Autocorrection, Multi-line Offset Resolution,
and Robust Grounding Verification.
"""
from __future__ import annotations

import re
from typing import Any

MONTH_MAP = {
    "jan": "01", "january": "01", "ม.ค.": "01", "มกราคม": "01",
    "feb": "02", "february": "02", "ก.พ.": "02", "กุมภาพันธ์": "02",
    "mar": "03", "march": "03", "มี.ค.": "03", "มีนาคม": "03",
    "apr": "04", "april": "04", "เม.ย.": "04", "เมษายน": "04",
    "may": "05", "พ.ค.": "05", "พฤษภาคม": "05",
    "jun": "06", "june": "06", "มิ.ย.": "06", "มิถุนายน": "06",
    "jul": "07", "july": "07", "ก.ค.": "07", "กรกฎาคม": "07",
    "aug": "08", "august": "08", "ส.ค.": "08", "สิงหาคม": "08",
    "sep": "09", "sept": "09", "september": "09", "ก.ย.": "09", "กันยายน": "09",
    "oct": "10", "october": "10", "ต.ค.": "10", "ตุลาคม": "10",
    "nov": "11", "november": "11", "พ.ย.": "11", "พฤศจิกายน": "11",
    "dec": "12", "december": "12", "ธ.ค.": "12", "ธันวาคม": "12",
}

NUM_PATTERN = r'([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})'


def repair_ocr_typos(text: str) -> str:
    """Intelligently repairs typical optical character recognition errors and noise."""
    if not text:
        return ""
    t = text

    # 1. Invoice / Document Type Typos
    t = re.sub(r'\b(ihvoice|ievoice|invoce|invoise|involce|invoioe)\b', 'invoice', t, flags=re.I)
    t = re.sub(r'\b(b/i|b\/l|b11l of lading|bill of ladlng)\b', 'bill of lading', t, flags=re.I)
    t = re.sub(r'\b(d/o|d\/o|delivery ordcr)\b', 'delivery order', t, flags=re.I)
    t = re.sub(r'\b(purchasc ordcr|purchasc order|purchase ordbr)\b', 'purchase order', t, flags=re.I)

    # 2. Date Typos & Numeric Slash Errors
    t = re.sub(r'\b(datr|dtae|dats|datc|dare)\b', 'date', t, flags=re.I)
    t = re.sub(r'\b(inv[.\s]*datr|inv[.\s]*dare)\b', 'inv date', t, flags=re.I)
    t = re.sub(r'(?<=\b)(\d{1,2})[7/](\d{1,2})[7/](\d{2,4})(?=\b)', r'\1/\2/\3', t)
    t = re.sub(r'(?:[ึ\s]|\b)(0?[1-9]|1[0-2])[7/ึ]([0-2][0-9]|3[0-1])[/7ึ](\d{2,4})\b', r'\1/\2/\3', t)

    # 3. Parties / Client / Customer / Agency Typos
    t = re.sub(r'\b(clibnt|clent|clint)\b', 'client', t, flags=re.I)
    t = re.sub(r'\b(custombr|custmer|custome|customnr)\b', 'customer', t, flags=re.I)
    t = re.sub(r'\b(mbdia)\b', 'media', t, flags=re.I)
    t = re.sub(r'\b(seevices|serviccs|servises)\b', 'services', t, flags=re.I)
    t = re.sub(r'\b(agrncy|ageney)\b', 'agency', t, flags=re.I)
    t = re.sub(r'\b(shippbd|shppd)\b', 'shipped', t, flags=re.I)
    t = re.sub(r'\b(rbceiver|reciever)\b', 'receiver', t, flags=re.I)

    # 4. Reference / Order Typos
    t = re.sub(r'\b(insbrtion|inserton|insertn)\b', 'insertion', t, flags=re.I)
    t = re.sub(r'\b(ordbr|ordr|orde)\b', 'order', t, flags=re.I)
    t = re.sub(r'\b(tbrms|trms)\b', 'terms', t, flags=re.I)
    t = re.sub(r'\b(refrence|rcfcrcncc)\b', 'reference', t, flags=re.I)

    # 5. Amounts & Currencies
    t = re.sub(r'\b(totai|totl|totale)\b', 'total', t, flags=re.I)
    t = re.sub(r'\b(sub\s*totai|subtotai)\b', 'subtotal', t, flags=re.I)
    t = re.sub(r'\b(amouht|amout)\b', 'amount', t, flags=re.I)
    t = re.sub(r'S\s*(\d+\.\d{2})', r'$\1', t)
    t = re.sub(r'(?:US\s*S|US\$|U\.S\.\$)', 'USD ', t, flags=re.I)
    t = re.sub(r'(?<=\s)S\s*(\d+)', r'$\1', t)

    # 6. Locations
    t = re.sub(r'\b(nev york)\b', 'new york', t, flags=re.I)
    t = re.sub(r'\b(avbnue|avnue)\b', 'avenue', t, flags=re.I)
    t = re.sub(r'\b(stret|strcet)\b', 'street', t, flags=re.I)

    return t


def is_grounded_in_ocr(val: Any, ocr_text: str) -> bool:
    """Validate that the extracted value is grounded in OCR text, supporting semantic repairs."""
    if val is None or val == "" or val == "-" or val == "N/A":
        return False

    rep_ocr = repair_ocr_typos(ocr_text)

    if isinstance(val, (int, float)):
        if float(val) == 0.0:
            return False
        f_val = float(val)
        num_str1 = f"{f_val:.2f}"
        num_str2 = f"{f_val:,.2f}"
        num_str3 = str(int(f_val)) if f_val.is_integer() else str(f_val)
        if (num_str1 in ocr_text) or (num_str2 in ocr_text) or (num_str3 in ocr_text):
            return True
        if (num_str1 in rep_ocr) or (num_str2 in rep_ocr) or (num_str3 in rep_ocr):
            return True
        # Allow normalized digit match
        digits_val = re.sub(r'\D', '', num_str1)
        digits_ocr = re.sub(r'\D', '', ocr_text)
        if len(digits_val) >= 3 and digits_val in digits_ocr:
            return True
        return False

    s_val = str(val).strip()
    if not s_val or s_val.lower() in {"-", "n/a", "none", "null", "unknown", "(ไม่พบในข้อความ ocr)"}:
        return False

    norm_ocr = re.sub(r'[\s\-_.:/]+', ' ', ocr_text.lower())
    norm_rep = re.sub(r'[\s\-_.:/]+', ' ', rep_ocr.lower())
    norm_val = re.sub(r'[\s\-_.:/]+', ' ', s_val.lower())
    if norm_val in norm_ocr or norm_val in norm_rep:
        return True

    # Check with digit/letter OCR confusion: O <-> 0, I/l <-> 1
    fuzzy_val = norm_val.replace('o', '0').replace('l', '1').replace('i', '1')
    fuzzy_ocr = norm_ocr.replace('o', '0').replace('l', '1').replace('i', '1')
    if fuzzy_val in fuzzy_ocr:
        return True

    # Date normalization check (YYYY-MM-DD)
    date_m = re.match(r'^(\d{4})-(\d{2})-(\d{2})$', s_val)
    if date_m:
        yr, mo, dy = date_m.groups()
        be_yr = str(int(yr) + 543)
        short_yr = yr[-2:]
        short_be_yr = be_yr[-2:]
        has_yr = any(y in ocr_text or y in rep_ocr for y in (yr, be_yr, short_yr, short_be_yr))
        has_day = any(d in ocr_text or d in rep_ocr for d in (dy, str(int(dy))))
        has_mo = any(m in ocr_text or m in rep_ocr for m in (mo, str(int(mo))))
        if has_yr and (has_day or has_mo):
            return True

    # Multi-word substring overlap check (at least 50% of significant words)
    words = [w for w in re.split(r'[\s,.:;/\-]+', norm_val) if len(w) >= 2]
    if len(words) >= 2:
        matched = sum(1 for w in words if w in norm_ocr or w in norm_rep)
        if matched / len(words) >= 0.5:
            return True

    if len(s_val) >= 3 and (s_val in ocr_text or s_val in rep_ocr):
        return True

    return False


def parse_grounded_date(text: str) -> tuple[str, str]:
    """Extract and normalize document date to ISO YYYY-MM-DD strictly from OCR text."""
    if not text:
        return "", ""

    t = repair_ocr_typos(text)

    # 1. ISO YYYY-MM-DD
    iso_match = re.search(r'\b(19\d{2}|20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b', t)
    if iso_match:
        iso_str = f"{iso_match.group(1)}-{iso_match.group(2)}-{iso_match.group(3)}"
        return iso_str, iso_match.group(0)

    month_pattern = r'(?:' + '|'.join(re.escape(k) for k in MONTH_MAP.keys()) + r')'

    # 2. Day Month Year (e.g. 25 มกราคม 2567 or 4 October 1979)
    m2 = re.search(r'([0-3]?[0-9])(?:st|nd|rd|th)?[\s.,\-]+(' + month_pattern + r')[a-z]*[\s.,\-]+((?:19|20|24|25)\d{2}|\d{2})\b', t, re.IGNORECASE)
    if m2:
        day = f"{int(m2.group(1)):02d}"
        m_str = m2.group(2).lower()
        month = MONTH_MAP.get(m_str, MONTH_MAP.get(m_str[:3], "01"))
        year = int(m2.group(3))
        if year > 2400:
            year -= 543
        elif year < 100:
            year = 1900 + year if year > 40 else 2000 + year
        return f"{year}-{month}-{day}", m2.group(0)

    # 3. Month Day Year (e.g. October 4, 1979 or July 30, 1987)
    m1 = re.search(r'(' + month_pattern + r')[a-z]*[\s.,\-]+([0-3]?[0-9])(?:st|nd|rd|th)?[\s.,\-]+[-~]?((?:19|20|24|25)\d{2}|\d{2})\b', t, re.IGNORECASE)
    if m1:
        m_str = m1.group(1).lower()
        month = MONTH_MAP.get(m_str, MONTH_MAP.get(m_str[:3], "01"))
        day = f"{int(m1.group(2)):02d}"
        year = int(m1.group(3))
        if year > 2400:
            year -= 543
        elif year < 100:
            year = 1900 + year if year > 40 else 2000 + year
        return f"{year}-{month}-{day}", m1.group(0)

    # 4. Contextual Date with Prefix (e.g. DATE: 7/30/87 or DATE: 1988-01-31)
    m_pref = re.search(r'(?:date|datr|inv\s*date)[\s:._-]*([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{2,4})\b', t, re.IGNORECASE)
    if m_pref:
        p1, p2, yr = int(m_pref.group(1)), int(m_pref.group(2)), int(m_pref.group(3))
        year = 1900 + yr if yr < 100 else yr
        if p1 > 12 >= p2:
            day, month = p1, p2
        else:
            month, day = p1, p2
        return f"{year:04d}-{month:02d}-{day:02d}", m_pref.group(0)

    # 5. General Numeric slash/dash DD/MM/YYYY or MM/DD/YYYY
    num_match = re.search(r'\b([0-3]?[0-9])[-/.]([0-3]?[0-9])[-/.](19\d{2}|20\d{2}|24\d{2}|25\d{2}|\d{2})\b', t)
    if num_match:
        p1, p2, yr_str = int(num_match.group(1)), int(num_match.group(2)), num_match.group(3)
        year = int(yr_str)
        if year > 2400:
            year -= 543
        elif year < 100:
            year = 1900 + year if year > 40 else 2000 + year
        if p1 > 12 >= p2:
            day, month = p1, p2
        else:
            month, day = p1, p2
        return f"{year:04d}-{month:02d}-{day:02d}", num_match.group(0)

    return "", ""


def parse_grounded_doc_no(text: str) -> tuple[str, str]:
    """Extract document/invoice number with high precision and multi-line offset search."""
    if not text:
        return "", ""

    t = repair_ocr_typos(text)
    lines = [line.strip() for line in t.splitlines() if line.strip()]

    NON_DOC_WORDS = {
        "date", "page", "due", "tel", "tax", "total", "subtotal", "amount",
        "need", "crotts", "box", "please", "attn", "copy", "original",
        "name", "address", "phone", "email", "bill", "ship", "sold", "item",
        "code", "terms", "order", "status", "price", "unit", "discount", "thai",
        "thailand", "same", "none", "null", "from", "invoice", "statement"
    }

    def is_valid_doc_num(s: str, line_context: str = "") -> bool:
        clean = s.strip(" .:#-_/\\()[]{}")
        if len(clean) < 3 or len(clean) > 30:
            return False
        if not re.search(r'\d', clean):
            return False
        # Reject date-like strings (e.g. NOV-16-1994, NOU-16-1994, 1994-11-16)
        if re.search(r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|nou|dec)[-\s/]\d{1,2}[-\s/]\d{2,4}\b', clean, re.I):
            return False
        if re.search(r'^\d{4}[-/]\d{2}[-/]\d{2}$', clean):
            return False
        low = clean.lower()
        if low in NON_DOC_WORDS or low in {"terms", "days", "net", "month", "year"}:
            return False
        if any(low.startswith(w) for w in ["tel", "fax", "phone", "page", "tax", "date", "due", "zip"]):
            return False
        if line_context and re.search(r'(?:terms|net\s*\d+|\bdays\b|\btel\b|\bfax\b|\bphone\b|\bzip\b|\bpage\b)', line_context, re.IGNORECASE):
            return False
        return True

    # 1. Targeted Prefix Patterns
    prefix_patterns = [
        r'(?:ใบกำกับภาษีเลขที่|เลขที่เอกสาร|เลขที่ใบกำกับ|เลขที่ใบเสร็จ|ใบเสร็จเลขที่|เลขที่ใบส่งของ|เลขที่ใบส่งสินค้า|ใบแจ้งหนี้เลขที่|เลขที่สั่งซื้อ|ใบสั่งซื้อเลขที่|เลขที่บิล|เลขที่)\s*[:\.\s#]*([A-Za-z0-9\-\/]{2,30})',
        r'(?<!tax\s)(?<!tax\sid\s)(?<!vat\s)(?:invoice\s*(?:no|number|#|id|code)|inv\s*[:\.\s#]+|invgice\s*(?:no|#)|our\s*invgice\s*no)\s*[:\.\s#]*([A-Za-z0-9\-\/]{2,30})',
        r'(?:document\s*(?:no|number|#|id)|doc\s*(?:no|number|#|id))\s*[:\.\s#]*([A-Za-z0-9\-\/]{2,30})',
        r'(?:b\/l\s*(?:no|number|#)|bl\s*(?:no|number|#)|bill\s*of\s*lading\s*(?:no|#)?)\s*[:\.\s#]*([A-Za-z0-9\-\/]{2,30})',
        r'(?:air\s*waybill\s*(?:no|#)|awb\s*(?:no|#)|waybill\s*(?:no|#))\s*[:\.\s#]*([A-Za-z0-9\-\/]{2,30})',
        r'(?:purchase\s*order\s*(?:no|#|id)|p\.?o\.?\s*(?:no|number|#|id)|order\s*(?:no|number|#|id))\s*[:\.\s#]*([A-Za-z0-9\-\/]{2,30})',
        r'(?:delivery\s*order\s*(?:no|#)|d\/o\s*(?:no|#)|do\s*(?:no|#))\s*[:\.\s#]*([A-Za-z0-9\-\/]{2,30})',
        r'(?:statement\s*(?:no|number|#|id)|statenent)\s*[:\.\s#]*([A-Za-z0-9\-\/]{2,30})',
        r'(?:receipt\s*(?:no|number|#|id)|tax\s*invoice\s*(?:no|#))\s*[:\.\s#]*([A-Za-z0-9\-\/]{2,30})',
        r'(?:est\s*(?:nd|no|id)|estimate\s*(?:recap|no))\s*[:\.\s#]*([A-Za-z0-9\-\/_\(\)]{2,30})',
        r'(?:dm\s*#|job\s*no[\.\s:]*)\s*([A-Za-z0-9\-\/]{2,25})',
    ]

    for pat in prefix_patterns:
        for m in re.finditer(pat, t, re.IGNORECASE):
            raw_cand = m.group(1).strip(" .:#-_/\\")
            if is_valid_doc_num(raw_cand):
                return raw_cand, m.group(0).strip()

    # 2. Multi-Line Table Headers with Reverse & Forward Offset Search
    header_keywords = [
        "invoice no", "invoice number", "invoice #", "doc no", "document no",
        "เลขที่เอกสาร", "เลขที่ใบกำกับ", "b/l no", "bill of lading", "po no", "p.o. no", "order no"
    ]
    # Check standalone 'NO.' or 'NUMBER.' or 'INVOICE NO.' line followed by number
    for idx, line in enumerate(lines):
        if re.match(r'^(?:no|number|#|doc\s*no|invoice\s*no)[\s.:#-]*$', line, re.I):
            if idx + 1 < len(lines):
                tokens = [tk.strip(" .:#-_/\\") for tk in lines[idx + 1].split()]
                for tok in tokens:
                    if is_valid_doc_num(tok, lines[idx + 1]):
                        return tok, f"{line} {tok}"

    for idx, line in enumerate(lines):
        line_low = line.lower()
        if any(kw in line_low for kw in header_keywords):
            for offset in [-1, 1, -2, 2]:
                ti = idx + offset
                if 0 <= ti < len(lines):
                    tokens = [tk.strip(" .:#-_/\\") for tk in lines[ti].split()]
                    for tok in tokens:
                        if is_valid_doc_num(tok, lines[ti]):
                            return tok, f"{line} -> {tok}"

    # 3. Generic "No." or "#" with strict exclusions
    generic_pat = r'(?<!tel\s)(?<!telephone\s)(?<!phone\s)(?<!fax\s)(?<!page\s)(?<!item\s)(?<!tax\s)(?<!vat\s)(?<!zip\s)(?<!box\s)(?:no|number|#)[\s.:#]*([A-Za-z0-9\-\/]{3,25})'
    for m in re.finditer(generic_pat, t, re.IGNORECASE):
        raw_cand = m.group(1).strip(" .:#-_/\\")
        if is_valid_doc_num(raw_cand):
            return raw_cand, m.group(0).strip()

    # 4. Fallback for standalone identifiers near top of invoice
    for line in lines[:10]:
        cand_m = re.search(r'\b([0-9]{4,12})\b', line)
        if cand_m:
            cand = cand_m.group(1)
            if not re.search(r'(tel|phone|fax|zip|p\.?o\.?\s*box|19\d{2}|20\d{2})', line, re.IGNORECASE):
                return cand, line

    return "", ""


def parse_grounded_parties(text: str) -> tuple[str, str, str, str]:
    """Extract (sender_name, sender_snippet, receiver_name, receiver_snippet)."""
    if not text:
        return "", "", "", ""

    t = repair_ocr_typos(text)
    lines = [line.strip() for line in t.splitlines() if line.strip()]
    sender_name, sender_snippet = "", ""
    receiver_name, receiver_snippet = "", ""

    # 1. Receiver patterns (exclude customer no, invoice no)
    receiver_prefixes = r'(?:ลูกค้า|ชื่อลูกค้า|ผู้ซื้อ|ผู้รับ|ส่งถึง|จัดส่งถึง|bill\s*to|sold\s*to|ship\s*to|customer(?!\s*(?:no|number|#|id)\b)|client(?!\s*(?:no|number|#|id)\b)|consignee|buyer|attn)\s*[:\.\s#]*([^\n\r]{3,60})'
    m_rec = re.search(receiver_prefixes, t, re.IGNORECASE)
    if m_rec:
        cand = re.sub(r'^[:\.\s#]+', '', m_rec.group(1)).strip(" .:#-")
        if cand and not re.search(r'^(date|invoice|tel|tax|no|page|total|ยอดรวม|[0-9\W]+)', cand, re.IGNORECASE):
            receiver_name = cand
            receiver_snippet = m_rec.group(0).strip()

    if not receiver_name:
        for idx, line in enumerate(lines):
            if re.match(r'^(ลูกค้า|ผู้ซื้อ|ผู้รับ|bill\s*to|sold\s*to|ship\s*to|customer|client|consignee)[:\s]*$', line, re.IGNORECASE):
                if idx + 1 < len(lines):
                    next_line = lines[idx + 1].strip()
                    if len(next_line) >= 3 and not re.search(r'^(date|invoice|tel|tax|page|total|ยอดรวม|[0-9\W]+)', next_line, re.IGNORECASE):
                        receiver_name = next_line
                        receiver_snippet = f"{line} {next_line}"
                        break

    # 2. Sender patterns
    sender_prefixes = r'(?:ผู้ขาย|ผู้ออกเอกสาร|ออกโดย|ผู้ส่ง|from|shipper|vendor|supplier|seller|issuer)\s*[:\.\s#]*([^\n\r]{3,60})'
    m_send = re.search(sender_prefixes, t, re.IGNORECASE)
    if m_send:
        cand = m_send.group(1).strip(" .:#-")
        if cand and not re.search(r'^(date|invoice|tel|tax|to|page|total|ยอดรวม|[0-9\W]+)', cand, re.IGNORECASE):
            sender_name = cand
            sender_snippet = m_send.group(0).strip()

    # 3. Header company keyword detection
    if not sender_name:
        company_keywords = (
            "บริษัท", "บจก", "บมจ", "หจก", "ร้าน",
            "inc", "corp", "corporation", "ltd", "limited", "company", "co.", "services",
            "logistics", "transport", "freight", "express", "forwarding", "airways", "lines",
            "publications", "laboratories", "association", "enterprises"
        )
        for line in lines[:8]:
            cleaned = re.sub(r'^[0-9\W]+', '', line).strip()
            if receiver_name and (cleaned == receiver_name or receiver_name in cleaned):
                continue
            if len(cleaned) >= 4 and any(kw in cleaned.lower() for kw in company_keywords):
                if not re.search(r'^(to|client|date|invoice|form|statement|tax|bill\s*to|ship\s*to|ผู้รับ|ลูกค้า)', cleaned, re.IGNORECASE):
                    sender_name = cleaned
                    sender_snippet = line
                    break

    # 4. Fallback first line as sender
    if not sender_name and lines:
        first_line = lines[0].strip()
        if len(first_line) >= 4 and not re.search(r'^(to|client|date|invoice|page|no\b)', first_line, re.IGNORECASE):
            sender_name = first_line
            sender_snippet = first_line

    return sender_name, sender_snippet, receiver_name, receiver_snippet


def parse_grounded_origin_destination(text: str) -> tuple[str, str, str, str]:
    """Extract origin and destination strictly from OCR text or address blocks."""
    if not text:
        return "", "", "", ""

    t = repair_ocr_typos(text)
    origin, origin_snippet = "", ""
    destination, dest_snippet = "", ""

    # 1. Explicit Logistics Port / Terminal Patterns
    pol_m = re.search(r'(?:port\s*of\s*loading|loading\s*port|pol|place\s*of\s*receipt|origin|shipped\s*from|ต้นทาง|ท่าเรือต้นทาง|รับจาก|จุดรับของ)\s*[:\.\s#]*([^\n\r,]{3,45})', t, re.IGNORECASE)
    if pol_m:
        origin = pol_m.group(1).strip(" .:#-_")
        origin_snippet = pol_m.group(0).strip()

    pod_m = re.search(r'(?:port\s*of\s*discharge|discharge\s*port|pod|place\s*of\s*delivery|destination|shipped\s*to|delivery\s*to|ปลายทาง|ท่าเรือปลายทาง|สถานที่ส่งมอบ|จุดส่งของ|final\s*destination)\s*[:\.\s#]*([^\n\r,]{3,45})', t, re.IGNORECASE)
    if pod_m:
        destination = pod_m.group(1).strip(" .:#-_")
        dest_snippet = pod_m.group(0).strip()

    # 2. Address-based Origin / Destination Deduction (City, State / ZIP or Thai Provinces)
    if not origin or not destination:
        US_STATES = {
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
            "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
            "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
            "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
            "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
        }
        INVALID_CITIES = {
            "customer", "invoice", "order", "bill", "ship", "date", "terms", "total",
            "subtotal", "amount", "page", "item", "balance", "insertion", "product",
            "services", "advertising", "payment", "attn", "due", "no", "number", "client"
        }

        valid_locs = []

        # Single line: City, ST 12345
        for m in re.finditer(r'([A-Za-z\s]{3,30})(?:,\s*|\s+)\b([A-Z]{2})\b(?:\s*(\d{5}(?:-\d{4})?))?', t):
            raw_city = m.group(1).strip().splitlines()[-1].strip()
            state = m.group(2).upper()
            zip_code = m.group(3) or ""
            if state in US_STATES and raw_city.lower() not in INVALID_CITIES and len(raw_city) >= 3:
                loc_str = f"{raw_city}, {state}" + (f" {zip_code}" if zip_code else "")
                if loc_str not in valid_locs:
                    valid_locs.append(loc_str)

        # Multi-line: City \n ST \n 12345
        for m in re.finditer(r'([A-Za-z\s]{3,25})[\r\n]+\s*([A-Z]{2})[\r\n]+\s*(\d{5})', t):
            raw_city = m.group(1).strip().splitlines()[-1].strip()
            state = m.group(2).upper()
            zip_code = m.group(3)
            if state in US_STATES and raw_city.lower() not in INVALID_CITIES and len(raw_city) >= 3:
                loc_str = f"{raw_city}, {state} {zip_code}"
                if loc_str not in valid_locs:
                    valid_locs.append(loc_str)

        # Thai provinces fallback
        for m_thai in re.finditer(r'(กรุงเทพ(?:มหานคร)?|สมุทรปราการ|นนทบุรี|ปทุมธานี|ชลบุรี|ระยอง|อยุธยา|เชียงใหม่|ขอนแก่น|ภูเก็ต|สงขลา)', t):
            prov = m_thai.group(1)
            if prov not in valid_locs:
                valid_locs.append(prov)

        if not origin and valid_locs:
            origin = valid_locs[0]
            origin_snippet = valid_locs[0]
        if not destination and len(valid_locs) > 1:
            destination = valid_locs[1]
            dest_snippet = valid_locs[1]

    return origin, origin_snippet, destination, dest_snippet


def parse_grounded_reference_number(text: str, doc_no: str = "") -> tuple[str, str]:
    """Extract reference number (PO, Insertion Order, Booking No, Ref) strictly from OCR text."""
    if not text:
        return "", ""

    t = repair_ocr_typos(text)
    pats = [
        r'(?:insertion\s*order\s*(?:no|#)?)\s*[:\.\s#]*([A-Za-z0-9\-\/\s]{2,25})',
        r'(?:ใบสั่งซื้อเลขที่|p\.o\.\s*(?:no|#)?|po\s*(?:no|#)|purchase\s*order\s*(?:no|#)?)\s*[:\.\s#]*([A-Za-z0-9\-\/]{3,25})',
        r'(?:เลขที่อ้างอิง|อ้างอิง|reference\s*(?:no|number|#)?|ref\s*(?:no|number|#)?)\s*[:\.\s#]*([A-Za-z0-9\-\/]{3,25})',
        r'(?:booking\s*(?:no|#)|bkg\s*(?:no|#))\s*[:\.\s#]*([A-Za-z0-9\-\/]{3,25})',
        r'(?:order\s*(?:no|#))\s*[:\.\s#]*([A-Za-z0-9\-\/]{3,25})',
    ]
    for pat in pats:
        m = re.search(pat, t, re.IGNORECASE)
        if m:
            val = m.group(1).strip(" .:#-_").splitlines()[0].strip()
            if val != doc_no and len(val) >= 2:
                return val, m.group(0).strip()
    return "", ""


def parse_grounded_amounts(text: str) -> tuple[float, str, float, str, float, str]:
    """Extract total_amount, subtotal_amount, vat_amount strictly from OCR text."""
    total_amount, total_snippet = 0.0, ""
    subtotal_amount, subtotal_snippet = 0.0, ""
    vat_amount, vat_snippet = 0.0, ""

    t = repair_ocr_typos(text)
    lines = [line.strip() for line in t.splitlines() if line.strip()]
    num_pat = r'([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})'

    total_prefixes = (
        r'(?:ยอดรวมทั้งสิ้น|รวมเงินทั้งสิ้น|จำนวนเงินรวมทั้งสิ้น|รวมเงินสุทธิ|จำนวนเงินรวม|ยอดเงินสุทธิ|ยอดสุทธิ|ยอดรวม|'
        r'grand\s*total|total\s*amount|total\s*balance\s*due|total|net\s*amount|amount\s*due|balance\s*due|net\s*total|total\s*charges)'
    )

    # 1. Prefix on the same line
    for m in re.finditer(total_prefixes + r'[\s:._$฿#*]*' + num_pat, t, re.IGNORECASE):
        try:
            val = float(m.group(1).replace(",", ""))
            if val > 0:
                total_amount = val
                total_snippet = m.group(0).strip()
        except ValueError:
            pass

    # 2. Multi-line search (number above or below total label)
    if total_amount == 0.0:
        for idx, line in enumerate(lines):
            if re.search(r'\b(?:total|balance\s*due|amount\s*due)\b', line, re.I):
                for offset in [-1, -2, 1, 2]:
                    ti = idx + offset
                    if 0 <= ti < len(lines):
                        m = re.search(r'\b' + num_pat + r'\b', lines[ti])
                        if m:
                            try:
                                val = float(m.group(1).replace(",", ""))
                                if val > 0:
                                    total_amount = val
                                    total_snippet = f"{line} -> {lines[ti]}"
                                    break
                            except ValueError:
                                pass
                if total_amount > 0:
                    break

    # 3. Currency suffixes
    if total_amount == 0.0:
        for m in re.finditer(num_pat + r'\s*(?:บาท|baht|thb|฿)', t, re.IGNORECASE):
            try:
                val = float(m.group(1).replace(",", ""))
                if val > 0:
                    total_amount = val
                    total_snippet = m.group(0).strip()
            except ValueError:
                pass

    # Subtotal
    sub_prefixes = r'(?:ยอดก่อนภาษี|ก่อน\s*vat|รวมเงิน|subtotal|sub\s*total|net\s*before\s*tax)'
    m_sub = re.search(sub_prefixes + r'[\s:._$฿#*]*' + num_pat, t, re.IGNORECASE)
    if m_sub:
        try:
            subtotal_amount = float(m_sub.group(1).replace(",", ""))
            subtotal_snippet = m_sub.group(0).strip()
        except ValueError:
            pass

    # VAT / Tax
    vat_prefixes = r'(?:ภาษีมูลค่าเพิ่ม\s*(?:7%|7\.0%)?|ภาษีมูลค่าเพิ่ม|vat\s*7%|vat\s*7\.0%|vat|tax\s*amount)'
    m_vat = re.search(vat_prefixes + r'[\s:._$฿#*]*' + num_pat, t, re.IGNORECASE)
    if m_vat:
        try:
            vat_amount = float(m_vat.group(1).replace(",", ""))
            vat_snippet = m_vat.group(0).strip()
        except ValueError:
            pass

    # 4. Fallback to maximum valid numeric total
    if total_amount == 0.0:
        decimals = re.findall(num_pat, t)
        valid_floats = [float(d.replace(",", "")) for d in decimals if 1.0 <= float(d.replace(",", "")) <= 50000000.0]
        if valid_floats:
            total_amount = max(valid_floats)
            total_snippet = f"{total_amount:,.2f}"

    return total_amount, total_snippet, subtotal_amount, subtotal_snippet, vat_amount, vat_snippet


def parse_grounded_unit_price(text: str, total_amount: float = 0.0) -> tuple[float, str]:
    """Extract unit price strictly from OCR text."""
    if not text:
        return (total_amount, f"{total_amount:,.2f}") if total_amount > 0 else (0.0, "")

    t = repair_ocr_typos(text)
    num_pat = r'([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})'
    pats = [
        r'(?:ราคาต่อหน่วย|ราคา\/หน่วย|หน่วยละ|unit\s*price|price\s*\/\s*unit|unit\s*rate|rate|price\s*per[\sA-Za-z]*|@)\s*[:\.\s$฿€¥]*' + num_pat,
        r'\$\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})\s*(?:\/|per|each|ea|unit)',
        r'(?<!total\s)(?<!due\s)(?<!amount\s)\$\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})',
    ]
    for pat in pats:
        m = re.search(pat, t, re.IGNORECASE)
        if m:
            try:
                val = float(m.group(1).replace(",", ""))
                if val > 0:
                    return val, m.group(0).strip()
            except ValueError:
                pass

    if total_amount > 0:
        return total_amount, f"{total_amount:,.2f}"
    return 0.0, ""


def parse_grounded_currency(text: str) -> tuple[str, str]:
    """Detect currency code strictly from OCR text."""
    if not text:
        return "USD", "$"

    t = repair_ocr_typos(text)
    m_usd = re.search(r'(?:\$|\bUSD\b|\bdollar\b)', t, re.IGNORECASE)
    m_thb = re.search(r'(?:บาท|\bTHB\b|฿|\bbaht\b)', t, re.IGNORECASE)
    if m_usd and not m_thb:
        return "USD", m_usd.group(0)
    if m_thb and not m_usd:
        return "THB", m_thb.group(0)
    if m_usd and m_thb:
        idx_usd = t.find("$") if "$" in t else t.lower().find("usd")
        idx_thb = t.find("บาท") if "บาท" in t else (t.find("฿") if "฿" in t else t.lower().find("thb"))
        return ("USD", "$") if (idx_usd != -1 and (idx_thb == -1 or idx_usd < idx_thb)) else ("THB", "THB")
    m = re.search(r'(?:€|\bEUR\b|\beuro\b)', t, re.IGNORECASE)
    if m:
        return "EUR", m.group(0)
    m = re.search(r'(?:¥|\bJPY\b|\byen\b)', t, re.IGNORECASE)
    if m:
        return "JPY", m.group(0)
    m = re.search(r'(?:\bSGD\b|S\$)', t, re.IGNORECASE)
    if m:
        return "SGD", m.group(0)
    m = re.search(r'(?:\bCNY\b|\bRMB\b)', t, re.IGNORECASE)
    if m:
        return "CNY", m.group(0)
    m = re.search(r'(?:£|\bGBP\b)', t, re.IGNORECASE)
    if m:
        return "GBP", m.group(0)

    return "USD", "$"


def parse_grounded_doc_type(text: str, hint: str = "invoice") -> tuple[str, str]:
    """Extract document type strictly from OCR text."""
    t = repair_ocr_typos(text)
    if re.search(r'(?:bill\s*of\s*lading|ใบตราส่ง|sea\s*waybill|air\s*waybill|\bb\/l\b)', t, re.IGNORECASE):
        m = re.search(r'(?:bill\s*of\s*lading|ใบตราส่ง|sea\s*waybill|air\s*waybill|\bb\/l\b)', t, re.IGNORECASE)
        return "bill_of_lading", m.group(0) if m else "bill_of_lading"
    if re.search(r'(?:packing\s*list|ใบบรรจุสินค้า|pack\s*list)', t, re.IGNORECASE):
        m = re.search(r'(?:packing\s*list|ใบบรรจุสินค้า|pack\s*list)', t, re.IGNORECASE)
        return "packing_list", m.group(0) if m else "packing_list"
    if re.search(r'(?:purchase\s*order|ใบสั่งซื้อ|\bp\.o\.?\b)', t, re.IGNORECASE):
        m = re.search(r'(?:purchase\s*order|ใบสั่งซื้อ|\bp\.o\.?\b)', t, re.IGNORECASE)
        return "purchase_order", m.group(0) if m else "purchase_order"
    if re.search(r'(?:invoice|ใบกำกับภาษี|ใบแจ้งหนี้|ใบเสร็จ|tax\s*invoice)', t, re.IGNORECASE):
        m = re.search(r'(?:invoice|ใบกำกับภาษี|ใบแจ้งหนี้|ใบเสร็จ|tax\s*invoice)', t, re.IGNORECASE)
        return "invoice", m.group(0) if m else "invoice"

    clean_hint = hint.lower().strip()
    if clean_hint in {"invoice", "bill_of_lading", "packing_list", "purchase_order"}:
        return clean_hint, "(อนุมานจากชนิดเอกสาร)"
    return "invoice", "(อนุมานจากชนิดเอกสาร)"


def parse_robust_quantity(text: str) -> int:
    """Extract total quantity or count strictly from document text."""
    t = repair_ocr_typos(text)
    qty_m = re.search(r'(?:qty|quantity|จำนวน|ยอดจำนวน|total\s*qty|cartons|pcs|units)\s*[:\.\s#]*([0-9,]+)', t, re.IGNORECASE)
    if qty_m:
        try:
            val = int(qty_m.group(1).replace(",", "").strip())
            if val > 0:
                return val
        except ValueError:
            pass
    frac_m = re.search(r'\(?([0-9]+)\s*(?:editions|copies|items|pages|units|sets|boxes|cartons)\)?', t, re.IGNORECASE)
    if frac_m:
        try:
            return int(frac_m.group(1))
        except ValueError:
            pass
    return 0


def parse_grounded_other_details(text: str) -> dict[str, Any]:
    """Extract auxiliary details (terms, due date, container, tracking)."""
    t = repair_ocr_typos(text)
    res: dict[str, Any] = {
        "payment_terms": "",
        "due_date": "",
        "tax_id": "",
        "phone_number": "",
        "email": "",
        "tracking_no": "",
        "container_no": "",
        "vessel_name": "",
        "discount_amount": 0.0,
    }
    m_terms = re.search(r'(?:terms|payment\s*terms|เงื่อนไขชำระเงิน)\s*[:\.\s#]*([^\n\r]{3,40})', t, re.I)
    if m_terms:
        res["payment_terms"] = m_terms.group(1).strip(" .:#-")

    m_tax = re.search(r'(?:tax\s*id|เลขประจำตัวผู้เสียภาษี)\s*[:\.\s#]*([0-9\-]{10,20})', t, re.I)
    if m_tax:
        res["tax_id"] = m_tax.group(1).strip(" .:#-")

    m_phone = re.search(r'(?:tel|phone|โทร)\s*[:\.\s#]*([0-9\-\s\(\)]{8,20})', t, re.I)
    if m_phone:
        res["phone_number"] = m_phone.group(1).strip(" .:#-")

    return res


def evaluate_11_fields(ocr_text: str) -> dict[str, Any]:
    """Evaluate 11 core logistics fields strictly grounded from OCR text with semantic repairs."""
    doc_type, _ = parse_grounded_doc_type(ocr_text)
    doc_no, _ = parse_grounded_doc_no(ocr_text)
    doc_date, _ = parse_grounded_date(ocr_text)
    s_name, _, r_name, _ = parse_grounded_parties(ocr_text)
    origin, _, dest, _ = parse_grounded_origin_destination(ocr_text)
    ref_no, _ = parse_grounded_reference_number(ocr_text, doc_no=doc_no)
    total_amt, _, _, _, _, _ = parse_grounded_amounts(ocr_text)
    unit_price, _ = parse_grounded_unit_price(ocr_text, total_amount=total_amt)
    curr_code, _ = parse_grounded_currency(ocr_text)

    # Check grounding with semantic repairs allowed
    v_doc_no = doc_no if is_grounded_in_ocr(doc_no, ocr_text) else ""
    v_date = doc_date if is_grounded_in_ocr(doc_date, ocr_text) else ""
    v_sender = s_name if is_grounded_in_ocr(s_name, ocr_text) else ""
    v_receiver = r_name if is_grounded_in_ocr(r_name, ocr_text) else ""
    v_origin = origin if is_grounded_in_ocr(origin, ocr_text) else ""
    v_dest = dest if is_grounded_in_ocr(dest, ocr_text) else ""
    v_ref = ref_no if is_grounded_in_ocr(ref_no, ocr_text) else ""
    v_unit = unit_price if is_grounded_in_ocr(unit_price, ocr_text) else 0.0
    v_total = total_amt if is_grounded_in_ocr(total_amt, ocr_text) else 0.0
    v_curr = curr_code if (curr_code and is_grounded_in_ocr(curr_code, ocr_text)) else "USD"

    field_status = {
        "document_type": bool(doc_type),
        "document_number": bool(v_doc_no),
        "document_date": bool(v_date),
        "sender": bool(v_sender),
        "receiver": bool(v_receiver),
        "origin": bool(v_origin),
        "destination": bool(v_dest),
        "reference_number": bool(v_ref),
        "unit_price": bool(v_unit > 0),
        "total_amount": bool(v_total > 0),
        "currency": bool(v_curr),
    }

    score = sum(1 for v in field_status.values() if v)

    return {
        "score": score,
        "is_complete_11": (score == 11),
        "field_status": field_status,
        "extracted_values": {
            "document_type": doc_type,
            "document_number": v_doc_no,
            "document_date": v_date,
            "sender": v_sender,
            "receiver": v_receiver,
            "origin": v_origin,
            "destination": v_dest,
            "reference_number": v_ref,
            "unit_price": v_unit,
            "total_amount": v_total,
            "currency": v_curr,
        },
    }


# Compatibility alias functions
parse_robust_date = lambda t: parse_grounded_date(t)[0]
parse_robust_doc_no = lambda t: parse_grounded_doc_no(t)[0]
parse_robust_parties = lambda t: (parse_grounded_parties(t)[0] or parse_grounded_parties(t)[2], parse_grounded_parties(t)[0], parse_grounded_parties(t)[2])
parse_robust_amounts = lambda t: (parse_grounded_amounts(t)[0], parse_grounded_amounts(t)[2], parse_grounded_amounts(t)[4])
parse_robust_origin_destination = lambda t: (parse_grounded_origin_destination(t)[0], parse_grounded_origin_destination(t)[2])
parse_robust_reference_number = lambda t, doc_no="": parse_grounded_reference_number(t, doc_no)[0]
parse_robust_unit_price = lambda t, total_amount=0.0, qty=1: parse_grounded_unit_price(t, total_amount=total_amount)[0]
parse_robust_currency = lambda t: parse_grounded_currency(t)[0]
