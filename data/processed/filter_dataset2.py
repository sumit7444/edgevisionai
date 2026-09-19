from pathlib import Path
import shutil

SOURCE = Path("data/raw/dataset2/extracted")
DEST = Path("data/processed/dataset2")

# Source ID -> temporary Dataset #2 ID
CLASS_MAP = {
    5: 0,  # Person -> person
    7: 1,  # Safety Vest -> vest
    4: 2,  # NO-Safety Vest -> no_vest
    9: 3,  # vehicle -> vehicle
}

SPLITS = {
    "train": "train",
    "valid": "valid",
    "test": "test",
}

for source_split, dest_split in SPLITS.items():
    image_dir = SOURCE / source_split / "images"
    label_dir = SOURCE / source_split / "labels"

    out_images = DEST / dest_split / "images"
    out_labels = DEST / dest_split / "labels"

    out_images.mkdir(parents=True, exist_ok=True)
    out_labels.mkdir(parents=True, exist_ok=True)

    kept_images = 0
    kept_labels = 0

    for label_file in label_dir.glob("*.txt"):
        lines = label_file.read_text(encoding="utf-8").splitlines()
        new_lines = []

        for line in lines:
            parts = line.split()

            if len(parts) != 5:
                continue

            source_id = int(parts[0])

            if source_id in CLASS_MAP:
                parts[0] = str(CLASS_MAP[source_id])
                new_lines.append(" ".join(parts))

        # Only keep images that contain at least one required class
        if not new_lines:
            continue

        # Find corresponding image
        image_file = None
        for ext in [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"]:
            candidate = image_dir / (label_file.stem + ext)
            if candidate.exists():
                image_file = candidate
                break

        if image_file is None:
            print(f"WARNING: image missing for {label_file.name}")
            continue

        shutil.copy2(image_file, out_images / image_file.name)
        (out_labels / label_file.name).write_text(
            "\n".join(new_lines) + "\n",
            encoding="utf-8"
        )

        kept_images += 1
        kept_labels += 1

    print(f"{dest_split}: {kept_images} images, {kept_labels} labels")

print("Dataset #2 filtering completed.")
