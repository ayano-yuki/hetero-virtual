# hetero-virtual

A jank-resistant virtualizer for heterogeneous, bidirectional, dynamic-height lists.

`hetero-virtual` is an experimental virtual scrolling engine designed for lists where each item may have a completely different DOM structure, rendering cost, and height behavior.

It targets difficult UI patterns such as:

* AI chat threads
* agent execution logs
* bidirectional timelines
* notification feeds
* markdown/code/image mixed streams
* infinite scroll with prepend and append
* low-end browser environments

The core idea is simple:

> Do not treat heterogeneous components as normal DOM children.
> Treat them as virtual items with height, cost, hydration level, and scheduling priority.

---

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

---

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

---

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

---

## Core Concept

Each item is represented as a virtual item, not just a React component.

```ts
type VirtualItemMeta = {
  id: string
  type: string

  estimatedHeight: number
  measuredHeight?: number
  confidence: number

  renderCost: number
  measureCost: number

  state: "unmounted" | "placeholder" | "shell" | "light" | "full"
}
```

The virtualizer uses this metadata to decide:

* where the item should be placed
* whether the item should be mounted
* whether it should render as placeholder, shell, light, or full
* when it should be measured
* whether hydration should be delayed
* how much overscan is needed
* how to preserve the viewport anchor

---

## Rendering Levels

`hetero-virtual` uses progressive rendering levels.

### Level 0: Placeholder

Only reserves height.

```tsx
<div style={{ height: estimatedHeight }} />
```

Used when:

* item is far from the viewport
* user is scrolling very fast
* render budget is exhausted
* item is expensive and not yet needed

---

### Level 1: Shell

Renders a cheap visual structure.

```tsx
<MessageShell />
<CardShell />
<ChartShell />
```

Used when:

* item is near the viewport
* item should look stable
* full rendering is too expensive during scroll

---

### Level 2: Light Render

Renders useful but simplified content.

Examples:

* markdown without syntax highlighting
* card without image decoding
* chart preview instead of interactive chart
* text-only message
* collapsed tool result

```tsx
<MarkdownLight content={item.content} />
```

---

### Level 3: Full Render

Renders the full component.

Examples:

* syntax highlighted markdown
* decoded images
* interactive charts
* expanded tables
* embedded rich content

```tsx
<MarkdownFull content={item.content} />
```

Full render should usually be avoided during high-velocity scrolling.

---

## Adapter Model

`hetero-virtual` does not accept arbitrary heavy components blindly.

Each item type should provide an adapter.

```ts
type VirtualComponentAdapter<T> = {
  type: string

  estimateHeight: (item: T, context: LayoutContext) => number
  estimateRenderCost: (item: T) => number
  estimateMeasureCost?: (item: T) => number

  renderPlaceholder: (item: T, context: RenderContext) => React.ReactNode
  renderShell: (item: T, context: RenderContext) => React.ReactNode
  renderLight: (item: T, context: RenderContext) => React.ReactNode
  renderFull: (item: T, context: RenderContext) => React.ReactNode

  canHydrateDuringScroll?: boolean
}
```

Example:

```tsx
const MarkdownAdapter = {
  type: "markdown",

  estimateHeight(item) {
    return (
      48 +
      item.text.length * 0.35 +
      item.codeBlockCount * 120 +
      item.imageCount * 180
    )
  },

  estimateRenderCost(item) {
    return 4 + item.codeBlockCount * 3 + item.imageCount * 4
  },

  renderPlaceholder(item) {
    return <div style={{ height: item.estimatedHeight }} />
  },

  renderShell() {
    return <div className="markdown-shell" />
  },

  renderLight(item) {
    return <PlainMarkdown text={item.text} />
  },

  renderFull(item) {
    return <HighlightedMarkdown text={item.text} />
  },

  canHydrateDuringScroll: false,
}
```

This constraint is intentional.

Without an adapter, the virtualizer cannot know whether a component is cheap, expensive, stable, unstable, measurable, or safe to hydrate during scroll.

---

## Algorithm Overview

`hetero-virtual` is built from five main systems.

1. Chunked height tree
2. Anchor manager
3. Adaptive range calculator
4. Measurement pipeline
5. Frame-budget render scheduler

---

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

---

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

Prepend flow:

```ts
async function loadPreviousPage() {
  const anchor = captureAnchor()

  const previousItems = await fetchPreviousPage()

  heightTree.prepend(
    previousItems.map(item => ({
      id: item.id,
      type: item.type,
      estimatedHeight: estimateHeight(item),
      confidence: 0.4,
      renderCost: estimateRenderCost(item),
      measureCost: 1,
      state: "placeholder",
    }))
  )

  restoreAnchor(anchor)
}
```

Measurement correction flow:

```ts
function onMeasured(itemId: string, measuredHeight: number) {
  const anchor = captureAnchor()

  const oldHeight = heightTree.getHeight(itemId)
  const delta = measuredHeight - oldHeight

  heightTree.updateHeight(itemId, measuredHeight)

  if (isBeforeAnchor(itemId, anchor.itemId)) {
    restoreAnchor(anchor)
  }
}
```

This is mandatory.

If items above the viewport change height and the anchor is not restored, the viewport will jump.

---

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

---

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

---

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

---

## Scroll Modes

The virtualizer changes behavior depending on scroll velocity.

```ts
type ScrollMode =
  | "idle"
  | "dragging"
  | "flinging"
  | "settling"
```

| Mode       | Behavior                                          |
| ---------- | ------------------------------------------------- |
| `idle`     | Full render is allowed                            |
| `dragging` | Shell/light render near viewport                  |
| `flinging` | Placeholder/shell only, heavy hydration forbidden |
| `settling` | Hydrate visible items first                       |

Example:

```ts
function getScrollMode(velocity, isScrolling) {
  if (!isScrolling) return "idle"
  if (velocity > HIGH_VELOCITY) return "flinging"
  return "dragging"
}
```

Heavy components such as charts, iframes, syntax highlighting, and image-heavy cards should not hydrate during `flinging`.

---

## Height Estimation

Each component type should estimate its own height.

Example:

```ts
function estimateHeight(item, viewportWidth) {
  switch (item.type) {
    case "text":
      return 32 + item.textLength * 0.45 + item.lineBreaks * 18

    case "image":
      return item.aspectRatio
        ? viewportWidth / item.aspectRatio
        : 240

    case "markdown":
      return (
        48 +
        item.textLength * 0.35 +
        item.codeBlockCount * 120 +
        item.imageCount * 180
      )

    case "chart":
      return item.declaredHeight ?? 320

    case "tool-result":
      return item.collapsed ? 96 : 360

    default:
      return 120
  }
}
```

After real measurements, the estimator should be updated online.

```ts
function updateEstimator(type, predicted, measured) {
  const error = measured - predicted

  estimator[type].bias += 0.05 * error
  estimator[type].variance =
    0.9 * estimator[type].variance + 0.1 * error * error
}
```

High-variance item types should receive more conservative overscan and earlier shell rendering.

---

## Main Scroll Loop

The scroll handler should do almost nothing.

```ts
function onScroll() {
  latestScrollTop = scrollElement.scrollTop
  latestTime = performance.now()

  if (!scheduled) {
    scheduled = true
    requestAnimationFrame(scrollFrame)
  }
}
```

Frame loop:

```ts
function scrollFrame() {
  scheduled = false

  const velocity = computeVelocity()
  const direction = computeDirection()
  const mode = computeScrollMode(velocity)

  const range = computeVisibleRange(
    latestScrollTop,
    viewportHeight,
    velocity,
    direction
  )

  mountPlaceholders(range)
  enqueueRenderTasks(range, mode)
  processRenderQueue(getFrameBudget(mode))
  flushMeasurements(getMeasurementBudget(mode))
}
```

The important rule:

> Scroll events collect input.
> Animation frames perform controlled work.
> No heavy component hydration happens directly inside the scroll event.

---

## React API Draft

```tsx
const virtualizer = useHeteroVirtualizer({
  items,

  getScrollElement: () => parentRef.current,

  getKey: item => item.id,
  getType: item => item.type,

  adapters: {
    text: TextAdapter,
    markdown: MarkdownAdapter,
    image: ImageAdapter,
    chart: ChartAdapter,
    toolResult: ToolResultAdapter,
  },

  bidirectional: true,

  overscan: {
    mode: "velocity",
    minPx: 600,
    maxPx: 3600,
    horizonMs: 120,
  },

  scheduler: {
    lowEndBudgetMs: 4,
    normalBudgetMs: 8,
    maxHydrationsPerFrame: 3,
    deferHeavyDuringScroll: true,
  },

  anchor: {
    preserveOnPrepend: true,
    preserveOnResize: true,
  },
})
```

Render:

```tsx
<div
  ref={parentRef}
  className="hetero-scroll"
>
  <div
    className="hetero-spacer"
    style={{
      height: virtualizer.totalSize,
      position: "relative",
    }}
  >
    {virtualizer.items.map(virtualItem => (
      <div
        key={virtualItem.key}
        data-virtual-id={virtualItem.id}
        ref={virtualizer.measureElement(virtualItem.id)}
        className="hetero-item"
        style={{
          position: "absolute",
          width: "100%",
          transform: `translateY(${virtualItem.start}px)`,
        }}
      >
        {virtualizer.renderItem(virtualItem)}
      </div>
    ))}
  </div>
</div>
```

---

## Next.js Demo

This repository uses Next.js for local verification.

Recommended structure:

```txt
hetero-virtual/
  app/
    page.tsx
    globals.css
  src/
    core/
      ChunkedHeightTree.ts
      FenwickTree.ts
      AnchorManager.ts
      RangeCalculator.ts
      ScrollState.ts
      RenderScheduler.ts
    react/
      useHeteroVirtualizer.ts
      HeteroVirtualItem.tsx
    adapters/
      TextAdapter.tsx
      MarkdownAdapter.tsx
      ImageAdapter.tsx
      ChartAdapter.tsx
      ToolResultAdapter.tsx
    demo/
      createDemoItems.ts
      DemoThread.tsx
  README.md
  package.json
```

Install:

```bash
pnpm install
```

Run:

```bash
pnpm dev
```

Open:

```txt
http://localhost:3000
```

---

## Minimal Next.js Demo Page

```tsx
"use client"

import { useMemo, useRef } from "react"
import { useHeteroVirtualizer } from "@/src/react/useHeteroVirtualizer"
import { createDemoItems } from "@/src/demo/createDemoItems"
import { TextAdapter } from "@/src/adapters/TextAdapter"
import { MarkdownAdapter } from "@/src/adapters/MarkdownAdapter"
import { ImageAdapter } from "@/src/adapters/ImageAdapter"
import { ChartAdapter } from "@/src/adapters/ChartAdapter"
import { ToolResultAdapter } from "@/src/adapters/ToolResultAdapter"

export default function Page() {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const items = useMemo(() => createDemoItems(50_000), [])

  const virtualizer = useHeteroVirtualizer({
    items,

    getScrollElement: () => parentRef.current,

    getKey: item => item.id,
    getType: item => item.type,

    adapters: {
      text: TextAdapter,
      markdown: MarkdownAdapter,
      image: ImageAdapter,
      chart: ChartAdapter,
      "tool-result": ToolResultAdapter,
    },

    bidirectional: true,

    overscan: {
      mode: "velocity",
      minPx: 600,
      maxPx: 3600,
      horizonMs: 120,
    },

    scheduler: {
      lowEndBudgetMs: 4,
      normalBudgetMs: 8,
      maxHydrationsPerFrame: 3,
      deferHeavyDuringScroll: true,
    },

    anchor: {
      preserveOnPrepend: true,
      preserveOnResize: true,
    },
  })

  return (
    <main className="page">
      <section className="toolbar">
        <h1>hetero-virtual</h1>
        <p>
          Heterogeneous bidirectional virtual scrolling demo.
        </p>
      </section>

      <div ref={parentRef} className="scrollRoot">
        <div
          className="spacer"
          style={{
            height: virtualizer.totalSize,
            position: "relative",
          }}
        >
          {virtualizer.items.map(virtualItem => (
            <div
              key={virtualItem.key}
              data-virtual-id={virtualItem.id}
              ref={virtualizer.measureElement(virtualItem.id)}
              className="virtualItem"
              style={{
                position: "absolute",
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {virtualizer.renderItem(virtualItem)}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
```

---

## CSS Recommendations

```css
.page {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  flex: 0 0 auto;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.scrollRoot {
  flex: 1 1 auto;
  overflow: auto;
  position: relative;
  overscroll-behavior: contain;
}

.spacer {
  position: relative;
  width: 100%;
}

.virtualItem {
  contain: layout paint style;
  will-change: transform;
}
```

For some components, this may be useful:

```css
.virtualItem[data-heavy="true"] {
  content-visibility: auto;
  contain-intrinsic-size: 240px;
}
```

Use `content-visibility` carefully.
It can improve rendering cost, but it may also affect measurement timing.

---

## Example Demo Item Types

```ts
type DemoItem =
  | {
      id: string
      type: "text"
      text: string
    }
  | {
      id: string
      type: "markdown"
      text: string
      codeBlockCount: number
      imageCount: number
    }
  | {
      id: string
      type: "image"
      src: string
      width: number
      height: number
    }
  | {
      id: string
      type: "chart"
      dataPoints: number
      declaredHeight?: number
    }
  | {
      id: string
      type: "tool-result"
      title: string
      collapsed: boolean
      rows: number
    }
```

---

## Example Text Adapter

```tsx
export const TextAdapter = {
  type: "text",

  estimateHeight(item) {
    return 32 + item.text.length * 0.25
  },

  estimateRenderCost() {
    return 1
  },

  renderPlaceholder(item) {
    return <div style={{ height: item.estimatedHeight }} />
  },

  renderShell() {
    return <div className="textShell" />
  },

  renderLight(item) {
    return <p>{item.text}</p>
  },

  renderFull(item) {
    return <p>{item.text}</p>
  },

  canHydrateDuringScroll: true,
}
```

---

## Example Markdown Adapter

```tsx
export const MarkdownAdapter = {
  type: "markdown",

  estimateHeight(item) {
    return (
      48 +
      item.text.length * 0.35 +
      item.codeBlockCount * 120 +
      item.imageCount * 180
    )
  },

  estimateRenderCost(item) {
    return 4 + item.codeBlockCount * 3 + item.imageCount * 4
  },

  renderPlaceholder(item) {
    return <div style={{ height: item.estimatedHeight }} />
  },

  renderShell() {
    return <div className="markdownShell" />
  },

  renderLight(item) {
    return (
      <article className="markdownLight">
        {item.text}
      </article>
    )
  },

  renderFull(item) {
    return (
      <article className="markdownFull">
        {/* Replace with real markdown renderer later. */}
        {item.text}
      </article>
    )
  },

  canHydrateDuringScroll: false,
}
```

---

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

---

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

---

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

---

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

---

### Phase 2: Anchor Manager

Implement:

```ts
captureAnchor()
restoreAnchor()
isBeforeAnchor()
```

Validate with prepend before building full rendering.

---

### Phase 3: Range Calculator

Implement:

```ts
computeVisibleRange(scrollTop, viewportHeight, velocity, direction)
```

Use pixel-based adaptive overscan.

---

### Phase 4: Placeholder Virtualizer

Render only placeholders.

The goal is to prove that dynamic height, bidirectional scrolling, and anchor preservation work before introducing heavy components.

---

### Phase 5: Measurement Pipeline

Add:

* `ResizeObserver`
* measurement queue
* height correction
* anchor restoration
* estimator update

---

### Phase 6: Render Scheduler

Add:

* render task queue
* priority scoring
* frame budget
* scroll modes
* progressive hydration

---

### Phase 7: Adapters

Add real adapters:

* text
* markdown
* image
* chart
* tool result

---

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

---

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

---

## License

MIT
