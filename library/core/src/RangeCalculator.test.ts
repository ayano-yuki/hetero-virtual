import { describe, expect, it } from "vitest"

import { ChunkedHeightTree } from "./ChunkedHeightTree"
import { RangeCalculator } from "./RangeCalculator"

describe("RangeCalculator", () => {
  it("computes a pixel-based visible range", () => {
    const tree = createUniformTree(10, 100)
    const calculator = new RangeCalculator(tree, {
      minOverscanPx: 100,
      maxOverscanPx: 1_000,
      horizonMs: 100,
      baseViewportRatio: 0.5,
    })

    const range = calculator.computeVisibleRange({
      scrollTop: 300,
      viewportHeight: 200,
      velocity: 0,
      direction: "none",
    })

    expect(range).toMatchObject({
      start: { id: "item-2", offset: 200 },
      end: { id: "item-6", offset: 600 },
      startOffset: 200,
      endOffset: 600,
      overscan: { before: 100, after: 100 },
    })
  })

  it("adds velocity overscan in the scroll direction", () => {
    const calculator = new RangeCalculator(createUniformTree(20, 100), {
      minOverscanPx: 100,
      maxOverscanPx: 600,
      horizonMs: 100,
      baseViewportRatio: 0.5,
    })

    expect(calculator.computeOverscan(400, 3, "down")).toEqual({
      before: 200,
      after: 500,
    })
    expect(calculator.computeOverscan(400, 3, "up")).toEqual({
      before: 500,
      after: 200,
    })
    expect(calculator.computeOverscan(400, 3, "none")).toEqual({
      before: 200,
      after: 200,
    })
  })

  it("clamps adaptive overscan to configured bounds", () => {
    const calculator = new RangeCalculator(createUniformTree(2, 100), {
      minOverscanPx: 150,
      maxOverscanPx: 500,
      horizonMs: 120,
      baseViewportRatio: 0.25,
    })

    expect(calculator.computeOverscan(200, 0, "down")).toEqual({
      before: 150,
      after: 150,
    })
    expect(calculator.computeOverscan(2_000, 100, "down")).toEqual({
      before: 500,
      after: 500,
    })
  })

  it("clamps range offsets to the height tree", () => {
    const calculator = new RangeCalculator(createUniformTree(3, 100), {
      minOverscanPx: 100,
      maxOverscanPx: 100,
    })

    const beforeStart = calculator.computeVisibleRange({
      scrollTop: -500,
      viewportHeight: 100,
      velocity: 0,
      direction: "none",
    })
    const afterEnd = calculator.computeVisibleRange({
      scrollTop: 500,
      viewportHeight: 100,
      velocity: 0,
      direction: "none",
    })

    expect(beforeStart).toMatchObject({
      start: { id: "item-0" },
      startOffset: 0,
    })
    expect(afterEnd).toMatchObject({
      end: { id: "item-2" },
      endOffset: 300,
    })
  })

  it("handles high-variance item heights using pixel offsets", () => {
    const tree = new ChunkedHeightTree({ chunkSize: 2 })
    tree.append([
      { id: "short-0", height: 20 },
      { id: "tall", height: 1_200 },
      { id: "short-1", height: 30 },
      { id: "medium", height: 300 },
      { id: "short-2", height: 15 },
    ])
    const calculator = new RangeCalculator(tree, {
      minOverscanPx: 100,
      maxOverscanPx: 800,
      horizonMs: 100,
      baseViewportRatio: 0.5,
    })

    const range = calculator.computeVisibleRange({
      scrollTop: 1_180,
      viewportHeight: 200,
      velocity: 4,
      direction: "down",
    })

    expect(range).toMatchObject({
      start: { id: "tall", offset: 20 },
      end: { id: "short-2", offset: 1_550 },
      startOffset: 1_080,
      endOffset: 1_565,
      overscan: { before: 100, after: 500 },
    })
  })

  it("returns undefined for an empty tree", () => {
    const calculator = new RangeCalculator(new ChunkedHeightTree())

    expect(
      calculator.computeVisibleRange({
        scrollTop: 0,
        viewportHeight: 100,
        velocity: 0,
        direction: "none",
      }),
    ).toBeUndefined()
  })

  it("rejects invalid configuration and input", () => {
    const tree = createUniformTree(2, 100)

    expect(
      () =>
        new RangeCalculator(tree, {
          minOverscanPx: 200,
          maxOverscanPx: 100,
        }),
    ).toThrow(RangeError)

    const calculator = new RangeCalculator(tree)

    expect(() =>
      calculator.computeVisibleRange({
        scrollTop: 0,
        viewportHeight: 0,
        velocity: 0,
        direction: "none",
      }),
    ).toThrow(RangeError)
    expect(() => calculator.computeOverscan(100, -1, "down")).toThrow(
      RangeError,
    )
    expect(() =>
      calculator.computeOverscan(100, 0, "sideways" as "down"),
    ).toThrow("Unknown scroll direction")
  })
})

function createUniformTree(
  count: number,
  height: number,
): ChunkedHeightTree {
  const tree = new ChunkedHeightTree({ chunkSize: 3 })

  tree.append(
    Array.from({ length: count }, (_, index) => ({
      id: `item-${index}`,
      height,
    })),
  )

  return tree
}
