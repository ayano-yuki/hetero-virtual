# Virtualizer Library Comparison Evidence

Status: comparison matrix prepared, real comparison evidence pending.

## Targets

| Category | Library | Evidence status |
| --- | --- | --- |
| React chat / complex feeds | React Virtuoso | Pending |
| React fixed / simple lists | react-window | Document comparison only |
| Vue 2/3 | vue-virtual-scroller | Document comparison only |
| Framework-agnostic / custom layouts | TanStack Virtual | Pending or document comparison |
| Heterogeneous heavy feeds | hetero-virtual | Captured under `evidence/2026-06-21/` |

## Recommended First Real Comparison

Use React Virtuoso first. It is the closest product-level comparison for chat
and complex feed surfaces.

Recommended scenario:

```txt
dataset: plain-text-100k
scenario: fast scroll
cpuThrottle: 4x external / 4ms budget
required sampleCount: > 0
required p95JsFrameTime: <= 6ms
```

Record the copied evidence JSON next to the hetero-virtual evidence and note
any feature gaps separately. Do not mark `PPG-01` complete until at least one
comparison library has real browser evidence under matching conditions.

## Documentation Sources

* React Virtuoso: https://virtuoso.dev/
* react-window: https://github.com/bvaughn/react-window
* vue-virtual-scroller: https://github.com/Akryum/vue-virtual-scroller
* TanStack Virtual: https://tanstack.com/virtual/latest
