# Virtualizer Library Comparison

`hetero-virtual` is not trying to replace every virtual scrolling library. The
publish gate compares it against libraries that are strong in different
product shapes.

## Positioning

| Need | Strong existing choice | Why it is strong | `hetero-virtual` position |
| --- | --- | --- | --- |
| React chat or complex feeds | React Virtuoso | Complete React component family with list, grid, table, masonry, and chat-oriented message list surfaces | Competes only when heterogeneous heavy rows need explicit cost, render-level, and measurement contracts |
| React fixed or simple lists | react-window | Lightweight React components for rendering large lists and grids quickly | Does not compete for simple fixed-size lists; simpler libraries should win there |
| Vue 2/3 virtual scrolling | vue-virtual-scroller | Vue-native virtual scroller for large lists | Not a Vue solution today; use this comparison to document framework gap |
| Framework-agnostic control, tables, custom layouts | TanStack Virtual | Headless virtualizer for multiple frameworks and layout control | Competes when adapter-driven heavy item scheduling and anchor evidence matter more than general headless primitives |

## Comparison Axes

| Axis | React Virtuoso | react-window | vue-virtual-scroller | TanStack Virtual | hetero-virtual |
| --- | --- | --- | --- | --- | --- |
| Primary audience | React apps with rich feeds, tables, chat | React apps needing small, fast list/grid primitives | Vue 2/3 apps | React, Vue, Solid, Svelte, Lit, Angular, and custom headless integrations | React demo today, framework-independent core internally |
| Complex chat/feed fit | Strong | Basic building block | Vue-oriented list/feed building block | Headless building block | Explicitly targeting heterogeneous chat/tool/feed rows |
| Fixed/simple list fit | Good, but broader than needed | Strong | Strong in Vue | Strong | Not the target |
| Dynamic height | Library-managed variable-sized items | Supports dynamic row height, but predetermined sizes are recommended for efficiency | Dynamic item sizing in Vue | Measurement and estimate primitives | Adapter estimates plus measurement queue and correction evidence |
| Prepend/anchor evidence | Product feature area | Consumer-managed | Consumer/library-managed depending setup | Consumer-managed primitives | First-class anchor tests and browser evidence |
| Heavy row scheduling | General virtualization | Consumer-managed | Consumer-managed | Consumer-managed | Explicit render cost, render levels, and scroll-mode scheduling |
| Table/custom layout control | Table surfaces exist in Virtuoso family | Grid support | Vue list/grid patterns | Strong headless control | Core primitives exist, public React surface is list-focused today |
| Evidence model | External benchmarking required | External benchmarking required | External benchmarking required | External benchmarking required | Built-in benchmark evidence JSON |

## Claims We Can Make

* `hetero-virtual` is for heterogeneous, dynamic-height, heavy-row feeds where
  the app can provide adapter metadata.
* `hetero-virtual` is not the best default for fixed-size or simple uniform
  lists.
* `hetero-virtual` does not cover Vue integration today.
* `hetero-virtual` has stronger built-in evidence capture than a normal demo,
  but still needs real comparison runs before public npm positioning is
  credible.

## Evidence Still Needed

The remaining publish-gate task is real browser evidence for at least one
React comparison library under the same CPU throttle and scenario conditions.
The recommended first comparison is React Virtuoso because it best matches the
chat and complex-feed use case.

The `/benchmark` page now includes a Library comparison panel for React
Virtuoso, react-window, and TanStack Virtual. Capture those under the same
plain-text fast-scroll scenario to complement the document-only
vue-virtual-scroller comparison.
