# Demo & Examples

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
          {virtualizer.virtualItems.map(virtualItem => (
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

## Example Adapters

### Text Adapter

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

### Markdown Adapter

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
