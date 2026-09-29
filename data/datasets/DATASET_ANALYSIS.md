# EdgeVision AI - Dataset Analysis

## Dataset Construction

The EdgeVision AI dataset was created by processing and merging two source datasets into a unified 12-class YOLO detection dataset.

The processing pipeline included dataset inspection, class mapping, filtering, merging, final class-ID correction, annotation validation, and dataset YAML validation.

## Final Classes

| ID | Class |
|---:|---|
| 0 | person |
| 1 | helmet |
| 2 | no_helmet |
| 3 | vest |
| 4 | no_vest |
| 5 | gloves |
| 6 | boots |
| 7 | no_boots |
| 8 | goggles |
| 9 | no_goggle |
| 10 | no_gloves |
| 11 | vehicle |

## Dataset Size

| Split | Images |
|---|---:|
| Train | 3,680 |
| Validation | 233 |

The final dataset contains 29,517 annotations.

All checked annotations passed YOLO label format and normalized-coordinate validation.

## Source Dataset Contribution

### Dataset 1

Dataset 1 contributes:

- person
- helmet
- no_helmet
- vest
- gloves
- boots
- no_boots
- goggles
- no_goggle
- no_gloves

### Dataset 2

Dataset 2 contributes:

- person
- vest
- no_vest
- vehicle

The two datasets therefore provide complementary safety-related classes.

## Training Image Distribution

| Class | Training Images |
|---|---:|
| person | 3,593 |
| helmet | 830 |
| no_helmet | 232 |
| vest | 2,147 |
| no_vest | 1,864 |
| gloves | 562 |
| boots | 530 |
| no_boots | 28 |
| goggles | 385 |
| no_goggle | 216 |
| no_gloves | 190 |
| vehicle | 744 |

## Class Imbalance

The dataset has significant class imbalance.

The rarest class is `no_boots`, with only 28 training images.

Other low-frequency violation classes include:

- no_gloves: 190 images
- no_goggle: 216 images
- no_helmet: 232 images

This imbalance is reflected in the baseline evaluation, where rare safety-violation classes generally have weaker recall.

## Baseline Training

Model: YOLO11n

Configuration:

- Classes: 12
- Image size: 512
- Batch size: 4
- Device: CPU
- Planned epochs: 30
- Recorded epochs: 20

The training run produced `best.pt` and `last.pt`.

The best recorded validation performance occurred at epoch 19.

## Baseline Results

| Metric | Result |
|---|---:|
| Precision | 0.620 |
| Recall | 0.428 |
| mAP50 | 0.46875 |
| mAP50-95 | 0.22981 |

Best epoch: **19**

## Class-Level Observation

The baseline performs better on common classes such as person, helmet, vest, gloves, and boots.

The weakest results are concentrated among rare safety-violation classes, particularly:

- no_boots
- no_goggle
- no_gloves
- no_helmet
- no_vest

The results indicate that class representation is an important area for future experimentation.

## Dataset Processing Pipeline

1. Source dataset extraction
2. Dataset inspection
3. Class identification
4. Class-ID mapping
5. Dataset-specific filtering
6. Dataset merging
7. Final class-ID correction
8. Annotation validation
9. Dataset YAML validation
10. Baseline training
11. Baseline evaluation

Processing scripts are maintained under `data/processed/`.

## Current Status

The dataset construction, validation, baseline training, and baseline evaluation phases are complete.

The baseline is preserved as the reference experiment.

Future experiments can investigate methods for improving detection of rare safety-violation classes while keeping validation/test data unchanged for fair comparison.
