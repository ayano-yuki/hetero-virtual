import { describe, expect, it } from "vitest"

import {
  RenderScheduler,
  computeRenderPriority,
  computeScrollMode,
  getMaximumRenderLevel,
  type RenderLevel,
} from "@core/scheduler/RenderScheduler"

describe("RenderScheduler", () => {
  it("deduplicates tasks and keeps the highest target and priority", () => {
    const scheduler = new RenderScheduler()
    const applied: Array<[string, RenderLevel]> = []

    scheduler.enqueue({
      itemId: "item",
      targetLevel: 1,
      priority: 10,
      estimatedCost: 1,
    })
    scheduler.enqueue({
      itemId: "item",
      targetLevel: 3,
      priority: 20,
      estimatedCost: 1,
    })
    scheduler.process({
      apply: (itemId, level) => applied.push([itemId, level]),
      mode: "idle",
      now: constantClock,
    })

    expect(applied).toEqual([["item", 1]])
    expect(scheduler.size).toBe(1)
  })

  it("processes higher-priority tasks first", () => {
    const scheduler = new RenderScheduler()
    const applied: string[] = []

    scheduler.enqueue(task("far", 10))
    scheduler.enqueue(task("visible", 100))
    scheduler.enqueue(task("near", 50))
    scheduler.process({
      apply: (itemId) => applied.push(itemId),
      mode: "idle",
      now: constantClock,
    })

    expect(applied).toEqual(["visible", "near", "far"])
  })

  it("stops when estimated work exhausts the frame budget", () => {
    const scheduler = new RenderScheduler({
      normalBudgetMs: 2,
      lowEndBudgetMs: 1,
    })
    const applied: string[] = []

    scheduler.enqueue(task("a", 30, 3))
    scheduler.enqueue(task("b", 20, 3))
    scheduler.enqueue(task("c", 10, 3))

    const result = scheduler.process({
      apply: (itemId) => applied.push(itemId),
      mode: "idle",
      now: constantClock,
    })

    expect(applied).toEqual(["a", "b"])
    expect(result.remainingCount).toBe(3)
  })

  it("promotes each item by one render level per process call", () => {
    const scheduler = new RenderScheduler()
    const applied: RenderLevel[] = []
    scheduler.enqueue(task("item", 100, 3))

    for (let frame = 0; frame < 3; frame += 1) {
      scheduler.process({
        apply: (_itemId, level) => applied.push(level),
        mode: "idle",
        now: constantClock,
      })
    }

    expect(applied).toEqual([1, 2, 3])
    expect(scheduler.getLevel("item")).toBe(3)
    expect(scheduler.size).toBe(0)
  })

  it("keeps heavy items at shell level while flinging", () => {
    const scheduler = new RenderScheduler()
    const applied: RenderLevel[] = []
    scheduler.enqueue({
      ...task("heavy", 100, 3),
      heavy: true,
    })

    scheduler.process({
      apply: (_itemId, level) => applied.push(level),
      mode: "flinging",
      now: constantClock,
    })
    scheduler.process({
      apply: (_itemId, level) => applied.push(level),
      mode: "flinging",
      now: constantClock,
    })
    scheduler.process({
      apply: (_itemId, level) => applied.push(level),
      mode: "idle",
      now: constantClock,
    })

    expect(applied).toEqual([1, 2])
    expect(scheduler.getLevel("heavy")).toBe(2)
  })

  it("supports explicit levels and removal", () => {
    const scheduler = new RenderScheduler()
    scheduler.setLevel("item", 2)
    scheduler.enqueue(task("item", 10, 3))

    expect(scheduler.getLevel("item")).toBe(2)
    expect(scheduler.size).toBe(1)

    scheduler.remove("item")

    expect(scheduler.getLevel("item")).toBe(0)
    expect(scheduler.size).toBe(0)
  })

  it("rejects invalid tasks and options", () => {
    expect(
      () => new RenderScheduler({ normalBudgetMs: 0 }),
    ).toThrow(RangeError)

    const scheduler = new RenderScheduler()

    expect(() =>
      scheduler.enqueue({
        itemId: "",
        targetLevel: 1,
        priority: 1,
        estimatedCost: 1,
      }),
    ).toThrow()
    expect(() =>
      scheduler.setLevel("item", 4 as RenderLevel),
    ).toThrow(RangeError)
  })
})

describe("render scheduling helpers", () => {
  it("computes scroll modes", () => {
    expect(
      computeScrollMode({
        elapsedSinceScrollMs: 0,
        isScrolling: true,
        velocity: 3,
      }),
    ).toBe("flinging")
    expect(
      computeScrollMode({
        elapsedSinceScrollMs: 0,
        isScrolling: true,
        velocity: 1,
      }),
    ).toBe("dragging")
    expect(
      computeScrollMode({
        elapsedSinceScrollMs: 80,
        isScrolling: false,
        velocity: 0,
      }),
    ).toBe("settling")
    expect(
      computeScrollMode({
        elapsedSinceScrollMs: 200,
        isScrolling: false,
        velocity: 0,
      }),
    ).toBe("idle")
  })

  it("scores visible, forward, anchor-safe, cheap tasks higher", () => {
    const highPriority = computeRenderPriority({
      distanceFromViewport: 0,
      isAhead: true,
      isNearAnchor: true,
      isVisible: true,
      renderCost: 1,
    })
    const lowPriority = computeRenderPriority({
      distanceFromViewport: 500,
      isAhead: false,
      isNearAnchor: false,
      isVisible: false,
      renderCost: 10,
    })

    expect(highPriority).toBeGreaterThan(lowPriority)
  })

  it("limits render levels by mode and cost class", () => {
    expect(getMaximumRenderLevel("flinging", true)).toBe(1)
    expect(getMaximumRenderLevel("flinging", false)).toBe(2)
    expect(getMaximumRenderLevel("dragging", true)).toBe(2)
    expect(getMaximumRenderLevel("idle", true)).toBe(3)
  })
})

function task(
  itemId: string,
  priority: number,
  estimatedCost = 1,
) {
  return {
    itemId,
    targetLevel: 3 as const,
    priority,
    estimatedCost,
  }
}

function constantClock(): number {
  return 0
}
