from ultralytics import YOLO
import cv2

# Load YOLO model
model = YOLO("yolo11n.pt")

# Open webcam
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Could not open webcam.")
    exit()

print("EdgeVision AI - Webcam Detection Started")
print("Press Q to exit.")

while True:
    ret, frame = cap.read()

    if not ret:
        print("ERROR: Could not read webcam frame.")
        break

    # Run YOLO detection
    results = model(frame, verbose=False)

    # Draw detection results
    annotated_frame = results[0].plot()

    # Display the video
    cv2.imshow("EdgeVision AI - Live Detection", annotated_frame)

    # Press Q to exit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

# Release resources
cap.release()
cv2.destroyAllWindows()

print("EdgeVision AI - Webcam Detection Stopped")