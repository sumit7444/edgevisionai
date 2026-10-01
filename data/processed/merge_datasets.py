from pathlib import Path
import shutil

DATASETS = {
    "d1": Path("data/processed/dataset1"),
    "d2": Path("data/processed/dataset2"),
}

FINAL = Path("data/processed/final")

SPLITS = ["train", "valid", "test"]

for split in SPLITS:
    final_images = FINAL / split / "images"
    final_labels = FINAL / split / "labels"

    final_images.mkdir(parents=True, exist_ok=True)
    final_labels.mkdir(parents=True, exist_ok=True)

    total = 0

    for prefix, dataset in DATASETS.items():
        image_dir = dataset / split / "images"
        label_dir = dataset / split / "labels"

        if not image_dir.exists():
            print(f"WARNING: missing {image_dir}")
            continue

        for image_file in image_dir.iterdir():
            if not image_file.is_file():
                continue

            label_file = label_dir / f"{image_file.stem}.txt"

            if not label_file.exists():
                print(f"WARNING: missing label for {image_file.name}")
                continue

            new_name = f"{prefix}_{image_file.name}"
            new_label = f"{prefix}_{image_file.stem}.txt"

            shutil.copy2(image_file, final_images / new_name)
            shutil.copy2(label_file, final_labels / new_label)

            total += 1

    print(f"{split}: {total} images merged")

print("Final dataset merge completed.")
