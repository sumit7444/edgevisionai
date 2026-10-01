# Construction-PPE Dataset Analysis

## Dataset Size

- Train: 1,132 images
- Validation: 143 images
- Test: 141 images
- Total: 1,416 images

## Training Class Distribution

| ID | Class | Instances |
|---:|---|---:|
| 0 | helmet | 1,341 |
| 1 | gloves | 1,146 |
| 2 | vest | 1,269 |
| 3 | boots | 1,235 |
| 4 | goggles | 419 |
| 5 | none | 651 |
| 6 | Person | 1,770 |
| 7 | no_helmet | 400 |
| 8 | no_goggle | 337 |
| 9 | no_gloves | 442 |
| 10 | no_boots | 88 |

## Findings

- The dataset has valid train, validation, and test splits.
- Image/label filenames are matched in all three splits.
- no_boots is significantly underrepresented.
- no_vest is not present.
- vehicle, forklift, fire, and smoke are not present.
- Person and none require consideration during final class normalization.

## Decision

This dataset will be used as the PPE baseline. It will not yet be used for final training.

Additional datasets will be evaluated before creating the final unified training dataset.
