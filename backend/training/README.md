# PPE Model Training

Turns the stock person-only detector into a real PPE detector (hardhat / no-hardhat /
vest / no-vest) by fine-tuning YOLOv8n on a labeled PPE dataset.

This can't run inside the chat sandbox (no access to roboflow.com or a GPU) —
run it locally or, easiest, on a free Colab GPU.

## Fastest path: Google Colab (free GPU, ~30-45 min)

1. New Colab notebook → Runtime → Change runtime type → GPU (T4)
2. Upload `download_dataset.py` and `train.py` from this folder, or just paste
   their contents into cells
3. Run:
   ```
   !pip install -q roboflow ultralytics
   !python download_dataset.py --api-key YOUR_KEY --workspace roboflow-universe-projects --project construction-site-safety --version 1
   !python train.py --data dataset/data.yaml --epochs 60
   ```
4. Download the resulting `best.pt` from the Colab file browser

## Local path

```bash
cd backend/training
python3 -m venv venv && source venv/bin/activate
pip install -r requirements-train.txt
cp .env.example .env   # fill in your Roboflow API key

python download_dataset.py
python train.py --data dataset/data.yaml --epochs 60
```

## Picking a dataset
Search "PPE" or "hard hat" on https://universe.roboflow.com/search. Two solid
public options as starting points (edit `--workspace`/`--project` accordingly):

| Dataset | Classes | Notes |
|---|---|---|
| Construction Site Safety (roboflow-universe-projects) | Hardhat, Mask, NO-Hardhat, NO-Mask, NO-Safety Vest, Person, Safety Cone, Safety Vest, machinery, vehicle | Broadest class set, good default |
| Hard Hat Workers (joseph-nelson) | head, helmet, person | Simpler, hardhat-only, smaller |

Whichever you pick, open its `data.yaml` after downloading and check the exact
`names:` list — Roboflow project class names vary. You'll match them in the
next step.

## After training: wire it into the app

1. Copy `best.pt` into `backend/` (or anywhere you like)
2. In `backend/.env`, set `MODEL_PATH=best.pt` (or the full path)
3. Open `backend/app/detection/detector.py` and check `PPE_CLASS_MAP` — it
   needs one entry per class your dataset actually outputs, mapped to the
   internal names the app expects:
   ```python
   PPE_CLASS_MAP = {
       "Hardhat": "hardhat",
       "NO-Hardhat": "no_hardhat",
       "Safety Vest": "vest",
       "NO-Safety Vest": "no_vest",
       "Person": "person",
       # drop or ignore any classes you don't care about (Mask, Safety Cone, etc.)
   }
   ```
   Class names are case-sensitive and must match your dataset's `data.yaml`
   exactly — print `model.names` after loading to double check.
4. Restart the backend. `detector.ppe_capable` will now be `True`, and the
   dashboard will start showing real hardhat/vest violations instead of only
   zone intrusions.

## Sanity-checking the trained model before deploying
```bash
yolo val model=best.pt data=dataset/data.yaml
yolo predict model=best.pt source=some_test_image.jpg
```
Look at mAP50 in the val output — anything above ~0.7 is a reasonable starting
point for a demo; below that, more epochs or a larger base model (`yolov8s.pt`)
usually helps.
# PPE Model Training

Turns the stock person-only detector into a real PPE detector (hardhat / no-hardhat /
vest / no-vest) by fine-tuning YOLOv8n on a labeled PPE dataset.

This can't run inside the chat sandbox (no access to roboflow.com or a GPU) —
run it locally or, easiest, on a free Colab GPU.

## Fastest path: Google Colab (free GPU, ~30-45 min)

1. New Colab notebook → Runtime → Change runtime type → GPU (T4)
2. Upload `download_dataset.py` and `train.py` from this folder, or just paste
   their contents into cells
3. Run:
   ```
   !pip install -q roboflow ultralytics
   !python download_dataset.py --api-key YOUR_KEY --workspace roboflow-universe-projects --project construction-site-safety --version 1
   !python train.py --data dataset/data.yaml --epochs 60
   ```
4. Download the resulting `best.pt` from the Colab file browser

## Local path

```bash
cd backend/training
python3 -m venv venv && source venv/bin/activate
pip install -r requirements-train.txt
cp .env.example .env   # fill in your Roboflow API key

python download_dataset.py
python train.py --data dataset/data.yaml --epochs 60
```

## Picking a dataset
Search "PPE" or "hard hat" on https://universe.roboflow.com/search. Two solid
public options as starting points (edit `--workspace`/`--project` accordingly):

| Dataset | Classes | Notes |
|---|---|---|
| Construction Site Safety (roboflow-universe-projects) | Hardhat, Mask, NO-Hardhat, NO-Mask, NO-Safety Vest, Person, Safety Cone, Safety Vest, machinery, vehicle | Broadest class set, good default |
| Hard Hat Workers (joseph-nelson) | head, helmet, person | Simpler, hardhat-only, smaller |

Whichever you pick, open its `data.yaml` after downloading and check the exact
`names:` list — Roboflow project class names vary. You'll match them in the
next step.

**Gloves, goggles, and smoke:** the Construction Site Safety dataset above
already includes Mask/NO-Mask, so mask detection needs no extra work. Gloves
and goggles are less commonly bundled into the same public datasets — search
Roboflow Universe for "PPE gloves goggles" or similar and expect to combine
multiple smaller datasets, or accept lower accuracy on those two classes.
Smoke/fire is a different visual domain from PPE entirely — search "fire
smoke detection" on Roboflow Universe instead; that model would need to run
as a second `detector.infer()`-style pass, which isn't wired into
`app/routers/stream.py` yet (currently one model per frame).

## After training: wire it into the app

1. Copy `best.pt` into `backend/` (or anywhere you like)
2. In `backend/.env`, set `MODEL_PATH=best.pt` (or the full path)
3. Open `backend/app/detection/detector.py` and check `PPE_CLASS_MAP` — it
   needs one entry per class your dataset actually outputs, mapped to the
   internal names the app expects:
   ```python
   PPE_CLASS_MAP = {
       "Hardhat": "hardhat",
       "NO-Hardhat": "no_hardhat",
       "Safety Vest": "vest",
       "NO-Safety Vest": "no_vest",
       "Person": "person",
       # drop or ignore any classes you don't care about (Mask, Safety Cone, etc.)
   }
   ```
   Class names are case-sensitive and must match your dataset's `data.yaml`
   exactly — print `model.names` after loading to double check.
4. Restart the backend. `detector.ppe_capable` will now be `True`, and the
   dashboard will start showing real hardhat/vest violations instead of only
   zone intrusions.

## Sanity-checking the trained model before deploying
```bash
yolo val model=best.pt data=dataset/data.yaml
yolo predict model=best.pt source=some_test_image.jpg
```
Look at mAP50 in the val output — anything above ~0.7 is a reasonable starting
point for a demo; below that, more epochs or a larger base model (`yolov8s.pt`)
usually helps.

## Dataset Validation Tool
Validate any custom YOLO dataset before training to avoid bad labels or corrupted images:
```bash
# Validate your dataset
python backend/app/detection/dataset_validator.py --path path/to/dataset

# Or generate and validate a sample benchmark dataset structure
python backend/app/detection/dataset_validator.py --create-sample
```

## Model Evaluation Suite
Run industrial safety evaluation metrics (precision, recall, mAP@50, mAP@50-95, confusion matrix, inference latency, FPS):
```bash
# Run synthetic industrial evaluation report
python backend/app/detection/evaluator.py --synthetic

# Run pure inference latency & FPS throughput benchmark
python backend/app/detection/evaluator.py --benchmark
```