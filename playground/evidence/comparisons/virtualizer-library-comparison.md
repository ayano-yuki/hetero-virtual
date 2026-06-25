# Virtualizer Library Comparison Evidence

Status: comparison matrix and React comparison evidence captured.

## Targets

| Category | Library | Evidence status |
| --- | --- | --- |
| React chat / complex feeds | React Virtuoso | Captured: `playground/evidence/2026-06-23/react-virtuoso-fast-scroll-4x.json` |
| React fixed / simple lists | react-window | Captured: `playground/evidence/2026-06-23/react-window-fast-scroll-4x.json` |
| Vue 2/3 | vue-virtual-scroller | Document comparison only |
| Framework-agnostic / custom layouts | TanStack Virtual | Captured: `playground/evidence/2026-06-23/tanstack-virtual-fast-scroll-4x.json` |
| Heterogeneous heavy feeds | hetero-virtual | Captured under `playground/evidence/2026-06-21/` |

## Real Browser Comparison

The first real comparison set was captured on 2026-06-23. All runs use
Chrome CPU throttle 4x, the benchmark low-end 4ms budget, and the
`plain-text-100k` fast-scroll scenario.

| Library | p95 JS | sampleCount | Queue | Blank frames | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| hetero-virtual | `0.60ms` | 96 | 0 | 0 | PASS |
| React Virtuoso | `2.30ms` | 90 | 0 | 0 | PASS |
| react-window | `0.50ms` | 90 | 0 | 0 | PASS |
| TanStack Virtual | `4.50ms` | 90 | 0 | 0 | PASS |

This satisfies `PPG-01` because at least one React comparison library has real
browser evidence under matching conditions. The broader comparison now covers
four measured libraries plus the document-only Vue framework comparison.

## Documentation Sources

* React Virtuoso: https://virtuoso.dev/
* react-window: https://github.com/bvaughn/react-window
* vue-virtual-scroller: https://github.com/Akryum/vue-virtual-scroller
* TanStack Virtual: https://tanstack.com/virtual/latest
