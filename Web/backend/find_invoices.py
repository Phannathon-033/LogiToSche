import os
import shutil
from pathlib import Path

def process_invoices():
    archive_dir = Path(r"E:\Logistics To JSON\archive")
    labels_dir = archive_dir / "labels"
    images_dir = archive_dir / "images"
    output_dir = archive_dir / "invoices"

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Archive directory: {archive_dir}", flush=True)
    print(f"Output directory: {output_dir}", flush=True)

    invoices = []

    for label_filename in ["train.txt", "val.txt", "test.txt"]:
        label_file = labels_dir / label_filename
        if not label_file.exists():
            print(f"Warning: {label_file} not found", flush=True)
            continue

        count = 0
        with open(label_file, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) == 2:
                    rel_path, cat = parts[0], parts[1]
                    if cat == "11":
                        invoices.append((label_filename.replace(".txt", ""), rel_path))
                        count += 1
        print(f"Found {count} invoice entries in {label_filename}", flush=True)

    print(f"\nTotal invoice entries across dataset: {len(invoices)}", flush=True)

    copied_count = 0
    missing_count = 0
    manifest_lines = []

    for index, (split, rel_path) in enumerate(invoices, 1):
        src_path = images_dir / rel_path
        if not src_path.exists():
            src_path = archive_dir / rel_path

        if src_path.exists():
            dest_path = output_dir / split / rel_path
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            
            if not dest_path.exists():
                shutil.copy2(src_path, dest_path)
            
            copied_count += 1
            manifest_lines.append(f"{split}/{rel_path}\n")
        else:
            missing_count += 1

        if index % 2500 == 0:
            print(f"Progress: {index}/{len(invoices)} invoices processed...", flush=True)

    manifest_file = output_dir / "invoice_manifest.txt"
    with open(manifest_file, "w", encoding="utf-8") as f:
        f.writelines(manifest_lines)

    print(f"\nSuccessfully extracted {copied_count} invoice files to {output_dir}", flush=True)
    print(f"Missing image files: {missing_count}", flush=True)
    print(f"Manifest created at: {manifest_file}", flush=True)

if __name__ == "__main__":
    process_invoices()
