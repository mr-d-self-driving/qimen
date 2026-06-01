# Bazi Image Reviewed Cases

Reviewed case fixtures use JSON objects with the following contract:

```json
{
  "pillars": ["甲子", "乙丑", "丙寅", "丁卯"],
  "expected_category": "FOLLOW_IMAGE",
  "expected_subtype": "从财格",
  "expected_score_band": "FORMED",
  "expected_override": true,
  "notes": "Brief review notes and evidence."
}
```

## Fields

- `pillars`: Four pillars in year, month, day, and hour order.
- `expected_category`: Expected image category.
- `expected_subtype`: Expected image subtype.
- `expected_score_band`: Expected score band rather than an exact score.
- `expected_override`: Whether the reviewed image should override the normal pattern.
- `notes`: Human review notes, including relevant false-positive or false-negative context.

## Calibration Rules

1. Validate classification before tuning score weights.
2. Keep `image-score-v1` weights explicit and explainable.
3. Do not add black-box exceptions for individual cases.
4. Review false positives and false negatives separately.
