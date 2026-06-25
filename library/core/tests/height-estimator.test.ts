import { describe, expect, it } from "vitest"

import { HeightEstimator } from "@core/estimator/HeightEstimator"

describe("HeightEstimator", () => {
  it("tracks independent bias by item type", () => {
    const estimator = new HeightEstimator({ learningRate: 0.5 })

    estimator.update("image", 100, 180)
    estimator.update("text", 100, 80)

    expect(estimator.estimate("image", 100)).toBe(140)
    expect(estimator.estimate("text", 100)).toBe(90)
  })

  it("updates variance and mean absolute error online", () => {
    const estimator = new HeightEstimator({ learningRate: 0.25 })

    estimator.update("image", 100, 140)
    const stats = estimator.update("image", 120, 100)

    expect(stats.count).toBe(2)
    expect(stats.bias).toBe(5)
    expect(stats.meanAbsoluteError).toBe(30)
    expect(stats.variance).toBe(400)
  })

  it("returns isolated stats snapshots", () => {
    const estimator = new HeightEstimator()
    const stats = estimator.getStats("text")

    stats.bias = 100

    expect(estimator.getStats("text").bias).toBe(0)
  })

  it("keeps estimates positive", () => {
    const estimator = new HeightEstimator({ learningRate: 1 })
    estimator.update("text", 100, 1)

    expect(estimator.estimate("text", 10)).toBe(1)
  })

  it("rejects invalid configuration and values", () => {
    expect(() => new HeightEstimator({ learningRate: 0 })).toThrow(RangeError)

    const estimator = new HeightEstimator()

    expect(() => estimator.estimate("", 100)).toThrow()
    expect(() => estimator.estimate("text", 0)).toThrow(RangeError)
    expect(() => estimator.update("text", 100, Number.NaN)).toThrow(
      RangeError,
    )
  })
})
