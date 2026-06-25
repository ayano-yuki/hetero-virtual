import { describe, expect, it } from "vitest"

import { MeasurementQueue } from "./MeasurementQueue"

describe("MeasurementQueue", () => {
  it("deduplicates by id and keeps the latest measurement", () => {
    const queue = new MeasurementQueue()
    const processed: number[] = []

    queue.enqueue({ id: "item", height: 100, priority: 1 })
    queue.enqueue({ id: "item", height: 140, priority: 2 })
    queue.flush((measurement) => processed.push(measurement.height), {
      budgetMs: 10,
      now: constantClock,
    })

    expect(processed).toEqual([140])
    expect(queue.size).toBe(0)
  })

  it("processes higher-priority measurements first", () => {
    const queue = new MeasurementQueue()
    const processed: string[] = []

    queue.enqueue({ id: "far", height: 100, priority: 1 })
    queue.enqueue({ id: "visible", height: 100, priority: 100 })
    queue.enqueue({ id: "near", height: 100, priority: 10 })
    queue.flush((measurement) => processed.push(measurement.id), {
      budgetMs: 10,
      now: constantClock,
    })

    expect(processed).toEqual(["visible", "near", "far"])
  })

  it("stops at the time budget and keeps remaining work", () => {
    const queue = new MeasurementQueue()
    const processed: string[] = []
    const now = steppedClock(0, 0, 2, 3)

    queue.enqueue({ id: "a", height: 100, priority: 3 })
    queue.enqueue({ id: "b", height: 100, priority: 2 })
    queue.enqueue({ id: "c", height: 100, priority: 1 })

    expect(
      queue.flush((measurement) => processed.push(measurement.id), {
        budgetMs: 2,
        now,
      }),
    ).toBe(1)
    expect(processed).toEqual(["a"])
    expect(queue.size).toBe(2)
  })

  it("clears pending measurements", () => {
    const queue = new MeasurementQueue()
    queue.enqueue({ id: "item", height: 100, priority: 1 })

    queue.clear()

    expect(queue.size).toBe(0)
  })

  it("rejects invalid measurements and budgets", () => {
    const queue = new MeasurementQueue()

    expect(() =>
      queue.enqueue({ id: "", height: 100, priority: 1 }),
    ).toThrow()
    expect(() =>
      queue.enqueue({ id: "item", height: 0, priority: 1 }),
    ).toThrow(RangeError)
    expect(() =>
      queue.enqueue({ id: "item", height: 100, priority: -1 }),
    ).toThrow(RangeError)
    expect(() =>
      queue.flush(() => undefined, { budgetMs: Number.NaN }),
    ).toThrow(RangeError)
  })
})

function constantClock(): number {
  return 0
}

function steppedClock(...values: number[]): () => number {
  let index = 0

  return () => values[Math.min(index++, values.length - 1)]
}
