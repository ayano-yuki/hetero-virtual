import { AdapterRegistry, type VirtualItemAdapter } from "@hetero-virtual/core"
import { describe, expect, it, vi } from "vitest"

import { VirtualizerStore } from "@react/store/VirtualizerStore"

type Item = {
  height: number
  id: string
  type: string
}

const adapter: VirtualItemAdapter<Item, string> = {
  type: "text",
  estimateHeight: (item) => item.height,
  renderCost: {
    placeholder: 1,
    shell: 1,
    light: 1,
    full: 1,
  },
  renderLevels: {
    placeholder: (item) => `placeholder:${item.id}`,
    shell: (item) => `shell:${item.id}`,
    light: (item) => `light:${item.id}`,
    full: (item) => `full:${item.id}`,
  },
  measurement: {
    mode: "observe",
    triggers: ["content"],
  },
  canHydrateDuringScroll: true,
}

function createStore(items = createItems(20)) {
  return new VirtualizerStore({
    adapters: new AdapterRegistry([adapter]),
    estimateHeight: (item: Item) => item.height,
    getKey: (item: Item) => item.id,
    getType: (item: Item) => item.type,
    items,
    overscan: {
      minOverscanPx: 0,
      maxOverscanPx: 0,
      baseViewportRatio: 0,
    },
  })
}

describe("VirtualizerStore", () => {
  it("computes a virtual range and total size", () => {
    const store = createStore()

    store.setViewport({
      height: 100,
      scrollTop: 150,
      width: 800,
    })

    const snapshot = store.getSnapshot()

    expect(snapshot.totalSize).toBe(1_000)
    expect(snapshot.virtualItems.map((item) => item.id)).toEqual([
      "item-3",
      "item-4",
      "item-5",
    ])
    expect(snapshot.virtualItems[0].start).toBe(150)
  })

  it("notifies subscribers after viewport and measurement updates", () => {
    const store = createStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.setViewport({ height: 100, width: 800 })
    expect(store.measure("item-0", 80)).toBe(true)
    expect(store.measure("item-0", 80.2)).toBe(false)

    expect(listener).toHaveBeenCalledTimes(2)
    expect(store.getSnapshot().measurementCount).toBe(1)
    expect(store.getSnapshot().totalSize).toBe(1_030)

    unsubscribe()
    store.setViewport({ scrollTop: 50 })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("promotes render levels through the scheduler", () => {
    const store = createStore()

    store.setViewport({
      height: 100,
      mode: "idle",
      width: 800,
    })

    expect(store.getSnapshot().virtualItems[0].level).toBe(0)

    store.processRenderQueue(() => 0)
    expect(store.getSnapshot().virtualItems[0].level).toBe(1)

    store.processRenderQueue(() => 0)
    store.processRenderQueue(() => 0)
    expect(store.getSnapshot().virtualItems[0].level).toBe(3)
    expect(store.render(store.getSnapshot().virtualItems[0])).toBe(
      "full:item-0",
    )
  })

  it("keeps measured sizes and render levels when items are synchronized", () => {
    const items = createItems(5)
    const store = createStore(items)

    store.setViewport({ height: 100, mode: "idle", width: 800 })
    store.measure("item-0", 80)
    store.processRenderQueue(() => 0)
    store.syncItems([...items, { height: 50, id: "item-5", type: "text" }])

    expect(store.getSnapshot().totalSize).toBe(330)
    expect(store.getLevel("item-0")).toBe(1)
  })
})

function createItems(count: number): Item[] {
  return Array.from({ length: count }, (_, index) => ({
    height: 50,
    id: `item-${index}`,
    type: "text",
  }))
}
