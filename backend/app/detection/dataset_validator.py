"""
YOLO Dataset Validator for Industrial Worker Safety Detection.

Validates:
1. Dataset directory structure (images/train, images/val, labels/train, labels/val)
2. data.yaml configuration (keys: train, val, nc, names)
3. Label file format: `<class_id> <x_center> <y_center> <width> <height>` (normalized 0.0 to 1.0)
4. Class IDs are within [0, nc-1]
5. Coordinates are valid floats within bounds [0.0, 1.0]
6. Image readability and integrity (checks corrupted image headers)
7. Missing label / unannotated image detection
"""
import os
import sys
import yaml
import argparse
import cv2
from typing import Dict, Any, List


class DatasetValidator:
    """Validates YOLO-formatted datasets for EdgeVision AI model fine-tuning."""

    def __init__(self, dataset_dir: str):
        self.dataset_dir = os.path.abspath(dataset_dir)
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate(self) -> Dict[str, Any]:
        """Runs complete validation check on the dataset."""
        if not os.path.isdir(self.dataset_dir):
            return {
                "valid": False,
                "dataset_dir": self.dataset_dir,
                "errors": [f"Directory '{self.dataset_dir}' does not exist."],
                "warnings": [],
                "stats": {},
            }

        data_yaml_path = os.path.join(self.dataset_dir, "data.yaml")
        if not os.path.isfile(data_yaml_path):
            self.errors.append("Missing 'data.yaml' in root of dataset directory.")
            return {"valid": False, "errors": self.errors, "warnings": self.warnings, "stats": {}}

        try:
            with open(data_yaml_path, "r") as f:
                config = yaml.safe_load(f)
        except Exception as e:
            self.errors.append(f"Failed to parse 'data.yaml': {e}")
            return {"valid": False, "errors": self.errors, "warnings": self.warnings, "stats": {}}

        # Verify YAML keys
        nc = config.get("nc", 0)
        names = config.get("names", [])
        if isinstance(names, dict):
            names = list(names.values())

        if not names or len(names) != nc:
            self.errors.append(f"Mismatch in data.yaml: 'nc' ({nc}) does not match length of 'names' ({len(names)}).")

        stats = {
            "num_classes": nc,
            "classes": names,
            "splits": {},
            "total_images": 0,
            "total_annotations": 0,
        }

        # Check splits
        for split in ["train", "val", "test"]:
            img_dir = os.path.join(self.dataset_dir, "images", split)
            lbl_dir = os.path.join(self.dataset_dir, "labels", split)

            if not os.path.isdir(img_dir):
                if split in ["train", "val"]:
                    self.errors.append(f"Required split directory '{img_dir}' missing.")
                continue

            split_imgs = [
                f for f in os.listdir(img_dir)
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp"))
            ]
            split_annotations = 0
            corrupted_images = 0
            unmatched_labels = 0

            for img_name in split_imgs:
                img_path = os.path.join(img_dir, img_name)
                # Verify image can be read
                img = cv2.imread(img_path)
                if img is None:
                    corrupted_images += 1
                    self.errors.append(f"Corrupted image file: {img_path}")
                    continue

                base_name = os.path.splitext(img_name)[0]
                lbl_path = os.path.join(lbl_dir, f"{base_name}.txt")

                if not os.path.exists(lbl_path):
                    unmatched_labels += 1
                    continue

                # Read annotations
                try:
                    with open(lbl_path, "r") as lf:
                        lines = lf.readlines()
                    for line_no, line in enumerate(lines):
                        parts = line.strip().split()
                        if not parts:
                            continue
                        if len(parts) != 5:
                            self.errors.append(f"{lbl_path}:{line_no+1} Expected 5 tokens (cls, x, y, w, h), got {len(parts)}.")
                            continue

                        cls_idx = int(parts[0])
                        x, y, w, h = map(float, parts[1:])

                        if cls_idx < 0 or cls_idx >= nc:
                            self.errors.append(f"{lbl_path}:{line_no+1} Class ID {cls_idx} outside valid range [0, {nc-1}].")

                        for val, name in [(x, 'x'), (y, 'y'), (w, 'w'), (h, 'h')]:
                            if val < 0.0 or val > 1.0:
                                self.errors.append(f"{lbl_path}:{line_no+1} Coordinate {name}={val} outside normalized [0.0, 1.0].")

                        split_annotations += 1
                except Exception as e:
                    self.errors.append(f"Error reading annotation {lbl_path}: {e}")

            if unmatched_labels > 0:
                self.warnings.append(f"Split '{split}' has {unmatched_labels} images without annotation txt (considered background).")

            stats["splits"][split] = {
                "images": len(split_imgs),
                "annotations": split_annotations,
                "corrupted": corrupted_images,
            }
            stats["total_images"] += len(split_imgs)
            stats["total_annotations"] += split_annotations

        is_valid = len(self.errors) == 0
        return {
            "valid": is_valid,
            "dataset_dir": self.dataset_dir,
            "errors": self.errors,
            "warnings": self.warnings,
            "stats": stats,
        }


def create_mock_dataset(target_dir: str):
    """Generates a small mock YOLO PPE dataset structure for testing and verification."""
    os.makedirs(os.path.join(target_dir, "images", "train"), exist_ok=True)
    os.makedirs(os.path.join(target_dir, "images", "val"), exist_ok=True)
    os.makedirs(os.path.join(target_dir, "labels", "train"), exist_ok=True)
    os.makedirs(os.path.join(target_dir, "labels", "val"), exist_ok=True)

    yaml_content = {
        "train": "./images/train",
        "val": "./images/val",
        "nc": 6,
        "names": ["person", "hardhat", "no_hardhat", "vest", "no_vest", "fall_risk"]
    }
    with open(os.path.join(target_dir, "data.yaml"), "w") as f:
        yaml.dump(yaml_content, f)

    # Create dummy images and label files
    import numpy as np
    for split in ["train", "val"]:
        for i in range(2):
            img_path = os.path.join(target_dir, "images", split, f"sample_{i}.jpg")
            lbl_path = os.path.join(target_dir, "labels", split, f"sample_{i}.txt")
            
            # 640x640 blank image
            dummy = np.zeros((640, 640, 3), dtype=np.uint8)
            cv2.imwrite(img_path, dummy)

            # Valid YOLO annotations
            with open(lbl_path, "w") as lf:
                lf.write("0 0.5 0.5 0.3 0.8\n")
                lf.write("1 0.5 0.2 0.1 0.1\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate YOLO dataset for EdgeVision AI.")
    parser.add_argument("--path", default="training/dataset", help="Path to YOLO dataset directory")
    parser.add_argument("--create-sample", action="store_true", help="Create a sample valid dataset structure for testing")
    args = parser.parse_args()

    if args.create_sample:
        sample_path = "backend/training/sample_dataset"
        create_mock_dataset(sample_path)
        print(f"Created sample dataset at: {sample_path}")
        validator = DatasetValidator(sample_path)
        report = validator.validate()
        import json
        print(json.dumps(report, indent=2))
    else:
        validator = DatasetValidator(args.path)
        report = validator.validate()
        import json
        print(json.dumps(report, indent=2))
        if not report["valid"]:
            sys.exit(1)
