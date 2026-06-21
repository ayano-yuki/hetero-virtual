import { describe, expect, it } from "vitest"

import {
  BENCHMARK_SCENARIOS,
  evaluateBenchmarkEvidence,
  getBenchmarkScenario,
  getScenarioHeightVariance,
  getScenarioItemType,
} from "./benchmarkScenarios"

describe("benchmark scenarios", () => {
  it("defines the Phase 9 dataset sizes", () => {
    expect(BENCHMARK_SCENARIOS.map((scenario) => scenario.count)).toEqual([
      100_000,
      50_000,
      20_000,
      10_000,
    ])
  })

  it("produces the intended item type distribution", () => {
    expect(getScenarioItemType("plain-text-100k", 9)).toBe("text")
    expect(getScenarioItemType("markdown-50k", 1)).toBe("markdown")
    expect(getScenarioItemType("markdown-50k", 7)).toBe("text")
    expect(getScenarioItemType("image-20k", 1)).toBe("image")
    expect(getScenarioItemType("image-20k", 5)).toBe("text")
    expect(getScenarioItemType("heavy-10k", 2)).toBe("chart")
    expect(getScenarioItemType("heavy-10k", 3)).toBe("tool-result")
  })

  it("uses larger height variance for heterogeneous scenarios", () => {
    expect(getScenarioHeightVariance("plain-text-100k", 8)).toBeLessThan(
      getScenarioHeightVariance("heavy-10k", 8),
    )
  })

  it("evaluates the documented performance thresholds", () => {
    expect(
      evaluateBenchmarkEvidence({
        cpuThrottle: "4x external / 4ms budget",
        dataset: "plain-text-100k",
        heavyBlankFrameCount: 0,
        heavyPlaceholderOnlyFrameCount: 0,
        library: "hetero-virtual",
        measuredAt: "2026-06-16T00:00:00.000Z",
        measurementQueue: 0,
        p95JsFrameTime: 6,
        renderedItems: 20,
        sampleCount: 120,
        scenario: "fast scroll",
        scenarioId: "plain-text-100k",
        totalItems: 100_000,
        viewportShift: 0.99,
      }),
    ).toMatchObject({
      frameTimePassed: true,
      viewportShiftPassed: true,
    })
  })

  it("does not pass frame time before samples exist", () => {
    const result = evaluateBenchmarkEvidence({
      cpuThrottle: "none / 8ms budget",
      dataset: "plain-text-100k",
      heavyBlankFrameCount: 0,
      heavyPlaceholderOnlyFrameCount: 0,
      library: "hetero-virtual",
      measuredAt: "2026-06-16T00:00:00.000Z",
      measurementQueue: 0,
      p95JsFrameTime: 0,
      renderedItems: 20,
      sampleCount: 0,
      scenario: "idle",
      scenarioId: "plain-text-100k",
      totalItems: 100_000,
      viewportShift: 0,
    })

    expect(result.frameTimePassed).toBe(false)
    expect(result.heavyBlankFramePassed).toBe(true)
    expect(result.measurementQueuePassed).toBe(true)
    expect(result.viewportShiftPassed).toBe(true)
  })

  it("passes frame time only when samples exist", () => {
    expect(
      evaluateBenchmarkEvidence({
        cpuThrottle: "none / 8ms budget",
        dataset: "plain-text-100k",
        heavyBlankFrameCount: 0,
        heavyPlaceholderOnlyFrameCount: 0,
        library: "hetero-virtual",
        measuredAt: "2026-06-16T00:00:00.000Z",
        measurementQueue: 0,
        p95JsFrameTime: 5.5,
        renderedItems: 20,
        sampleCount: 3,
        scenario: "fast scroll",
        scenarioId: "plain-text-100k",
        totalItems: 100_000,
        viewportShift: 0,
      }).frameTimePassed,
    ).toBe(true)
  })

  it("evaluates queue and blank-frame gate diagnostics", () => {
    expect(
      evaluateBenchmarkEvidence({
        cpuThrottle: "4x external / 4ms budget",
        dataset: "heavy-10k",
        heavyBlankFrameCount: 1,
        heavyPlaceholderOnlyFrameCount: 3,
        library: "hetero-virtual",
        measuredAt: "2026-06-16T00:00:00.000Z",
        measurementQueue: 1,
        p95JsFrameTime: 5,
        renderedItems: 18,
        sampleCount: 120,
        scenario: "heavy fast scroll",
        scenarioId: "heavy-10k",
        totalItems: 10_000,
        viewportShift: 0,
      }),
    ).toMatchObject({
      heavyBlankFramePassed: false,
      measurementQueuePassed: false,
    })
  })

  it("rejects an unknown scenario", () => {
    expect(() =>
      getBenchmarkScenario("missing" as "plain-text-100k"),
    ).toThrow("Unknown benchmark scenario")
  })
})
