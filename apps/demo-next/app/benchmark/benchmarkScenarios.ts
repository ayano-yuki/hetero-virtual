import type { DemoItemType } from "./adapters"

export type BenchmarkScenarioId =
  | "plain-text-100k"
  | "markdown-50k"
  | "image-20k"
  | "heavy-10k"

export type BenchmarkScenario = {
  count: number
  description: string
  id: BenchmarkScenarioId
  label: string
  shortLabel: string
}

export type BenchmarkEvidence = {
  measuredAt: string
  measurementQueue: number
  p95JsFrameTime: number
  renderedItems: number
  sampleCount: number
  scenarioId: BenchmarkScenarioId
  totalItems: number
  viewportShift: number
}

export type BenchmarkEvidenceResult = BenchmarkEvidence & {
  frameTimePassed: boolean
  viewportShiftPassed: boolean
}

export const BENCHMARK_SCENARIOS: readonly BenchmarkScenario[] = [
  {
    id: "plain-text-100k",
    count: 100_000,
    shortLabel: "Plain text",
    label: "100,000 plain text items",
    description: "Cheap, stable rows that stress range and height lookup.",
  },
  {
    id: "markdown-50k",
    count: 50_000,
    shortLabel: "Markdown/code",
    label: "50,000 markdown and code items",
    description: "Variable-height markdown rows with expensive full render.",
  },
  {
    id: "image-20k",
    count: 20_000,
    shortLabel: "Image cards",
    label: "20,000 delayed image cards",
    description: "Load-driven height changes and hydration deferral.",
  },
  {
    id: "heavy-10k",
    count: 10_000,
    shortLabel: "Charts/tools",
    label: "10,000 chart and tool-result items",
    description: "Heavy rows that should remain bounded during fling.",
  },
] as const

export const DEFAULT_BENCHMARK_SCENARIO = BENCHMARK_SCENARIOS[0]

export function getBenchmarkScenario(
  id: BenchmarkScenarioId,
): BenchmarkScenario {
  const scenario = BENCHMARK_SCENARIOS.find((candidate) => candidate.id === id)

  if (!scenario) {
    throw new Error(`Unknown benchmark scenario: ${id}`)
  }

  return scenario
}

export function getScenarioItemType(
  scenarioId: BenchmarkScenarioId,
  index: number,
): DemoItemType {
  const normalized = Math.abs(index)

  if (scenarioId === "plain-text-100k") {
    return "text"
  }

  if (scenarioId === "markdown-50k") {
    return normalized % 7 === 0 ? "text" : "markdown"
  }

  if (scenarioId === "image-20k") {
    return normalized % 5 === 0 ? "text" : "image"
  }

  return normalized % 2 === 0 ? "chart" : "tool-result"
}

export function getScenarioHeightVariance(
  scenarioId: BenchmarkScenarioId,
  index: number,
): number {
  const normalized = Math.abs(index)

  if (scenarioId === "plain-text-100k") {
    return normalized % 3
  }

  if (scenarioId === "markdown-50k") {
    return (normalized % 9) * 14
  }

  if (scenarioId === "image-20k") {
    return (normalized % 7) * 24
  }

  return (normalized % 11) * 18
}

export function evaluateBenchmarkEvidence(
  evidence: BenchmarkEvidence,
): BenchmarkEvidenceResult {
  return {
    ...evidence,
    frameTimePassed:
      evidence.sampleCount > 0 && evidence.p95JsFrameTime <= 6,
    viewportShiftPassed: evidence.viewportShift < 1,
  }
}
