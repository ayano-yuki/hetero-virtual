# React API

`@hetero-virtual/react` connects the framework-independent core to React and
the DOM. Range state lives in an external store and React subscribes with
`useSyncExternalStore`.

## Hook

```tsx
const virtualizer = useHeteroVirtualizer({
  items,
  getScrollElement: () => parentRef.current,
  getKey: item => item.id,
  getType: item => item.type,
  estimateHeight: item => item.height,
  adapters: adapterRegistry,
  lowEnd,
  overscan: {
    minOverscanPx: 600,
    maxOverscanPx: 3600,
    horizonMs: 120,
    baseViewportRatio: 0.5,
  },
  scheduler: {
    lowEndBudgetMs: 4,
    normalBudgetMs: 8,
  },
})
```

The hook connects:

* scroll and resize listeners
* velocity, direction, and scroll-mode updates
* frame-budget render scheduling
* `ResizeObserver` measurement
* adapter rendering at the current render level

## Render Pattern

```tsx
<div ref={parentRef} className="hetero-scroll">
  <div
    className="hetero-spacer"
    style={{
      height: virtualizer.totalSize,
      position: "relative",
    }}
  >
    {virtualizer.virtualItems.map(virtualItem => (
      <HeteroVirtualItem
        key={virtualItem.key}
        virtualItem={virtualItem}
        virtualizer={virtualizer}
        className="hetero-item"
      />
    ))}
  </div>
</div>
```

`HeteroVirtualItem` positions the item, attaches `measureElement`, and renders
the adapter output for the current placeholder, shell, light, or full level.

## Returned State

* `virtualItems` - visible and overscan item metadata
* `totalSize` - total spacer height
* `renderQueueSize` - pending scheduler tasks
* `measurementCount` - accepted DOM height corrections
* `measureElement(id)` - stable DOM ref callback
* `renderItem(item)` - adapter rendering glue
* `store` - lower-level imperative store for advanced integrations

The store is exported separately so range, measurement, and scheduling behavior
can be tested without mounting React.
