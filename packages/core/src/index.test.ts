import { describe, expect, it } from "vitest"

import { ChunkedHeightTree, CORE_PACKAGE_NAME, FenwickTree } from "./index"

describe("@hetero-virtual/core", () => {
  it("exposes the core package entry points", () => {
    expect(CORE_PACKAGE_NAME).toBe("@hetero-virtual/core")
    expect(FenwickTree).toBeTypeOf("function")
    expect(ChunkedHeightTree).toBeTypeOf("function")
  })
})
