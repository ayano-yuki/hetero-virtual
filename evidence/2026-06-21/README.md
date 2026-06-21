# Evidence: 2026-06-21

Captured from `http://localhost:3000/benchmark` in Chrome.

## Summary

Valid evidence:

* `plain-text-fast-scroll.json` confirms plain text fast scroll p95 at
  `1.10ms`, queue `0`, and blank frames `0`.
* `plain-text-fast-scroll-4x.json` confirms CPU throttle 4x / low-end 4ms
  fast scroll p95 at `0.60ms`, queue `0`, and blank frames `0`.
* `image-resize-high-variance.json` confirms resize/high-variance stability
  with queue `0`, viewport shift `0`, and blank frames `0`.
* `markdown-prepend-stability.json` confirms prepend viewport shift
  `0.40px`, below the `< 1px` gate.
* `markdown-continuous-prepend.json` confirms continuous prepend stability at
  `0.40px`, queue `0`, and blank frames `0` under the low-end 4ms budget.

Incomplete p95 evidence:

* `markdown-fast-scroll-incomplete.json`
* `heavy-fast-scroll-incomplete.json`

These files have useful stability data, but `sampleCount` is `0`, so they do
not satisfy the p95 frame-time gate.

## Remaining Browser Work

* Capture at least one React library comparison under the same browser and CPU
  throttle conditions.
