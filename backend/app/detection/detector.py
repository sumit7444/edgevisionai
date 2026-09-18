"""
Industrial EdgeVision AI — High-Performance YOLOv8 Detection Engine.

Provides:
- Model loading with device acceleration (CUDA -> Apple MPS -> CPU)
- Model versioning tracking
- Configurable confidence and IoU thresholds
- Latency and FPS metrics measurement
- Duplicate detection suppression (IoU-based Non-Maximum Suppression)
- Structured detection schema containing camera_id, timestamp, frame_id, model_version, track_id
- Comprehensive error handling for corrupted/invalid frames
"""
import time
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import torch
from ultralytics import YOLO

from app.config import settings

logger = logging.getLogger("edgevision.detector")

# Comprehensive industrial PPE and hazard class mappings
PPE_CLASS_MAP = {
    "person": "person",
    "worker": "person",
    "hardhat": "hardhat",
    "helmet": "hardhat",
    "no-hardhat": "no_hardhat",
    "no-helmet": "no_hardhat",
    "safety-vest": "vest",
    "vest": "vest",
    "no-safety-vest": "no_vest",
    "no-vest": "no_vest",
    "gloves": "gloves",
    "safety-gloves": "gloves",
    "no-gloves": "no_gloves",
    "no-safety-gloves": "no_gloves",
    "goggles": "goggles",
    "safety-goggles": "goggles",
    "no-goggles": "no_goggles",
    "no-safety-goggles": "no_goggles",
    "mask": "mask",
    "no-mask": "no_mask",
    "safety-shoes": "safety_shoes",
    "boots": "safety_shoes",
    "no-safety-shoes": "no_safety_shoes",
    "smoke": "smoke",
    "fire": "smoke",
    "fall": "fall_risk",
    "fall-risk": "fall_risk",
}

VIOLATION_CLASSES = {
    "no_hardhat",
    "no_vest",
    "no_gloves",
    "no_goggles",
    "no_mask",
    "no_safety_shoes",
    "smoke",
    "fall_risk",
    "zone_intrusion",
    "proximity_risk",
}

SEVERITY_MAP = {
    "no_hardhat": "high",
    "no_vest": "medium",
    "no_gloves": "medium",
    "no_goggles": "medium",
    "no_mask": "low",
    "no_safety_shoes": "medium",
    "smoke": "critical",
    "fall_risk": "critical",
    "zone_intrusion": "critical",
    "proximity_risk": "high",
}

_KNOWN_PPE_KEYS = {
    "hardhat", "no-hardhat", "helmet", "no-helmet", "vest", "no-vest", "safety-vest", "no-safety-vest",
    "gloves", "no-gloves", "goggles", "no-goggles", "mask", "no-mask", "smoke", "fire",
    "safety-shoes", "no-safety-shoes", "fall", "fall-risk",
}


def calculate_iou(box1: List[float], box2: List[float]) -> float:
    """Calculate Intersection over Union (IoU) of two bounding boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0.0


def suppress_duplicates(detections: List[Dict[str, Any]], iou_threshold: float = 0.5) -> List[Dict[str, Any]]:
    """Suppresses duplicate bounding boxes for identical classes using Non-Maximum Suppression."""
    if not detections:
        return []

    # Sort descending by confidence
    sorted_dets = sorted(detections, key=lambda d: d.get("confidence", 0.0), reverse=True)
    kept: List[Dict[str, Any]] = []

    for det in sorted_dets:
        discard = False
        for k in kept:
            if det["class"] == k["class"]:
                if calculate_iou(det["bbox"], k["bbox"]) >= iou_threshold:
                    discard = True
                    break
        if not discard:
            kept.append(det)

    return kept


class Detector:
    """Production YOLOv8 inference wrapper with GPU/MPS/CPU fallback and latency monitoring."""

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or settings.MODEL_PATH
        self.model_version = settings.MODEL_VERSION
        self.device = self._select_device(settings.DEVICE)
        self.frame_counter = 0

        # Latency tracking (sliding window of last 30 frames)
        self._latencies: List[float] = []
        self._last_inference_time: float = time.time()
        self.current_fps: float = 0.0
        self.avg_latency_ms: float = 0.0

        try:
            self.model = YOLO(self.model_path)
            self.class_names = self.model.names
            logger.info(f"Loaded YOLO model '{self.model_path}' on device '{self.device}'")
        except Exception as e:
            logger.error(f"Failed to load model from {self.model_path}: {e}. Falling back to stock yolov8n.pt")
            self.model = YOLO("yolov8n.pt")
            self.class_names = self.model.names
            self.model_path = "yolov8n.pt"

        # Check if model has PPE classes or is COCO person-only
        self.ppe_capable = any(
            name.lower().replace(" ", "-").replace("_", "-") in _KNOWN_PPE_KEYS
            for name in self.class_names.values()
        )

    def _select_device(self, requested: str) -> str:
        """Determines best hardware accelerator available."""
        if requested in ("cuda", "gpu") and torch.cuda.is_available():
            return "cuda"
        if requested == "mps" and torch.backends.mps.is_available():
            return "mps"
        if requested == "auto":
            if torch.cuda.is_available():
                return "cuda"
            if torch.backends.mps.is_available():
                return "mps"
        return "cpu"

    def infer(
        self,
        frame: np.ndarray,
        camera_id: str = "cam-01",
        frame_id: Optional[int] = None,
        confidence: Optional[float] = None,
        iou_threshold: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Runs object detection on a BGR image frame.
        
        Returns a list of structured detections containing:
        - class: normalized string name
        - confidence: detection probability (0.0 to 1.0)
        - bbox: [x1, y1, x2, y2] pixel coordinates
        - norm_bbox: [nx1, ny1, nx2, ny2] normalized coordinates (0.0 to 1.0)
        - is_violation: boolean flag
        - track_id: None or tracker identifier
        - camera_id: identifier string
        - timestamp: UTC timestamp string
        - frame_id: frame sequence number
        - model_version: model identifier string
        """
        # Validate input frame
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            logger.warning("Empty or invalid frame passed to detector. Returning empty detections.")
            return []

        h, w = frame.shape[:2]
        if h <= 0 or w <= 0:
            return []

        self.frame_counter += 1
        current_frame_id = frame_id if frame_id is not None else self.frame_counter
        now_utc = datetime.now(timezone.utc).isoformat()
        conf = confidence if confidence is not None else settings.CONFIDENCE_THRESHOLD
        iou_thresh = iou_threshold if iou_threshold is not None else settings.IOU_THRESHOLD

        start_time = time.time()

        try:
            results = self.model.predict(
                frame,
                conf=conf,
                iou=iou_thresh,
                device=self.device,
                verbose=False,
            )[0]
        except Exception as e:
            logger.error(f"Inference error on frame {current_frame_id}: {e}")
            return []

        raw_detections: List[Dict[str, Any]] = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            raw_name = self.class_names[cls_id]
            norm_name = raw_name.lower().replace(" ", "-").replace("_", "-")
            mapped = PPE_CLASS_MAP.get(norm_name, raw_name)
            xyxy = box.xyxy[0].tolist()
            det_conf = float(box.conf[0])

            x1, y1, x2, y2 = xyxy
            nx1 = round(max(0.0, min(1.0, x1 / w)), 4)
            ny1 = round(max(0.0, min(1.0, y1 / h)), 4)
            nx2 = round(max(0.0, min(1.0, x2 / w)), 4)
            ny2 = round(max(0.0, min(1.0, y2 / h)), 4)

            raw_detections.append(
                {
                    "class": mapped,
                    "confidence": round(det_conf, 3),
                    "bbox": [round(v, 1) for v in xyxy],
                    "norm_bbox": [nx1, ny1, nx2, ny2],
                    "is_violation": mapped in VIOLATION_CLASSES,
                    "track_id": None,
                    "camera_id": camera_id,
                    "timestamp": now_utc,
                    "frame_id": current_frame_id,
                    "model_version": self.model_version,
                }
            )

        # Apply Non-Maximum Suppression to eliminate duplicate overlaps
        suppressed = suppress_duplicates(raw_detections, iou_threshold=settings.NMS_THRESHOLD)

        # Update FPS and latency metrics
        elapsed_ms = (time.time() - start_time) * 1000.0
        self._latencies.append(elapsed_ms)
        if len(self._latencies) > 30:
            self._latencies.pop(0)

        self.avg_latency_ms = round(sum(self._latencies) / len(self._latencies), 1)
        now = time.time()
        time_diff = now - self._last_inference_time
        if time_diff > 0:
            self.current_fps = round(1.0 / time_diff, 1)
        self._last_inference_time = now

        return suppressed

    def bbox_center_normalized(self, bbox: List[float], frame_w: int, frame_h: int) -> Tuple[float, float]:
        """Calculates normalized center (cx, cy) from bounding box."""
        x1, y1, x2, y2 = bbox
        cx = ((x1 + x2) / 2.0) / frame_w
        cy = ((y1 + y2) / 2.0) / frame_h
        return cx, cy

    def get_performance_stats(self) -> Dict[str, Any]:
        """Returns engine performance metrics."""
        return {
            "model_path": self.model_path,
            "model_version": self.model_version,
            "device": self.device,
            "ppe_capable": self.ppe_capable,
            "avg_latency_ms": self.avg_latency_ms,
            "current_fps": self.current_fps,
            "total_frames_processed": self.frame_counter,
        }


# Singleton instance used throughout backend
detector = Detector()