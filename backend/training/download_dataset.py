"""
Downloads a PPE detection dataset from Roboflow Universe in YOLOv8 format.

Roboflow isn't reachable from this sandbox, so this script is meant to be run
on YOUR machine (or a Colab notebook) — it needs your own free Roboflow API key.

SETUP:
  1. Create a free account at https://roboflow.com
  2. Go to a public PPE dataset on Roboflow Universe. Two well-known ones:
       - "Construction Site Safety Image Dataset" (workspace: roboflow-universe-projects,
         project: construction-site-safety, classes: Hardhat, Mask, NO-Hardhat, NO-Mask,
         NO-Safety Vest, Person, Safety Cone, Safety Vest, machinery, vehicle)
       - "Hard Hat Workers" (workspace: joseph-nelson, project: hard-hat-workers,
         classes: head, helmet, person)
     Search "PPE detection" or "hard hat" on https://universe.roboflow.com to browse
     alternatives and pick whichever has the best image count/quality for your needs.
  3. On the dataset page, click "Download Dataset" -> format "YOLOv8" -> it'll show
     you a code snippet with your API key, workspace, project slug, and version number.
  4. Fill those into the .env below (or pass as CLI args) and run this script.

  pip install roboflow
  python download_dataset.py --api-key YOUR_KEY --workspace WORKSPACE --project PROJECT --version 1
"""
import argparse
import os


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-key", default=os.getenv("ROBOFLOW_API_KEY"))
    parser.add_argument("--workspace", default=os.getenv("ROBOFLOW_WORKSPACE", "roboflow-universe-projects"))
    parser.add_argument("--project", default=os.getenv("ROBOFLOW_PROJECT", "construction-site-safety"))
    parser.add_argument("--version", type=int, default=int(os.getenv("ROBOFLOW_VERSION", "1")))
    parser.add_argument("--out-dir", default="dataset")
    args = parser.parse_args()

    if not args.api_key:
        raise SystemExit(
            "Missing API key. Pass --api-key or set ROBOFLOW_API_KEY in training/.env\n"
            "Get a free key at https://app.roboflow.com -> Settings -> API Keys"
        )

    from roboflow import Roboflow

    rf = Roboflow(api_key=args.api_key)
    project = rf.workspace(args.workspace).project(args.project)
    version = project.version(args.version)
    dataset = version.download("yolov8", location=args.out_dir)

    print(f"\nDataset downloaded to: {dataset.location}")
    print("data.yaml is inside that folder — point train.py at it with --data")
    print("Open data.yaml and check the `names:` list — you'll need to match")
    print("PPE_CLASS_MAP in app/detection/detector.py to whatever classes it lists.")


if __name__ == "__main__":
    main()
