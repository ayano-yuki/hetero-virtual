import { describe, expect, it } from "vitest"

import {
  AdapterRegistry,
  getRenderLevelName,
  type VirtualItemAdapter,
} from "./Adapter"

type Item = {
  height: number
  label: string
}

function createAdapter(
  overrides: Partial<VirtualItemAdapter<Item, string>> = {},
): VirtualItemAdapter<Item, string> {
  return {
    type: "text",
    estimateHeight: (item) => item.height,
    renderCost: {
      placeholder: 0.5,
      shell: 1,
      light: 2,
      full: (item) => item.label.length,
    },
    renderLevels: {
      placeholder: () => "placeholder",
      shell: () => "shell",
      light: (item) => `light:${item.label}`,
      full: (item) => `full:${item.label}`,
    },
    measurement: {
      mode: "observe",
      triggers: ["content", "resize"],
    },
    ...overrides,
  }
}

describe("AdapterRegistry", () => {
  it("resolves height, render cost, and render levels", () => {
    const registry = new AdapterRegistry([createAdapter()])
    const item = { height: 72, label: "hello" }

    expect(
      registry.estimateHeight("text", item, { viewportWidth: 800 }),
    ).toBe(72)
    expect(registry.estimateRenderCost("text", item, 0)).toBe(0.5)
    expect(registry.estimateRenderCost("text", item, 3)).toBe(5)
    expect(
      registry.render("text", item, {
        level: 2,
        viewportWidth: 800,
      }),
    ).toBe("light:hello")
  })

  it("maps all render levels to explicit names", () => {
    expect(([0, 1, 2, 3] as const).map(getRenderLevelName)).toEqual([
      "placeholder",
      "shell",
      "light",
      "full",
    ])
  })

  it("rejects duplicate and unknown adapter types", () => {
    const registry = new AdapterRegistry([createAdapter()])

    expect(() => registry.register(createAdapter())).toThrow(
      "Adapter type is already registered",
    )
    expect(() => registry.get("image")).toThrow("Unknown adapter type")
  })

  it("rejects invalid static and computed estimates", () => {
    expect(
      () =>
        new AdapterRegistry([
          createAdapter({
            renderCost: {
              placeholder: 0,
              shell: 1,
              light: 2,
              full: 3,
            },
          }),
        ]),
    ).toThrow("renderCost.placeholder")

    const invalidHeight = new AdapterRegistry([
      createAdapter({ estimateHeight: () => Number.NaN }),
    ])
    const invalidCost = new AdapterRegistry([
      createAdapter({
        renderCost: {
          placeholder: 1,
          shell: 1,
          light: 1,
          full: () => -1,
        },
      }),
    ])

    expect(() =>
      invalidHeight.estimateHeight(
        "text",
        { height: 1, label: "x" },
        { viewportWidth: 800 },
      ),
    ).toThrow("estimated height")
    expect(() =>
      invalidCost.estimateRenderCost(
        "text",
        { height: 1, label: "x" },
        3,
      ),
    ).toThrow("render cost")
  })

  it("validates measurement behavior", () => {
    expect(
      () =>
        new AdapterRegistry([
          createAdapter({
            measurement: {
              mode: "invalid" as "fixed",
            },
          }),
        ]),
    ).toThrow("Unknown measurement mode")
  })
})
