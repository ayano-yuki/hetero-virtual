import { describe, expect, it } from "vitest"

import { AnchorManager, measureViewportShift } from "@core/anchor/AnchorManager"
import { MeasurementQueue } from "@core/measurement/MeasurementQueue"
import { ChunkedHeightTree } from "@core/structures/ChunkedHeightTree"

describe("measurement pipeline", () => {
  it("preserves the viewport anchor across multiple height corrections", () => {
    const tree = new ChunkedHeightTree()
    tree.append([
      { id: "a", height: 40 },
      { id: "b", height: 50 },
      { id: "anchor", height: 60 },
      { id: "d", height: 70 },
    ])
    const anchorManager = new AnchorManager(tree)
    const queue = new MeasurementQueue()
    const scrollTopBefore = 105
    const anchor = anchorManager.captureAnchor(scrollTopBefore)

    if (!anchor) {
      throw new Error("Expected anchor")
    }

    const anchorOffsetBefore = tree.offsetOf(anchor.itemId)

    if (anchorOffsetBefore === undefined) {
      throw new Error("Expected anchor offset")
    }

    queue.enqueue({ id: "a", height: 75, priority: 10 })
    queue.enqueue({ id: "b", height: 30, priority: 9 })
    queue.flush(
      (measurement) => tree.updateHeight(measurement.id, measurement.height),
      { budgetMs: 10, now: () => 0 },
    )

    const scrollTopAfter = anchorManager.restoreAnchor(anchor)
    const anchorOffsetAfter = tree.offsetOf(anchor.itemId)

    expect(scrollTopAfter).toBeDefined()
    expect(anchorOffsetAfter).toBeDefined()
    expect(
      measureViewportShift(
        {
          anchorOffset: anchorOffsetBefore,
          scrollTop: scrollTopBefore,
        },
        {
          anchorOffset: anchorOffsetAfter ?? 0,
          scrollTop: scrollTopAfter ?? 0,
        },
      ),
    ).toBe(0)
  })
})
