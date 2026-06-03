# React API

This section shows the proposed React API for `hetero-virtual`.

## Hook Draft

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

## Render Pattern

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

## Minimal Usage

The hook exposes:

* `items` – virtualized item metadata
* `totalSize` – total spacer height
* `measureElement(id)` – ref callback for measurement
* `renderItem(item)` – render wrapper for the current level

This pattern separates layout from item rendering and keeps the scroll root minimal.
