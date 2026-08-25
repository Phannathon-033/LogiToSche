import os
import shutil
from pathlib import Path

CLASS_MAP = {
    "0": "00_letter",
    "1": "01_form",
    "2": "02_email",
    "3": "03_handwritten",
    "4": "04_advertisement",
    "5": "05_scientific_report",
    "6": "06_scientific_publication",
    "7": "07_specification",
    "8": "08_file_folder",
    "9": "09_news_article",
    "10": "10_budget",
    "11": "11_invoice",
    "12": "12_presentation",
    "13": "13_questionnaire",
    "14": "14_resume",
    "15": "15_memo",
}

def extract_all_categories():
    archive_dir = Path(r"E:\Logistics To JSON\archive")
    labels_dir = archive_dir / "labels"
    images_dir = archive_dir / "images"
    base_output_dir = archive_dir / "documents_by_category"

    base_output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Archive directory: {archive_dir}", flush=True)
    print(f"Output directory for all categories: {base_output_dir}", flush=True)

    # Read label files
    entries_by_cat = {cat_folder: [] for cat_folder in CLASS_MAP.values()}

    for label_filename in ["train.txt", "val.txt", "test.txt"]:
        label_file = labels_dir / label_filename
        if not label_file.exists():
            continue

        split_name = label_filename.replace(".txt", "")
        with open(label_file, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) == 2:
                    rel_path, cat = parts[0], parts[1]
                    cat_folder = CLASS_MAP.get(cat)
                    if cat_folder:
                        entries_by_cat[cat_folder].append((split_name, rel_path))

    print("\nStarting extraction of flat image files per document category...", flush=True)

    total_copied = 0
    total_missing = 0

    for cat_folder, items in entries_by_cat.items():
        cat_dir = base_output_dir / cat_folder
        cat_dir.mkdir(parents=True, exist_ok=True)

        copied = 0
        missing = 0
        manifest_rows = ["split,original_rel_path,flat_filename\n"]

        for split, rel_path in items:
            src_path = images_dir / rel_path
            if not src_path.exists():
                src_path = archive_dir / rel_path

            if src_path.exists():
                clean_rel = rel_path.replace("/", "_").replace("\\", "_")
                flat_filename = f"{split}_{clean_rel}"
                dest_path = cat_dir / flat_filename

                if not dest_path.exists():
                    shutil.copy2(src_path, dest_path)

                copied += 1
                manifest_rows.append(f"{split},{rel_path},{flat_filename}\n")
            else:
                missing += 1

        manifest_file = cat_dir / "manifest.csv"
        with open(manifest_file, "w", encoding="utf-8") as f:
            f.writelines(manifest_rows)

        total_copied += copied
        total_missing += missing
        print(f"[{cat_folder}] Extracted {copied} flat images (Missing: {missing}) -> {cat_dir}", flush=True)

    print("\nExtraction of all 16 document categories complete!", flush=True)
    print(f"Total flat document images processed: {total_copied}", flush=True)
    print(f"Total missing images: {total_missing}", flush=True)

if __name__ == "__main__":
    extract_all_categories()
