"""
Detection engine wrapping Ultralytics YOLOv8.

NOTE ON THE MODEL:
This ships with the stock pretrained `yolov8n.pt` (COCO classes), which reliably
detects the `person` class only — COCO has no hardhat/vest classes. To get real
PPE detection (hardhat / no-hardhat / vest / no-vest), fine-tune on a PPE
dataset — see `backend/training/README.md` for the full walkthrough
(download script + train script + a free-Colab path, ~30-45 min end to end).

Point MODEL_PATH (.env) at the resulting best.pt once you have it — nothing
else in this codebase needs to change. PPE_CLASS_MAP below maps a trained
model's raw class names to the internal names this app uses; update it to
match whatever your dataset's data.yaml lists (case-sensitive). The defaults
here match Roboflow's "Construction Site Safety" dataset, the one recommended
in the training README — swap them if you trained on a different dataset.
"""
import json
from ultralytics import YOLO
from app.config import settings

# Expected class names from a PPE-trained model, keyed lowercase with spaces
# turned to hyphens (that's how infer() below normalizes raw model output
# before looking it up here — case and underscores in the dataset don't
# matter). These defaults match Roboflow's "Construction Site Safety" set;
# see backend/training/README.md if you trained on something else.
PPE_CLASS_MAP = {
    "person": "person",
    "hardhat": "hardhat",
    "no-hardhat": "no_hardhat",
    "safety-vest": "vest",
    "no-safety-vest": "no_vest",
    "vest": "vest",
    "no-vest": "no_vest",
}

VIOLATION_CLASSES = {"no_hardhat", "no_vest"}

SEVERITY_MAP = {
    "no_hardhat": "high",
    "no_vest": "medium",
    "zone_intrusion": "critical",
}


class Detector:
    def __init__(self):
        self.model = YOLO(settings.MODEL_PATH)
        self.class_names = self.model.names
        # True only when a real PPE-trained model is loaded
        self.ppe_capable = any(
            name.lower().replace(" ", "-").replace("_", "-") in ("hardhat", "no-hardhat", "vest", "no-vest", "safety-vest", "no-safety-vest")
            for name in self.class_names.values()
        )

    def infer(self, frame):
        """Run inference on a single BGR numpy frame. Returns list of detections."""
        results = self.model.predict(frame, conf=settings.CONFIDENCE_THRESHOLD, verbose=False)[0]
        detections = []
        for box in results.boxes:
            cls_id = int(box.cls[0])
            raw_name = self.class_names[cls_id]
            norm_name = raw_name.lower().replace(" ", "-").replace("_", "-")
            mapped = PPE_CLASS_MAP.get(norm_name, raw_name)
            xyxy = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            detections.append(
                {
                    "class": mapped,
                    "confidence": round(conf, 3),
                    "bbox": [round(v, 1) for v in xyxy],
                    "is_violation": mapped in VIOLATION_CLASSES,
                }
            )
        return detections

    def bbox_center_normalized(self, bbox, frame_w, frame_h):
        x1, y1, x2, y2 = bbox
        cx = ((x1 + x2) / 2) / frame_w
        cy = ((y1 + y2) / 2) / frame_h
        return cx, cy


detector = Detector()
