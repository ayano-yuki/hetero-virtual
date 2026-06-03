# Strategy

## Benchmark Scenarios

The demo should include these cases:

1. 100,000 plain text items
2. 50,000 markdown/code mixed items
3. 20,000 image card mixed items
4. 10,000 chart/tool-result heavy items
5. continuous append
6. continuous prepend
7. fast wheel scrolling
8. mobile-like CPU throttling
9. delayed image height changes
10. high-variance item heights

## Implementation Plan

### Phase 1: Height Tree

Implement without React first.

Required methods:

```ts
append(items)
prepend(items)
updateHeight(id, height)
offsetOf(id)
findItemAtOffset(offset)
totalHeight()
```

### Phase 2: Anchor Manager

Implement:

```ts
captureAnchor()
restoreAnchor()
isBeforeAnchor()
```

Validate with prepend before building full rendering.

### Phase 3: Range Calculator

Implement:

```ts
computeVisibleRange(scrollTop, viewportHeight, velocity, direction)
```

Use pixel-based adaptive overscan.

### Phase 4: Placeholder Virtualizer

Render only placeholders.

The goal is to prove that dynamic height, bidirectional scrolling, and anchor preservation work before introducing heavy components.

### Phase 5: Measurement Pipeline

Add:

* `ResizeObserver`
* measurement queue
* height correction
* anchor restoration
* estimator update

### Phase 6: Render Scheduler

Add:

* render task queue
* priority scoring
* frame budget
* scroll modes
* progressive hydration

### Phase 7: Adapters

Add real adapters:

* text
* markdown
* image
* chart
* tool result

## Design Tradeoffs

`hetero-virtual` chooses control over convenience.

It is less magical than a simple `<VirtualList>{children}</VirtualList>` API.

That is intentional.

A fully generic virtualizer cannot reliably optimize unknown heterogeneous components without knowing:

* expected height
* render cost
* measurement behavior
* whether it can hydrate during scroll
* whether it has delayed layout shifts
* whether it can render a cheap shell

The adapter model exists because low-jank heterogeneous scrolling requires explicit contracts.

## Current Status

Experimental design stage.

The immediate goal is not to publish a polished library.

The immediate goal is to build a measurable Next.js prototype that proves:

* bidirectional infinite scroll works
* heterogeneous item types work
* prepend does not jump
* dynamic height correction does not jump
* low-end scroll remains stable
* heavy items can be delayed without blanking the viewport
