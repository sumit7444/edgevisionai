from ultralytics import YOLO

model = YOLO("yolo11n.pt")

model.train(
    data="data/datasets/edgevision.yaml",
    epochs=30,
    imgsz=512,
    batch=4,
    workers=2,
    device="cpu",
    project="runs/edgevision",
    name="baseline",
    exist_ok=True,
    patience=10,
    pretrained=True,
)
