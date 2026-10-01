from pathlib import Path
import shutil

SOURCE = Path("datasets/construction-ppe")
DEST = Path("data/processed/dataset1")

CLASS_MAP = {
    0: 1,   # helmet -> helmet
    1: 5,   # gloves -> gloves
    2: 3,   # vest -> vest
    3: 6,   # boots -> boots
    4: 8,   # goggles -> goggles
    6: 0,   # Person -> person
    7: 2,   # no_helmet -> no_helmet
    8: 9,   # no_goggle -> no_goggle
    9: 10,  # no_gloves -> no_gloves
    10: 7,  # no_boots -> no_boots
}

SPLITS = ["train", "val", "test"]

for split in SPLITS:
    image_dir = SOURCE / "images" / split
    label_dir = SOURCE / "labels" / split

    out_split = "valid" if split == "val" else split
    out_images = DEST / out_split / "images"
    out_labels = DEST / out_split / "labels"

    out_images.mkdir(parents=True, exist_ok=True)
    out_labels.mkdir(parents=True, exist_ok=True)

    kept = 0

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

        if not new_lines:
            continue

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

        kept += 1

    print(f"{out_split}: {kept} images")

print("Dataset #1 conversion completed.")
