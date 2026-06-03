# Architecture

`hetero-virtual` is built from five main systems.

## Algorithm Overview

1. Chunked height tree
2. Anchor manager
3. Adaptive range calculator
4. Measurement pipeline
5. Frame-budget render scheduler

## 1. Chunked Height Tree

Dynamic-height bidirectional lists should not rely on a single flat array forever.
Prepending items at the top makes flat index-based structures awkward.

`hetero-virtual` uses a chunked height structure.

```ts
type HeightChunk = {
  items: VirtualItemMeta[]
  localTree: FenwickTree
  totalHeight: number
  measuredCount: number
}
```

Conceptually:

```txt
[chunk -3] [chunk -2] [chunk -1] [chunk 0] [chunk 1] [chunk 2]
```

Each chunk stores a local height tree.
The global structure stores chunk-level height sums.

Supported operations:

```ts
append(items)
prepend(items)
updateHeight(id, height)
offsetOf(id)
findItemAtOffset(scrollTop)
totalHeight()
```

Expected complexity:

| Operation              |                    Complexity |
| ---------------------- | ----------------------------: |
| Find item by offset    | O(log chunks + log chunkSize) |
| Find offset by item    | O(log chunks + log chunkSize) |
| Update measured height | O(log chunks + log chunkSize) |
| Append items           |                 O(new chunks) |
| Prepend items          |                 O(new chunks) |

## 2. Anchor Manager

Bidirectional infinite scroll requires anchor preservation.
When items are prepended above the viewport, the visible content must not jump.

An anchor represents the item currently holding the user’s visual position.

```ts
type Anchor = {
  itemId: string
  offsetWithinItem: number
}
```

Capture anchor:

```ts
function captureAnchor(): Anchor {
  const first = findFirstVisibleItem()

  return {
    itemId: first.id,
    offsetWithinItem: scrollTop - offsetOf(first.id),
  }
}
```

Restore anchor:

```ts
function restoreAnchor(anchor: Anchor) {
  const newOffset = offsetOf(anchor.itemId)
  scrollElement.scrollTop = newOffset + anchor.offsetWithinItem
}
```

Prepend flow and measurement correction flow both rely on anchor restoration.
If items above the viewport change height and the anchor is not restored, the viewport will jump.

## 3. Adaptive Range Calculator

Overscan should be based on pixels, not item count.
For heterogeneous lists, `overscan: 5` is meaningless.

Five items may be 200px.
Five items may also be 4000px.

`hetero-virtual` computes overscan in pixels and adapts it to scroll velocity.

```ts
function computeRange(scrollTop, viewportHeight, velocity, direction) {
  const overscan = computeOverscan(viewportHeight, velocity, direction)

  const startOffset = scrollTop - overscan.before
  const endOffset = scrollTop + viewportHeight + overscan.after

  const start = heightTree.findItemAtOffset(startOffset)
  const end = heightTree.findItemAtOffset(endOffset)

  return { start, end }
}
```

Direction-aware overscan:

```ts
function computeOverscan(viewportHeight, velocity, direction) {
  const base = viewportHeight * 0.5
  const dynamic = clamp(velocity * 120, 0, viewportHeight * 3)

  return {
    before: direction === "up" ? base + dynamic : base,
    after: direction === "down" ? base + dynamic : base,
  }
}
```

This helps reduce blank frames during fast scrolling without permanently mounting too many DOM nodes.

## 4. Measurement Pipeline

Measurements should not be performed directly inside scroll handlers.

Bad:

```ts
function onScroll() {
  measureDOM()
  updateReactState()
  renderHeavyComponents()
}
```

Good:

```ts
function onScroll() {
  latestScrollTop = scrollElement.scrollTop
  scheduleScrollFrame()
}
```

Measurements are collected through `ResizeObserver`, queued, and flushed within a frame budget.

```ts
const pendingMeasurements = new Map<string, HTMLElement>()

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    const el = entry.target as HTMLElement
    const id = el.dataset.virtualId

    if (id) {
      pendingMeasurements.set(id, el)
    }
  }

  scheduleMeasurementFlush()
})
```

Flush with budget:

```ts
function flushMeasurements(budgetMs: number) {
  const start = performance.now()

  for (const [id, el] of pendingMeasurements) {
    if (performance.now() - start > budgetMs) {
      break
    }

    pendingMeasurements.delete(id)

    const height = el.getBoundingClientRect().height
    onMeasured(id, height)
  }
}
```

Rules:

* never measure unlimited items in one frame
* prioritize viewport and near-viewport items
* do not run expensive measurement during fast fling
* preserve anchor after height corrections
* update height estimates after real measurements

## 5. Frame-Budget Render Scheduler

The scheduler decides when each item can move from placeholder to shell, light, or full render.

```ts
type RenderTask = {
  itemId: string
  targetLevel: 0 | 1 | 2 | 3
  priority: number
  estimatedCost: number
}
```

Priority model:

```ts
priority =
  visibilityScore
  + directionScore
  + anchorSafetyScore
  - distancePenalty
  - renderCostPenalty
```

Example:

```ts
function computePriority(item, viewport, direction) {
  const distance = distanceFromViewport(item, viewport)
  const visible = intersects(item, viewport) ? 1000 : 0
  const ahead = isAheadInScrollDirection(item, direction) ? 200 : 0
  const anchor = isNearAnchor(item) ? 300 : 0
  const costPenalty = item.renderCost * 20

  return visible + ahead + anchor - distance * 0.5 - costPenalty
}
```

Frame processing:

```ts
function processRenderQueue(budgetMs: number) {
  const start = performance.now()

  while (!queue.isEmpty()) {
    if (performance.now() - start > budgetMs) {
      break
    }

    const task = queue.popHighestPriority()

    if (task.estimatedCost > remainingBudget()) {
      downgradeTask(task)
      continue
    }

    applyRenderLevel(task.itemId, task.targetLevel)
  }

  if (!queue.isEmpty()) {
    requestAnimationFrame(() => processRenderQueue(getFrameBudget()))
  }
}
```

Low-end devices should use stricter budgets.

```ts
const frameBudgetMs = isLowEndDevice() ? 4 : 8
```
