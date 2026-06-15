# Concepts

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

## Adapter Model

`hetero-virtual` does not accept arbitrary heavy components blindly.
Each item type should provide an adapter.

```ts
type VirtualItemAdapter<TItem, TRenderOutput> = {
  type: string

  estimateHeight: (item: TItem, context: LayoutContext) => number
  renderCost: {
    placeholder: number | ((item: TItem) => number)
    shell: number | ((item: TItem) => number)
    light: number | ((item: TItem) => number)
    full: number | ((item: TItem) => number)
  }
  renderLevels: {
    placeholder: (item: TItem, context: RenderContext) => TRenderOutput
    shell: (item: TItem, context: RenderContext) => TRenderOutput
    light: (item: TItem, context: RenderContext) => TRenderOutput
    full: (item: TItem, context: RenderContext) => TRenderOutput
  }
  measurement: {
    mode: "fixed" | "observe" | "observe-after-hydration"
    triggers?: Array<"content" | "load" | "resize">
  }

  canHydrateDuringScroll?: boolean
}
```

Example adapter:

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

  renderCost: {
    placeholder: 0.5,
    shell: 1,
    light: 2,
    full: item => 4 + item.codeBlockCount * 3 + item.imageCount * 4,
  },

  renderLevels: {
    placeholder: item => <div style={{ height: item.estimatedHeight }} />,
    shell: () => <div className="markdown-shell" />,
    light: item => <PlainMarkdown text={item.text} />,
    full: item => <HighlightedMarkdown text={item.text} />,
  },

  measurement: {
    mode: "observe",
    triggers: ["content", "resize"],
  },
  canHydrateDuringScroll: false,
}
```

Without an adapter, the virtualizer cannot know whether a component is cheap, expensive, stable, unstable, measurable, or safe to hydrate during scroll.

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

Heavy components such as charts, iframes, syntax highlighting, and image-heavy cards should not hydrate during `flinging`.

Example:

```ts
function getScrollMode(velocity, isScrolling) {
  if (!isScrolling) return "idle"
  if (velocity > HIGH_VELOCITY) return "flinging"
  return "dragging"
}
```

## Height Estimation

Each component type should estimate its own height.

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

Important rule:

> Scroll events collect input.
> Animation frames perform controlled work.
> No heavy component hydration happens directly inside the scroll event.
