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

* measured library name
* dataset and scenario identity
* CPU throttle label
* p95 scheduler JS time
* maximum prepend or resize viewport shift
* rendered item count
* measurement queue length
* blank frame count
* heavy placeholder-only frame count
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
| blank frames | 0 |

## Similar Library Comparison

The publish gate compares `hetero-virtual` against existing virtual scrolling
libraries by capability and evidence, not by a single headline number.

Comparison targets:

* TanStack Virtual
* react-window
* vue-virtual-scroller

Comparison axes:

* heterogeneous DOM and per-type adapter metadata
* dynamic height correction
* prepend anchor preservation
* heavy item hydration while scrolling
* reproducible evidence under the same browser and CPU throttle conditions

React libraries should be measured under the same `/benchmark` browser
conditions whenever possible. Vue libraries are tracked as feature and
reproduction comparisons in this React/Next workspace until a Vue example is
explicitly added.

## Manual Gate Capture

1. Run `pnpm dev`.
2. Open `http://localhost:3000/benchmark`.
3. In Chrome DevTools, set CPU throttling to 4x.
4. Select the low-end 4ms budget.
5. Run fast scroll, continuous prepend, delayed image loading, high-variance
   correction, and the heavy dataset.
6. Wait for the queue to settle, then copy the evidence JSON.
7. Record the copied JSON with the scenario name and browser details before
   marking a gate task complete.
