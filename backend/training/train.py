"""
Fine-tunes YOLOv8n on a PPE dataset (downloaded via download_dataset.py) and
exports the trained weights ready to drop into the backend.

Usage:
  pip install ultralytics
  python train.py --data dataset/data.yaml --epochs 60

GPU strongly recommended (free Colab T4 is fine — this repo's dataset download
+ train scripts work unmodified there, just `!pip install roboflow ultralytics`
first). On CPU-only, expect this to be very slow for anything beyond a quick
sanity-check run.
"""
import argparse
import shutil
from pathlib import Path

from ultralytics import YOLO


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="dataset/data.yaml", help="path to data.yaml from the downloaded dataset")
    parser.add_argument("--base-model", default="yolov8n.pt", help="starting weights (n=fastest, s/m=more accurate)")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--out", default="../best.pt", help="where to copy the final trained weights")
    args = parser.parse_args()

    if not Path(args.data).exists():
        raise SystemExit(f"Can't find {args.data} — run download_dataset.py first, or point --data at your data.yaml")

    model = YOLO(args.base_model)
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=15,
        project="runs",
        name="ppe_train",
    )

    best_weights = Path("runs/ppe_train/weights/best.pt")
    if best_weights.exists():
        shutil.copy(best_weights, args.out)
        print(f"\nTraining complete. Best weights copied to: {args.out}")
        print("Set MODEL_PATH to that file in backend/.env and restart the backend.")
        print("\nRun a quick validation check:")
        print(f"  yolo val model={args.out} data={args.data}")
    else:
        print("Training finished but best.pt wasn't found — check runs/ppe_train/weights/ manually.")


if __name__ == "__main__":
    main()
