import { describe, expect, it } from "vitest"

import {
  createTrialHookOptions,
  createTrialItems,
  createTrialStore,
} from "./privateTrial"

describe("private package trial", () => {
  it("uses core and react as workspace dependencies", () => {
    const items = createTrialItems(6)
    const store = createTrialStore(items)

    store.setViewport({ height: 120, mode: "idle", scrollTop: 40, width: 640 })

    const snapshot = store.getSnapshot()

    expect(snapshot.totalSize).toBeGreaterThan(0)
    expect(snapshot.virtualItems.map((item) => item.id)).toEqual([
      "note-0",
      "note-1",
      "note-2",
    ])
  })

  it("exercises the public hook option shape without mounting React", () => {
    const options = createTrialHookOptions()

    expect(options.estimateHeight(options.items[0])).toBe(48)
    expect(options.getKey(options.items[0])).toBe("note-0")
    expect(options.getScrollElement()).toBeNull()
  })
})
