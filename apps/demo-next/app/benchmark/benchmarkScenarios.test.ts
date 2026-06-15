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
        measuredAt: "2026-06-16T00:00:00.000Z",
        measurementQueue: 0,
        p95JsFrameTime: 6,
        renderedItems: 20,
        sampleCount: 120,
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
    expect(
      evaluateBenchmarkEvidence({
        measuredAt: "2026-06-16T00:00:00.000Z",
        measurementQueue: 0,
        p95JsFrameTime: 0,
        renderedItems: 20,
        sampleCount: 0,
        scenarioId: "plain-text-100k",
        totalItems: 100_000,
        viewportShift: 0,
      }).frameTimePassed,
    ).toBe(false)
  })

  it("rejects an unknown scenario", () => {
    expect(() =>
      getBenchmarkScenario("missing" as "plain-text-100k"),
    ).toThrow("Unknown benchmark scenario")
  })
})
