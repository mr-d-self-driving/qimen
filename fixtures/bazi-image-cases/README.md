# Bazi Image Reviewed Cases

Reviewed case fixtures use JSON objects with the following contract:

```json
{
  "pillars": ["甲子", "乙丑", "丙寅", "丁卯"],
  "expected_category": "FOLLOW_IMAGE",
  "expected_subtype": "从财格",
  "expected_score_band": "80-94",
  "expected_override": true,
  "notes": "Brief review notes and evidence."
}
```

## Fields

- `pillars`: Four pillars in year, month, day, and hour order.
- `expected_category`: Expected image category.
- `expected_subtype`: Expected image subtype.
- `expected_score_band`: Inclusive numeric score range in `minimum-maximum` form.
- `expected_override`: Whether the reviewed image should override the normal pattern.
- `notes`: Human review notes, including relevant false-positive or false-negative context.

## Scorer Wire Schema

`assessBaziImage` returns serialized candidates in `primary_candidate`,
`override_candidate`, and `alternatives`. The top-level `status`, `dimensions`,
and `penalties` mirror the primary candidate.

```json
{
  "status": "FORMED",
  "dimensions": [
    { "key": "target_qi_ratio", "score": 0.52, "max": 1, "text": "目标占比" }
  ],
  "penalties": [
    { "key": "POWERFUL_COUNTER_QI", "score": -30, "text": "制衡气势偏强" }
  ]
}
```

- `status`: One of `PURE`, `FORMED`, `SUSPECTED`, or `NOT_FORMED`.
- `dimensions`: Explainable metrics with stable `key`, `score`, `max`, and
  `text` fields. Metrics without a meaningful maximum use `null`.
- `penalties`: Explainable deductions with stable `key`, `score`, and `text`
  fields. Cap-only or explanatory penalties use `score: 0` and describe the
  effect in `text`.
- Unknown dimension and penalty keys remain visible with a stable explanatory
  fallback text so fixture replay never silently drops evidence.

## Calibration Rules

1. Validate classification before tuning score weights.
2. Keep `image-score-v1` weights explicit and explainable.
3. Do not add black-box exceptions for individual cases.
4. Review false positives and false negatives separately.
