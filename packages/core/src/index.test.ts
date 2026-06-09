import { describe, expect, it } from "vitest"

import { CORE_PACKAGE_NAME } from "./index"

describe("@hetero-virtual/core", () => {
  it("exposes the internal package entry point", () => {
    expect(CORE_PACKAGE_NAME).toBe("@hetero-virtual/core")
  })
})
