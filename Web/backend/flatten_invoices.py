import os
import shutil
from pathlib import Path

def flatten_invoices():
    archive_dir = Path(r"E:\Logistics To JSON\archive")
    labels_dir = archive_dir / "labels"
    images_dir = archive_dir / "images"
    output_dir = archive_dir / "invoices_images"

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Archive directory: {archive_dir}", flush=True)
    print(f"Flat output directory: {output_dir}", flush=True)

    invoices = []

    for label_filename in ["train.txt", "val.txt", "test.txt"]:
        label_file = labels_dir / label_filename
        if not label_file.exists():
            print(f"Warning: {label_file} not found", flush=True)
            continue

        split_name = label_filename.replace(".txt", "")
        count = 0
        with open(label_file, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) == 2:
                    rel_path, cat = parts[0], parts[1]
                    if cat == "11":
                        invoices.append((split_name, rel_path))
                        count += 1
        print(f"Found {count} invoice entries in {label_filename}", flush=True)

    print(f"\nTotal invoice entries across dataset: {len(invoices)}", flush=True)

    copied_count = 0
    missing_count = 0
    manifest_rows = ["original_split,original_rel_path,flat_filename\n"]

    for index, (split, rel_path) in enumerate(invoices, 1):
        src_path = images_dir / rel_path
        if not src_path.exists():
            src_path = archive_dir / rel_path

        if src_path.exists():
            # Create a clean flat unique filename (e.g. invoice_train_00001_521107137+-7140.tif)
            clean_rel = rel_path.replace("/", "_").replace("\\", "_")
            flat_filename = f"{split}_{clean_rel}"
            dest_path = output_dir / flat_filename

            if not dest_path.exists():
                shutil.copy2(src_path, dest_path)

            copied_count += 1
            manifest_rows.append(f"{split},{rel_path},{flat_filename}\n")
        else:
            missing_count += 1

        if index % 2500 == 0:
            print(f"Progress: {index}/{len(invoices)} flat images processed...", flush=True)

    manifest_file = output_dir / "invoice_flat_manifest.csv"
    with open(manifest_file, "w", encoding="utf-8") as f:
        f.writelines(manifest_rows)

    print(f"\nCompleted! Successfully copied {copied_count} flat invoice image files to:")
    print(f"📁 {output_dir}")
    print(f"Missing image files: {missing_count}")
    print(f"Manifest CSV created at: {manifest_file}", flush=True)

if __name__ == "__main__":
    flatten_invoices()
