import {
  AdapterRegistry,
  type VirtualItemAdapter,
} from "@hetero-virtual/core"
import {
  VirtualizerStore,
  type UseHeteroVirtualizerOptions,
} from "@hetero-virtual/react"
import type { ReactNode } from "react"

export type TrialItem = {
  body: string
  height: number
  id: string
  type: "note"
}

const noteAdapter: VirtualItemAdapter<TrialItem, ReactNode> = {
  type: "note",
  estimateHeight: (item) => item.height,
  renderCost: {
    placeholder: 1,
    shell: 2,
    light: 3,
    full: 4,
  },
  renderLevels: {
    placeholder: (item) => item.id,
    shell: (item) => item.body.slice(0, 12),
    light: (item) => item.body,
    full: (item) => item.body.toUpperCase(),
  },
  measurement: {
    mode: "observe",
    triggers: ["content"],
  },
  canHydrateDuringScroll: true,
}

export const trialAdapters = new AdapterRegistry<TrialItem, ReactNode>([
  noteAdapter,
])

export function createTrialItems(count: number): TrialItem[] {
  return Array.from({ length: count }, (_, index) => ({
    body: `note ${index}`,
    height: 48 + (index % 3) * 8,
    id: `note-${index}`,
    type: "note",
  }))
}

export function createTrialStore(items = createTrialItems(12)) {
  return new VirtualizerStore<TrialItem, ReactNode>({
    adapters: trialAdapters,
    estimateHeight: (item) => item.height,
    getKey: (item) => item.id,
    getType: (item) => item.type,
    items,
    overscan: {
      baseViewportRatio: 0,
      maxOverscanPx: 0,
      minOverscanPx: 0,
    },
  })
}

export function createTrialHookOptions(
  items = createTrialItems(12),
): UseHeteroVirtualizerOptions<TrialItem> {
  return {
    adapters: trialAdapters,
    estimateHeight: (item) => item.height,
    getKey: (item) => item.id,
    getScrollElement: () => null,
    getType: (item) => item.type,
    items,
  }
}
