from ultralytics import YOLO

print("Loading YOLO model...")

model = YOLO("yolo11n.pt")

print("YOLO model loaded successfully!")

print("\nAvailable classes:")
for class_id, class_name in model.names.items():
    print(f"{class_id}: {class_name}")