import { describe, expect, it } from "vitest"

import {
  AdapterRegistry,
  AnchorManager,
  ChunkedHeightTree,
  CORE_PACKAGE_NAME,
  FenwickTree,
  HeightEstimator,
  MeasurementQueue,
  RangeCalculator,
  RenderScheduler,
  measureViewportShift,
} from "./index"

describe("@hetero-virtual/core", () => {
  it("exposes the core package entry points", () => {
    expect(CORE_PACKAGE_NAME).toBe("@hetero-virtual/core")
    expect(AdapterRegistry).toBeTypeOf("function")
    expect(FenwickTree).toBeTypeOf("function")
    expect(ChunkedHeightTree).toBeTypeOf("function")
    expect(AnchorManager).toBeTypeOf("function")
    expect(RangeCalculator).toBeTypeOf("function")
    expect(measureViewportShift).toBeTypeOf("function")
    expect(MeasurementQueue).toBeTypeOf("function")
    expect(HeightEstimator).toBeTypeOf("function")
    expect(RenderScheduler).toBeTypeOf("function")
  })
})
