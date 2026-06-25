import { describe, expect, it } from "vitest"

import {
  AnchorManager,
  measureViewportShift,
  type Anchor,
} from "./AnchorManager"
import { ChunkedHeightTree } from "./ChunkedHeightTree"

describe("AnchorManager", () => {
  it("captures the item holding the viewport position", () => {
    const tree = createTree()
    const manager = new AnchorManager(tree)

    expect(manager.captureAnchor(35)).toEqual({
      itemId: "b",
      offsetWithinItem: 5,
    })
    expect(manager.captureAnchor(-20)).toEqual({
      itemId: "a",
      offsetWithinItem: 0,
    })
  })

  it("restores the anchor after prepend without viewport shift", () => {
    const tree = createTree()
    const manager = new AnchorManager(tree)
    const scrollTopBefore = 42
    const anchor = requiredAnchor(manager.captureAnchor(scrollTopBefore))
    const anchorOffsetBefore = requiredOffset(tree.offsetOf(anchor.itemId))

    tree.prepend([
      { id: "new-0", height: 17 },
      { id: "new-1", height: 29 },
    ])

    const scrollTopAfter = requiredOffset(manager.restoreAnchor(anchor))
    const anchorOffsetAfter = requiredOffset(tree.offsetOf(anchor.itemId))

    expect(scrollTopAfter).toBe(88)
    expect(
      measureViewportShift(
        { anchorOffset: anchorOffsetBefore, scrollTop: scrollTopBefore },
        { anchorOffset: anchorOffsetAfter, scrollTop: scrollTopAfter },
      ),
    ).toBe(0)
  })

  it("restores the anchor after heights above it change", () => {
    const tree = createTree()
    const manager = new AnchorManager(tree)
    const scrollTopBefore = 75
    const anchor = requiredAnchor(manager.captureAnchor(scrollTopBefore))
    const anchorOffsetBefore = requiredOffset(tree.offsetOf(anchor.itemId))

    tree.updateHeight("a", 50)
    tree.updateHeight("b", 25)

    const scrollTopAfter = requiredOffset(manager.restoreAnchor(anchor))
    const anchorOffsetAfter = requiredOffset(tree.offsetOf(anchor.itemId))

    expect(anchor.itemId).toBe("c")
    expect(scrollTopAfter).toBe(80)
    expect(
      measureViewportShift(
        { anchorOffset: anchorOffsetBefore, scrollTop: scrollTopBefore },
        { anchorOffset: anchorOffsetAfter, scrollTop: scrollTopAfter },
      ),
    ).toBe(0)
  })

  it("reports whether an item is before the anchor", () => {
    const tree = createTree()
    const manager = new AnchorManager(tree)
    const anchor = requiredAnchor(manager.captureAnchor(35))

    expect(manager.isBeforeAnchor("a", anchor)).toBe(true)
    expect(manager.isBeforeAnchor("b", anchor)).toBe(false)
    expect(manager.isBeforeAnchor("c", anchor)).toBe(false)
    expect(manager.isBeforeAnchor("missing", anchor)).toBeUndefined()
  })

  it("handles empty trees and missing anchors", () => {
    const tree = new ChunkedHeightTree()
    const manager = new AnchorManager(tree)

    expect(manager.captureAnchor(0)).toBeUndefined()
    expect(
      manager.restoreAnchor({
        itemId: "missing",
        offsetWithinItem: 0,
      }),
    ).toBeUndefined()
  })

  it("measures uncorrected viewport shift", () => {
    expect(
      measureViewportShift(
        { anchorOffset: 100, scrollTop: 80 },
        { anchorOffset: 130, scrollTop: 90 },
      ),
    ).toBe(20)
  })

  it("rejects invalid anchor inputs", () => {
    const manager = new AnchorManager(createTree())

    expect(() => manager.captureAnchor(Number.NaN)).toThrow(RangeError)
    expect(() =>
      manager.restoreAnchor({ itemId: "", offsetWithinItem: 0 }),
    ).toThrow()
    expect(() =>
      manager.restoreAnchor({ itemId: "a", offsetWithinItem: -1 }),
    ).toThrow(RangeError)
    expect(() =>
      measureViewportShift(
        { anchorOffset: Number.NaN, scrollTop: 0 },
        { anchorOffset: 0, scrollTop: 0 },
      ),
    ).toThrow(RangeError)
  })
})

function createTree(): ChunkedHeightTree {
  const tree = new ChunkedHeightTree({ chunkSize: 2 })

  tree.append([
    { id: "a", height: 30 },
    { id: "b", height: 40 },
    { id: "c", height: 50 },
  ])

  return tree
}

function requiredAnchor(anchor: Anchor | undefined): Anchor {
  if (!anchor) {
    throw new Error("Expected anchor")
  }

  return anchor
}

function requiredOffset(offset: number | undefined): number {
  if (offset === undefined) {
    throw new Error("Expected offset")
  }

  return offset
}
