import os
from collections import Counter, defaultdict
from pathlib import Path

CLASS_MAP = {
    "0": "letter",
    "1": "form",
    "2": "email",
    "3": "handwritten",
    "4": "advertisement",
    "5": "scientific_report",
    "6": "scientific_publication",
    "7": "specification",
    "8": "file_folder",
    "9": "news_article",
    "10": "budget",
    "11": "invoice",
    "12": "presentation",
    "13": "questionnaire",
    "14": "resume",
    "15": "memo",
}

def count_classes():
    archive_dir = Path(r"E:\Logistics To JSON\archive")
    labels_dir = archive_dir / "labels"

    counts = defaultdict(lambda: defaultdict(int))
    total_per_class = defaultdict(int)

    for label_filename in ["train.txt", "val.txt", "test.txt"]:
        label_file = labels_dir / label_filename
        if not label_file.exists():
            continue

        split_name = label_filename.replace(".txt", "")
        with open(label_file, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) == 2:
                    cat = parts[1]
                    class_name = CLASS_MAP.get(cat, f"class_{cat}")
                    counts[class_name][split_name] += 1
                    total_per_class[class_name] += 1

    print("=" * 65, flush=True)
    print("RVL-CDIP DATASET CLASS DISTRIBUTION SUMMARY", flush=True)
    print("=" * 65, flush=True)
    print(f"{'Category ID':<12} {'Class Name':<24} {'Train':<8} {'Val':<8} {'Test':<8} {'Total':<8}", flush=True)
    print("-" * 65, flush=True)

    for cat_id_num in range(16):
        cat_id = str(cat_id_num)
        name = CLASS_MAP[cat_id]
        train_c = counts[name]["train"]
        val_c = counts[name]["val"]
        test_c = counts[name]["test"]
        tot = total_per_class[name]
        print(f"{cat_id:<12} {name:<24} {train_c:<8} {val_c:<8} {test_c:<8} {tot:<8}", flush=True)

    print("-" * 65, flush=True)
    grand_total = sum(total_per_class.values())
    print(f"GRAND TOTAL DOCUMENTS: {grand_total}", flush=True)
    print("=" * 65, flush=True)

if __name__ == "__main__":
    count_classes()
