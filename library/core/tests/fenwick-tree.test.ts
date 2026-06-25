import { describe, expect, it } from "vitest"

import { FenwickTree } from "@core/structures/FenwickTree"

describe("FenwickTree", () => {
  it("computes prefix sums and totals", () => {
    const tree = new FenwickTree([4, 7, 3, 9])

    expect(tree.prefixSum(0)).toBe(0)
    expect(tree.prefixSum(2)).toBe(11)
    expect(tree.prefixSum(4)).toBe(23)
    expect(tree.total()).toBe(23)
  })

  it("supports appending and updating values", () => {
    const tree = new FenwickTree([10, 20])

    tree.push(30)
    tree.update(1, 25)

    expect(tree.get(1)).toBe(25)
    expect(tree.prefixSum(2)).toBe(35)
    expect(tree.total()).toBe(65)
  })

  it("finds lower and upper prefix bounds", () => {
    const tree = new FenwickTree([10, 20, 30])

    expect(tree.lowerBound(1)).toBe(0)
    expect(tree.lowerBound(10)).toBe(0)
    expect(tree.lowerBound(11)).toBe(1)
    expect(tree.lowerBound(60)).toBe(2)
    expect(tree.lowerBound(61)).toBeUndefined()

    expect(tree.upperBound(-1)).toBe(0)
    expect(tree.upperBound(0)).toBe(0)
    expect(tree.upperBound(9)).toBe(0)
    expect(tree.upperBound(10)).toBe(1)
    expect(tree.upperBound(59)).toBe(2)
    expect(tree.upperBound(60)).toBe(2)
  })

  it("rejects invalid indices and values", () => {
    const tree = new FenwickTree([1])

    expect(() => tree.get(1)).toThrow(RangeError)
    expect(() => tree.update(-1, 2)).toThrow(RangeError)
    expect(() => tree.push(Number.NaN)).toThrow(RangeError)
    expect(() => tree.push(-1)).toThrow(RangeError)
    expect(() => tree.prefixSum(1.5)).toThrow(TypeError)
  })
})
