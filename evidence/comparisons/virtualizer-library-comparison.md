# Virtualizer Library Comparison Evidence

Status: comparison matrix and React comparison runner prepared, real comparison
evidence pending.

## Targets

| Category | Library | Evidence status |
| --- | --- | --- |
| React chat / complex feeds | React Virtuoso | `/benchmark` runner ready, JSON pending |
| React fixed / simple lists | react-window | `/benchmark` runner ready, JSON pending |
| Vue 2/3 | vue-virtual-scroller | Document comparison only |
| Framework-agnostic / custom layouts | TanStack Virtual | `/benchmark` runner ready, JSON pending |
| Heterogeneous heavy feeds | hetero-virtual | Captured under `evidence/2026-06-21/` |

## Recommended First Real Comparison

Use React Virtuoso first. It is the closest product-level comparison for chat
and complex feed surfaces. Then repeat the same fast-scroll capture for
react-window and TanStack Virtual so the comparison covers at least four
libraries including hetero-virtual.

Recommended scenario:

```txt
dataset: plain-text-100k
scenario: fast scroll
cpuThrottle: 4x external / 4ms budget
required sampleCount: > 0
required p95JsFrameTime: <= 6ms
```

Steps:

1. Run `pnpm dev`.
2. Open `http://localhost:3000/benchmark`.
3. Set Chrome DevTools CPU throttling to 4x.
4. In the Library comparison panel, choose React Virtuoso.
5. Enable the low-end 4ms budget.
6. Click **Run fast scroll**.
7. Confirm `sampleCount > 0`, copy the comparison evidence JSON, and save it
   next to the hetero-virtual evidence.
8. Repeat for react-window and TanStack Virtual.

Record copied evidence JSON next to the hetero-virtual evidence and note any
feature gaps separately. Do not mark `PPG-01` complete until at least one
comparison library has real browser evidence under matching conditions.

## Documentation Sources

* React Virtuoso: https://virtuoso.dev/
* react-window: https://github.com/bvaughn/react-window
* vue-virtual-scroller: https://github.com/Akryum/vue-virtual-scroller
* TanStack Virtual: https://tanstack.com/virtual/latest
