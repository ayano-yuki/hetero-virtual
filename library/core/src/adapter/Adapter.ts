import type { RenderLevel } from "@core/scheduler/RenderScheduler"

export type AdapterLayoutContext = {
  viewportWidth: number
}

export type AdapterRenderContext = {
  level: RenderLevel
  viewportWidth: number
}

export type MeasurementMode =
  | "fixed"
  | "observe"
  | "observe-after-hydration"

export type MeasurementTrigger = "content" | "load" | "resize"

export type MeasurementBehavior = {
  mode: MeasurementMode
  triggers?: readonly MeasurementTrigger[]
}

export type AdapterRenderCost<TItem> =
  | number
  | ((item: TItem) => number)

export type AdapterRenderCostHints<TItem> = {
  placeholder: AdapterRenderCost<TItem>
  shell: AdapterRenderCost<TItem>
  light: AdapterRenderCost<TItem>
  full: AdapterRenderCost<TItem>
}

export type AdapterRenderLevels<TItem, TRenderOutput> = {
  placeholder: (
    item: TItem,
    context: AdapterRenderContext,
  ) => TRenderOutput
  shell: (item: TItem, context: AdapterRenderContext) => TRenderOutput
  light: (item: TItem, context: AdapterRenderContext) => TRenderOutput
  full: (item: TItem, context: AdapterRenderContext) => TRenderOutput
}

export type VirtualItemAdapter<TItem, TRenderOutput = unknown> = {
  type: string
  estimateHeight: (
    item: TItem,
    context: AdapterLayoutContext,
  ) => number
  renderCost: AdapterRenderCostHints<TItem>
  renderLevels: AdapterRenderLevels<TItem, TRenderOutput>
  measurement: MeasurementBehavior
  canHydrateDuringScroll?: boolean
}

export class AdapterRegistry<TItem, TRenderOutput = unknown> {
  private readonly adapters = new Map<
    string,
    VirtualItemAdapter<TItem, TRenderOutput>
  >()

  constructor(
    adapters: readonly VirtualItemAdapter<TItem, TRenderOutput>[] = [],
  ) {
    for (const adapter of adapters) {
      this.register(adapter)
    }
  }

  register(adapter: VirtualItemAdapter<TItem, TRenderOutput>): void {
    assertAdapter(adapter)

    if (this.adapters.has(adapter.type)) {
      throw new Error(`Adapter type is already registered: ${adapter.type}`)
    }

    this.adapters.set(adapter.type, adapter)
  }

  get(type: string): VirtualItemAdapter<TItem, TRenderOutput> {
    assertType(type)

    const adapter = this.adapters.get(type)

    if (!adapter) {
      throw new Error(`Unknown adapter type: ${type}`)
    }

    return adapter
  }

  estimateHeight(
    type: string,
    item: TItem,
    context: AdapterLayoutContext,
  ): number {
    assertPositiveFinite(context.viewportWidth, "viewportWidth")

    const height = this.get(type).estimateHeight(item, context)
    assertPositiveFinite(height, "estimated height")
    return height
  }

  estimateRenderCost(
    type: string,
    item: TItem,
    level: RenderLevel,
  ): number {
    const hint = getRenderCostHint(this.get(type).renderCost, level)
    const cost = typeof hint === "function" ? hint(item) : hint

    assertPositiveFinite(cost, "render cost")
    return cost
  }

  render(
    type: string,
    item: TItem,
    context: AdapterRenderContext,
  ): TRenderOutput {
    assertPositiveFinite(context.viewportWidth, "viewportWidth")

    const renderer = getRenderLevelRenderer(
      this.get(type).renderLevels,
      context.level,
    )
    return renderer(item, context)
  }
}

export function getRenderLevelName(
  level: RenderLevel,
): keyof AdapterRenderLevels<unknown, unknown> {
  if (level === 0) {
    return "placeholder"
  }

  if (level === 1) {
    return "shell"
  }

  if (level === 2) {
    return "light"
  }

  return "full"
}

function getRenderCostHint<TItem>(
  hints: AdapterRenderCostHints<TItem>,
  level: RenderLevel,
): AdapterRenderCost<TItem> {
  return hints[getRenderLevelName(level)]
}

function getRenderLevelRenderer<TItem, TRenderOutput>(
  levels: AdapterRenderLevels<TItem, TRenderOutput>,
  level: RenderLevel,
): (
  item: TItem,
  context: AdapterRenderContext,
) => TRenderOutput {
  return levels[getRenderLevelName(level)]
}

function assertAdapter<TItem, TRenderOutput>(
  adapter: VirtualItemAdapter<TItem, TRenderOutput>,
): void {
  assertType(adapter.type)
  assertMeasurementBehavior(adapter.measurement)

  for (const level of [0, 1, 2, 3] as const) {
    const renderer = getRenderLevelRenderer(adapter.renderLevels, level)
    const cost = getRenderCostHint(adapter.renderCost, level)

    if (typeof renderer !== "function") {
      throw new TypeError(
        `renderLevels.${getRenderLevelName(level)} must be a function`,
      )
    }

    if (typeof cost !== "function") {
      assertPositiveFinite(
        cost,
        `renderCost.${getRenderLevelName(level)}`,
      )
    }
  }
}

function assertMeasurementBehavior(
  behavior: MeasurementBehavior,
): void {
  if (
    behavior.mode !== "fixed" &&
    behavior.mode !== "observe" &&
    behavior.mode !== "observe-after-hydration"
  ) {
    throw new Error(`Unknown measurement mode: ${String(behavior.mode)}`)
  }

  for (const trigger of behavior.triggers ?? []) {
    if (
      trigger !== "content" &&
      trigger !== "load" &&
      trigger !== "resize"
    ) {
      throw new Error(`Unknown measurement trigger: ${String(trigger)}`)
    }
  }
}

function assertType(type: string): void {
  if (type.length === 0) {
    throw new Error("adapter type must not be empty")
  }
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`)
  }
}
