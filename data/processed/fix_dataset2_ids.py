from pathlib import Path

ROOT = Path("data/processed/final")

# Dataset #2 temporary ID -> EdgeVision master ID
REMAP = {
    0: 0,   # person -> person
    1: 3,   # vest -> vest
    2: 4,   # no_vest -> no_vest
    3: 11,  # vehicle -> vehicle
}

for split in ["train", "valid", "test"]:
    label_dir = ROOT / split / "labels"

    for label_file in label_dir.glob("d2_*.txt"):
        lines = label_file.read_text(encoding="utf-8").splitlines()
        new_lines = []

        for line in lines:
            parts = line.split()

            if len(parts) != 5:
                continue

            old_id = int(parts[0])

            if old_id not in REMAP:
                raise ValueError(
                    f"Unexpected Dataset #2 ID {old_id} in {label_file}"
                )

            parts[0] = str(REMAP[old_id])
            new_lines.append(" ".join(parts))

        label_file.write_text(
            "\n".join(new_lines) + ("\n" if new_lines else ""),
            encoding="utf-8"
        )

    print(f"{split}: Dataset #2 IDs remapped")

print("Dataset #2 class-ID correction completed.")
