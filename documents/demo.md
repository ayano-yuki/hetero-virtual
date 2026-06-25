# Demo & Examples

## Roles

This repository has two different consumer surfaces:

* `playground/benchmark` is the benchmark and evidence suite.
* `demo/next-basic` is the minimal external-consumer example.

Use the demo to validate performance and anchor behavior. Use the example to
understand the smallest React integration shape.

## Run The Benchmark Demo

```bash
pnpm dev
```

Open:

```txt
http://localhost:3000/benchmark
```

The benchmark includes large text, markdown/code, delayed image, and heavy
chart/tool-result presets. It exposes append, prepend, continuous mutation,
fast scroll, delayed image loading, high-variance correction, low-end scheduler
budget, and copyable evidence JSON.

## Run The Basic Example

```bash
pnpm --filter next-basic-example dev
```

The example consumes the workspace packages through public entrypoints:

```json
{
  "@hetero-virtual/core": "workspace:*",
  "@hetero-virtual/react": "workspace:*"
}
```

## Minimal React Pattern

```tsx
"use client"

import {
  AdapterRegistry,
  type VirtualItemAdapter,
} from "@hetero-virtual/core"
import {
  HeteroVirtualItem,
  useHeteroVirtualizer,
} from "@hetero-virtual/react"
import { useMemo, useRef, type ReactNode } from "react"

type Row = {
  id: string
  text: string
  height: number
  type: "text"
}

const textAdapter: VirtualItemAdapter<Row, ReactNode> = {
  type: "text",
  estimateHeight: (item) => item.height,
  renderCost: {
    placeholder: 0.25,
    shell: 0.5,
    light: 0.75,
    full: 1,
  },
  renderLevels: {
    placeholder: () => <span className="skeleton" />,
    shell: (item) => <span>{item.id}</span>,
    light: (item) => <span>{item.text}</span>,
    full: (item) => <strong>{item.text}</strong>,
  },
  measurement: {
    mode: "observe",
    triggers: ["content", "resize"],
  },
  canHydrateDuringScroll: true,
}

const adapters = new AdapterRegistry<Row, ReactNode>([textAdapter])

export default function Page() {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const items = useMemo(() => createRows(5_000), [])
  const virtualizer = useHeteroVirtualizer({
    adapters,
    estimateHeight: (item) => item.height,
    getKey: (item) => item.id,
    getScrollElement: () => parentRef.current,
    getType: (item) => item.type,
    items,
  })

  return (
    <div ref={parentRef} className="scrollRoot">
      <div className="spacer" style={{ height: virtualizer.totalSize }}>
        {virtualizer.virtualItems.map((virtualItem) => (
          <HeteroVirtualItem
            className="virtualItem"
            key={virtualItem.key}
            virtualItem={virtualItem}
            virtualizer={virtualizer}
          />
        ))}
      </div>
    </div>
  )
}
```

## CSS Recommendations

```css
.scrollRoot {
  height: 100dvh;
  overflow: auto;
  overscroll-behavior: contain;
}

.spacer {
  position: relative;
  width: 100%;
}

.virtualItem {
  contain: layout paint style;
  position: absolute;
  width: 100%;
}
```

For heavy components, `content-visibility` can help, but it can also alter
measurement timing. Validate it with the benchmark evidence panel before using
it in a publish-quality example.
