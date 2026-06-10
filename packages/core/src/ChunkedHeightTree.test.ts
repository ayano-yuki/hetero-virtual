import { describe, expect, it } from "vitest"

import {
  ChunkedHeightTree,
  type HeightTreeItem,
  type HeightTreeMatch,
} from "./ChunkedHeightTree"

describe("ChunkedHeightTree", () => {
  it("appends, prepends, and resolves offsets across chunk boundaries", () => {
    const tree = new ChunkedHeightTree({ chunkSize: 2 })

    tree.append([
      item("base-0", 10),
      item("base-1", 20),
      item("base-2", 30),
    ])
    tree.prepend([
      item("front-0", 5),
      item("front-1", 6),
      item("front-2", 7),
    ])

    expect(tree.size).toBe(6)
    expect(tree.totalHeight()).toBe(78)
    expect(tree.offsetOf("front-0")).toBe(0)
    expect(tree.offsetOf("front-1")).toBe(5)
    expect(tree.offsetOf("front-2")).toBe(11)
    expect(tree.offsetOf("base-0")).toBe(18)
    expect(tree.offsetOf("base-1")).toBe(28)
    expect(tree.offsetOf("base-2")).toBe(48)

    expect(tree.findItemAtOffset(0)).toEqual(match("front-0", 5, 0))
    expect(tree.findItemAtOffset(5)).toEqual(match("front-1", 6, 5))
    expect(tree.findItemAtOffset(11)).toEqual(match("front-2", 7, 11))
    expect(tree.findItemAtOffset(18)).toEqual(match("base-0", 10, 18))
    expect(tree.findItemAtOffset(77)).toEqual(match("base-2", 30, 48))
  })

  it("keeps repeated prepend batches in visual order", () => {
    const tree = new ChunkedHeightTree({ chunkSize: 2 })

    tree.append([item("d", 10)])
    tree.prepend([item("b", 10), item("c", 10)])
    tree.prepend([item("a-0", 10), item("a-1", 10), item("a-2", 10)])

    expectIdsAtItemStarts(tree, ["a-0", "a-1", "a-2", "b", "c", "d"])
  })

  it("updates heights on both sides of the tree", () => {
    const tree = new ChunkedHeightTree({ chunkSize: 1 })

    tree.append([item("middle", 20), item("bottom", 30)])
    tree.prepend([item("top", 10)])

    tree.updateHeight("top", 15)
    tree.updateHeight("middle", 25)

    expect(tree.totalHeight()).toBe(70)
    expect(tree.offsetOf("top")).toBe(0)
    expect(tree.offsetOf("middle")).toBe(15)
    expect(tree.offsetOf("bottom")).toBe(40)
    expect(tree.findItemAtOffset(39)).toEqual(match("middle", 25, 15))
    expect(tree.findItemAtOffset(40)).toEqual(match("bottom", 30, 40))
  })

  it("clamps finite offsets and handles empty trees", () => {
    const tree = new ChunkedHeightTree()

    expect(tree.findItemAtOffset(0)).toBeUndefined()
    expect(tree.offsetOf("missing")).toBeUndefined()

    tree.prepend([item("a", 10), item("b", 20)])

    expect(tree.findItemAtOffset(-100)).toEqual(match("a", 10, 0))
    expect(tree.findItemAtOffset(30)).toEqual(match("b", 20, 10))
    expect(tree.findItemAtOffset(100)).toEqual(match("b", 20, 10))
  })

  it("rejects invalid construction and mutations atomically", () => {
    expect(() => new ChunkedHeightTree({ chunkSize: 0 })).toThrow(RangeError)

    const tree = new ChunkedHeightTree()
    tree.append([item("existing", 10)])

    expect(() =>
      tree.append([item("new", 20), item("existing", 30)]),
    ).toThrow("Duplicate item id: existing")
    expect(() => tree.prepend([item("duplicate", 5), item("duplicate", 6)]))
      .toThrow("Duplicate item id: duplicate")
    expect(() => tree.append([item("invalid", 0)])).toThrow(RangeError)
    expect(() => tree.updateHeight("missing", 10)).toThrow(
      "Unknown item id: missing",
    )
    expect(() => tree.updateHeight("existing", Number.NaN)).toThrow(RangeError)
    expect(() => tree.findItemAtOffset(Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    )

    expect(tree.size).toBe(1)
    expect(tree.totalHeight()).toBe(10)
    expect(tree.offsetOf("new")).toBeUndefined()
  })

  it("preserves an anchor visual position after prepend compensation", () => {
    const tree = new ChunkedHeightTree({ chunkSize: 2 })
    tree.append([
      item("a", 30),
      item("anchor", 40),
      item("c", 50),
    ])

    const offsetWithinAnchor = 12
    const scrollTopBefore =
      requiredOffset(tree.offsetOf("anchor")) + offsetWithinAnchor
    const visualPositionBefore =
      requiredOffset(tree.offsetOf("anchor")) - scrollTopBefore

    tree.prepend([item("new-0", 15), item("new-1", 25), item("new-2", 35)])

    const prependHeight = 75
    const scrollTopAfter = scrollTopBefore + prependHeight
    const visualPositionAfter =
      requiredOffset(tree.offsetOf("anchor")) - scrollTopAfter

    expect(visualPositionAfter).toBe(visualPositionBefore)
    expect(tree.findItemAtOffset(scrollTopAfter)).toEqual(
      match("anchor", 40, 105),
    )
  })

  it("matches a flat reference model through deterministic random operations", () => {
    const tree = new ChunkedHeightTree({ chunkSize: 4 })
    const reference: HeightTreeItem[] = []
    const random = createRandom(0x51f15e)
    let nextId = 0

    for (let operation = 0; operation < 250; operation += 1) {
      const action = reference.length === 0 ? 0 : Math.floor(random() * 3)

      if (action === 0 || action === 1) {
        const batch = Array.from(
          { length: 1 + Math.floor(random() * 5) },
          () => item(`item-${nextId++}`, 1 + Math.floor(random() * 200)),
        )

        if (action === 0) {
          tree.append(batch)
          reference.push(...batch)
        } else {
          tree.prepend(batch)
          reference.unshift(...batch)
        }
      } else {
        const index = Math.floor(random() * reference.length)
        const height = 1 + Math.floor(random() * 200)
        const current = reference[index]

        tree.updateHeight(current.id, height)
        reference[index] = item(current.id, height)
      }

      assertMatchesReference(tree, reference, random)
    }
  })
})

function assertMatchesReference(
  tree: ChunkedHeightTree,
  reference: readonly HeightTreeItem[],
  random: () => number,
): void {
  let offset = 0

  expect(tree.size).toBe(reference.length)

  for (const current of reference) {
    expect(tree.offsetOf(current.id)).toBe(offset)
    expect(tree.findItemAtOffset(offset)).toEqual({
      ...current,
      offset,
    })
    offset += current.height
  }

  expect(tree.totalHeight()).toBe(offset)

  for (let sample = 0; sample < 8; sample += 1) {
    const sampledOffset = Math.floor(random() * (offset + 20)) - 10

    expect(tree.findItemAtOffset(sampledOffset)).toEqual(
      findReferenceItem(reference, sampledOffset),
    )
  }
}

function findReferenceItem(
  items: readonly HeightTreeItem[],
  offset: number,
): HeightTreeMatch | undefined {
  if (items.length === 0) {
    return undefined
  }

  const totalHeight = items.reduce((sum, current) => sum + current.height, 0)
  const clampedOffset = Math.min(Math.max(offset, 0), totalHeight)
  let itemOffset = 0

  for (const current of items) {
    if (clampedOffset < itemOffset + current.height) {
      return { ...current, offset: itemOffset }
    }

    itemOffset += current.height
  }

  const lastItem = items[items.length - 1]

  return {
    ...lastItem,
    offset: totalHeight - lastItem.height,
  }
}

function expectIdsAtItemStarts(
  tree: ChunkedHeightTree,
  expectedIds: readonly string[],
): void {
  let offset = 0

  for (const id of expectedIds) {
    const current = tree.findItemAtOffset(offset)

    expect(current?.id).toBe(id)
    offset += current?.height ?? 0
  }
}

function item(id: string, height: number): HeightTreeItem {
  return { id, height }
}

function match(id: string, height: number, offset: number): HeightTreeMatch {
  return { id, height, offset }
}

function requiredOffset(offset: number | undefined): number {
  if (offset === undefined) {
    throw new Error("Expected item offset")
  }

  return offset
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}
