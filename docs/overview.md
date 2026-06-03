# Overview

`hetero-virtual` is a jank-resistant virtualizer for heterogeneous, bidirectional, dynamic-height lists.

It is designed for hard scroll surfaces where each item may have a different DOM structure, rendering cost, and height behavior.

## Why hetero-virtual?

Most virtual scroll implementations work well when items are simple, uniform, or at least predictable.
They become harder to stabilize when:

* item heights are unknown before render
* item heights change after images/code blocks/embeds load
* items are prepended above the viewport
* the user scrolls quickly in both directions
* each item has a different rendering cost
* low-end browsers cannot hydrate heavy components during scroll
* markdown, code blocks, charts, images, tables, and tool outputs are mixed together

`hetero-virtual` is designed around those cases.

It is not just a virtual list.
It is a layout and render scheduler for heterogeneous scroll surfaces.

## Goals

* Support heterogeneous item types
* Support dynamic item heights
* Support bidirectional infinite scroll
* Preserve scroll position during prepend
* Preserve scroll position when measured heights change
* Reduce scroll jank on low-end devices
* Avoid heavy rendering work during active scrolling
* Use adaptive overscan based on scroll velocity
* Defer expensive hydration until the browser has budget
* Provide a component adapter model for item-specific behavior

## Non-goals

This project intentionally does **not** try to solve everything at once.

Initial non-goals:

* masonry layout
* grid virtualization
* horizontal virtualization
* nested virtualizers
* perfect SSR behavior
* perfect `scrollToIndex` accuracy for all dynamic items
* arbitrary React children with no adapter
* guaranteed full render during fast scrolling
* SEO-oriented rendering
* iframe-heavy virtualization without restrictions

If a component is expensive, unpredictable, or layout-sensitive, it must describe itself through an adapter.

## Performance Rules

The project follows these rules:

1. Scroll handlers must stay lightweight.
2. DOM measurement must be queued.
3. Heavy hydration must be scheduled.
4. Overscan must be pixel-based.
5. Overscan must react to velocity.
6. Prepend must preserve anchor.
7. Height corrections above the viewport must preserve anchor.
8. Component types must expose height and cost estimates.
9. Full render must be optional during fast scroll.
10. Low-end devices should receive lower per-frame work budgets.

## Metrics

Performance should be evaluated with real numbers, not visual impressions.

Recommended metrics:

```ts
type Metrics = {
  droppedFrames: number
  longTasks: number
  averageFrameJsTime: number
  p95FrameJsTime: number

  mountedNodeCount: number
  hydratedNodeCount: number

  blankAreaFrames: number
  anchorShiftPx: number
  scrollJumpCount: number

  heightPredictionMAE: number
}
```

Important targets:

| Metric                                  |                                  Target |
| --------------------------------------- | --------------------------------------: |
| p95 frame JS time on low-end simulation |                                  <= 6ms |
| Anchor shift after prepend              |                                   < 1px |
| Blank area frames                       |                                  Near 0 |
| Full hydrated items during fling        |                                 Minimal |
| Mounted DOM nodes                       | Bounded by viewport + adaptive overscan |
