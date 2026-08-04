"""
Detection engine wrapping Ultralytics YOLOv8.

NOTE ON THE MODEL:
This ships with the stock pretrained `yolov8n.pt` (COCO classes), which reliably
detects the `person` class only — COCO has no PPE classes. To get real PPE
detection, fine-tune on a PPE dataset — see `backend/training/README.md` for
the full walkthrough (download script + train script + a free-Colab path).

Point MODEL_PATH (.env) at the resulting best.pt once you have it — nothing
else in this codebase needs to change. PPE_CLASS_MAP below maps a trained
model's raw class names to the internal names this app uses; extend it to
match whatever your dataset's data.yaml lists (case-sensitive keys are
normalized to lowercase-hyphenated before lookup, see infer() below).

CUSTOM / EXTRA PPE CLASSES (gloves, goggles, mask, smoke):
The class map and severity table below are already wired for gloves, goggles,
mask, and a smoke/fire hazard class, on top of the original hardhat/vest —
add/remove entries here to change what the app recognizes as a violation.
But wiring the app to recognize a class name is not the same as the loaded
model actually being able to detect it: hardhat/vest come from the
Construction Site Safety dataset already covered in the training README;
gloves/goggles/mask are less commonly bundled into one public dataset, and
smoke/fire detection is a genuinely different visual domain (not PPE) —
realistically a separate fire/smoke-detection model. Running two models in
one inference pass means calling detector twice per frame (more compute);
this file supports a single model for now. See training/README.md for
dataset notes on each class.
"""
import json
from ultralytics import YOLO
from app.config import settings

# Expected class names from a PPE-trained model, keyed lowercase with spaces
# turned to hyphens (that's how infer() below normalizes raw model output
# before looking it up here — case and underscores in the dataset don't
# matter). Extend this to whatever classes your model actually outputs.
PPE_CLASS_MAP = {
    "person": "person",
    "hardhat": "hardhat",
    "no-hardhat": "no_hardhat",
    "safety-vest": "vest",
    "no-safety-vest": "no_vest",
    "vest": "vest",
    "no-vest": "no_vest",
    "gloves": "gloves",
    "no-gloves": "no_gloves",
    "goggles": "goggles",
    "no-goggles": "no_goggles",
    "safety-goggles": "goggles",
    "no-safety-goggles": "no_goggles",
    "mask": "mask",
    "no-mask": "no_mask",
    "smoke": "smoke",
    "fire": "smoke",
}

# "no_X" classes are absence-of-PPE violations. "smoke" is a presence-based
# hazard violation (there's no "wearing smoke" compliant state) — kept in
# the same set since the app treats both the same way downstream (logged,
# alerted, zone-tagged), only the label and severity differ.
VIOLATION_CLASSES = {"no_hardhat", "no_vest", "no_gloves", "no_goggles", "no_mask", "smoke"}

SEVERITY_MAP = {
    "no_hardhat": "high",
    "no_vest": "medium",
    "no_gloves": "medium",
    "no_goggles": "medium",
    "no_mask": "medium",
    "smoke": "critical",
    "zone_intrusion": "critical",
}

# Normalized keys this app recognizes as "the model is PPE-capable" — used
# only to show an honest badge in the UI, not to gate functionality.
_KNOWN_PPE_KEYS = {
    "hardhat", "no-hardhat", "vest", "no-vest", "safety-vest", "no-safety-vest",
    "gloves", "no-gloves", "goggles", "no-goggles", "safety-goggles", "no-safety-goggles",
    "mask", "no-mask", "smoke", "fire",
}


class Detector:
    def __init__(self):
        self.model = YOLO(settings.MODEL_PATH)
        self.class_names = self.model.names
        # True only when a real PPE-trained model is loaded
        self.ppe_capable = any(
            name.lower().replace(" ", "-").replace("_", "-") in _KNOWN_PPE_KEYS
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