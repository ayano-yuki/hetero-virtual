# Evidence: 2026-06-23

Captured from `http://localhost:3000/benchmark` in Chrome with external CPU
throttling set to 4x and the benchmark low-end 4ms budget enabled.

## Similar Library Comparison

All comparison runs use the `plain-text-100k` dataset and Library comparison
fast-scroll runner.

| Library | Evidence | p95 JS | Samples | Queue | Blank frames | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| React Virtuoso | `react-virtuoso-fast-scroll-4x.json` | `2.30ms` | 90 | 0 | 0 | PASS |
| react-window | `react-window-fast-scroll-4x.json` | `0.50ms` | 90 | 0 | 0 | PASS |
| TanStack Virtual | `tanstack-virtual-fast-scroll-4x.json` | `4.50ms` | 90 | 0 | 0 | PASS |

## Gate Result

PPG-01 has matching real browser comparison evidence for at least one React
library. The extended comparison also covers React Virtuoso, react-window, and
TanStack Virtual, while vue-virtual-scroller remains a document-only framework
comparison in this React/Next workspace.
