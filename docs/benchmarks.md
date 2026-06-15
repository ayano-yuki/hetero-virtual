# Benchmarks And Evidence

Open the benchmark suite at:

```txt
http://localhost:3000/benchmark
```

## Dataset Presets

The dataset selector rebuilds the virtualizer with one of four presets:

* 100,000 plain text items
* 50,000 markdown and code items
* 20,000 delayed image cards
* 10,000 chart and tool-result items

Each preset has a deterministic item distribution and height variance so
results can be repeated after a reload.

## Scenarios

The toolbar provides:

* append and prepend batches
* continuous append and continuous prepend
* fast scrolling
* delayed image loading
* high-variance height correction
* normal 8ms and low-end 4ms scheduler budgets

For mobile-like validation, set Chrome DevTools CPU throttling to 4x and select
the low-end 4ms budget before running fast scroll.

## Evidence

The evidence panel reports:

* p95 scheduler JS time
* maximum prepend or resize viewport shift
* rendered item count
* measurement queue length
* pass or check status for the documented thresholds

Use **Copy evidence JSON** after the scenario settles. The copied record
includes the dataset ID, item count, timestamp, throttle label, live metrics,
and pass/fail results.

Target thresholds:

| Metric | Target |
| --- | ---: |
| p95 scheduler JS | <= 6ms |
| viewport shift | < 1px |
| measurement queue after settling | 0 |
