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

type ExampleItem = {
  id: string
  text: string
  height: number
  type: "text"
}

const textAdapter: VirtualItemAdapter<ExampleItem, ReactNode> = {
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
    shell: (item) => <span className="shell">{item.id}</span>,
    light: (item) => <span>{item.text}</span>,
    full: (item) => (
      <>
        <strong>{item.id}</strong>
        <span>{item.text}</span>
      </>
    ),
  },
  measurement: {
    mode: "observe",
    triggers: ["content", "resize"],
  },
  canHydrateDuringScroll: true,
}

const adapters = new AdapterRegistry<ExampleItem, ReactNode>([
  textAdapter,
])

export default function Page() {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const items = useMemo(() => createItems(5_000), [])
  const virtualizer = useHeteroVirtualizer({
    adapters,
    estimateHeight: (item) => item.height,
    getKey: (item) => item.id,
    getScrollElement: () => parentRef.current,
    getType: (item) => item.type,
    items,
    overscan: {
      baseViewportRatio: 0.5,
      maxOverscanPx: 1_600,
      minOverscanPx: 400,
    },
  })

  return (
    <main className="page">
      <header>
        <p>@hetero-virtual/react</p>
        <h1>Basic Next.js example</h1>
      </header>
      <div ref={parentRef} className="scrollRoot">
        <div
          className="spacer"
          style={{ height: virtualizer.totalSize }}
        >
          {virtualizer.virtualItems.map((virtualItem) => (
            <HeteroVirtualItem
              className="item"
              key={virtualItem.key}
              virtualItem={virtualItem}
              virtualizer={virtualizer}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

function createItems(count: number): ExampleItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index}`,
    text: `Dynamic text row ${index.toLocaleString()}`,
    height: 44 + (index % 5) * 8,
    type: "text",
  }))
}
