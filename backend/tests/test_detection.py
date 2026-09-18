"""
Unit tests for AI/ML Module: EdgeVision AI Object Detection & Validation.
"""
import pytest
import numpy as np
from app.detection.detector import detector, calculate_iou, suppress_duplicates, PPE_CLASS_MAP, VIOLATION_CLASSES
from app.detection.evaluator import ModelEvaluator
from app.detection.dataset_validator import DatasetValidator, create_mock_dataset


def test_iou_calculation():
    box_a = [0, 0, 10, 10]
    box_b = [0, 0, 10, 10]
    assert calculate_iou(box_a, box_b) == 1.0

    box_c = [10, 10, 20, 20]
    assert calculate_iou(box_a, box_c) == 0.0

    # 50% overlap calculation
    box_d = [0, 0, 10, 5]
    assert calculate_iou(box_a, box_d) == 0.5


def test_duplicate_suppression():
    detections = [
        {"class": "person", "bbox": [100, 100, 200, 300], "confidence": 0.95},
        {"class": "person", "bbox": [102, 101, 198, 299], "confidence": 0.88},  # Duplicate
        {"class": "hardhat", "bbox": [120, 100, 180, 150], "confidence": 0.90},  # Different class
    ]
    kept = suppress_duplicates(detections, iou_threshold=0.5)
    assert len(kept) == 2
    classes = [d["class"] for d in kept]
    assert classes == ["person", "hardhat"]
    assert kept[0]["confidence"] == 0.95


def test_detector_invalid_frame_handling():
    # None frame
    assert detector.infer(None) == []

    # Empty frame
    empty_frame = np.zeros((0, 0, 3), dtype=np.uint8)
    assert detector.infer(empty_frame) == []


def test_detector_schema_and_inference():
    # Create valid synthetic 640x640 frame
    frame = np.zeros((640, 640, 3), dtype=np.uint8)
    results = detector.infer(frame, camera_id="cam-test", frame_id=42)

    assert isinstance(results, list)
    stats = detector.get_performance_stats()
    assert "avg_latency_ms" in stats
    assert "current_fps" in stats
    assert stats["model_version"] is not None


def test_model_evaluator():
    evaluator = ModelEvaluator(detector)
    report = evaluator.run_synthetic_benchmark()

    assert "evaluation_metrics" in report
    assert "latency_benchmarks" in report
    overall = report["evaluation_metrics"]["overall"]
    assert "precision" in overall
    assert "recall" in overall
    assert "map50" in overall
    assert overall["precision"] > 0.8


def test_dataset_validator(tmp_path):
    dataset_dir = tmp_path / "yolo_dataset"
    create_mock_dataset(str(dataset_dir))

    validator = DatasetValidator(str(dataset_dir))
    report = validator.validate()

    assert report["valid"] is True
    assert report["stats"]["num_classes"] == 6
    assert report["stats"]["total_images"] == 4
