# EdgeVision AI — AI Specification

## 1. Project Objective

EdgeVision AI is a real-time industrial worker safety monitoring system using Computer Vision, AI, object detection, object tracking, and rule-based safety analysis.

The system processes CCTV/webcam/RTSP video and detects safety-related objects and violations in real time.

## 2. Master Detection Classes

### P0 — Core Safety
- person
- helmet
- no_helmet
- vest
- no_vest

### P1 — Extended Safety
- gloves
- no_gloves
- boots
- no_boots
- goggles
- no_goggles
- vehicle
- forklift

### P2 — Emergency Detection
- fire
- smoke

## 3. Events Not Directly Treated as YOLO Classes

The following events will be implemented using tracking, temporal analysis, geometry, and safety rules:

- Fall detection
- Restricted-zone entry
- Worker–vehicle proximity
- Worker tracking
- Risk assessment

## 4. AI Pipeline

Video Input
    ↓
OpenCV
    ↓
YOLO Detection
    ↓
ByteTrack Tracking
    ↓
Safety Rule Engine
    ↓
Risk Assessment
    ↓
Alert/Event Generation
    ↓
FastAPI Backend
    ↓
Database + Dashboard

## 5. Planned AI Components

- YOLO-based object detection
- ByteTrack object tracking
- Rule-based safety event detection
- Risk scoring
- Real-time alert generation

## 6. Training Strategy

Before training, candidate datasets will be inspected for:

- Class availability
- Annotation quality
- Image quality
- Dataset size
- Label format
- License
- Class imbalance

Datasets will only be merged after their classes and annotations are normalized and verified.

## 7. Training Priority

P0 classes will be developed first.

P1 classes will be added after the core detection pipeline is stable.

P2 emergency classes will be developed after the main safety pipeline is functional.

## 8. Model Evaluation

The trained model will be evaluated using:

- Precision
- Recall
- mAP50
- mAP50-95
- Confusion Matrix
- Validation loss
- Inference speed / FPS

## 9. Deployment Goal

The final AI pipeline should support:

- Webcam input
- CCTV video
- RTSP streams
- Real-time detection
- Tracking
- Safety events
- Alerts
- Backend integration

## 10. Important Scope Restriction

Injury or blood detection is NOT part of the EdgeVision AI system scope.