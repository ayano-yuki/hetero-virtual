export type RenderLevel = 0 | 1 | 2 | 3

export type ScrollMode = "idle" | "dragging" | "flinging" | "settling"

export type RenderTask = {
  itemId: string
  targetLevel: RenderLevel
  priority: number
  estimatedCost: number
  heavy?: boolean
}

export type RenderSchedulerOptions = {
  lowEndBudgetMs?: number
  normalBudgetMs?: number
}

export type ProcessRenderQueueOptions = {
  apply: (itemId: string, level: RenderLevel) => void
  lowEnd?: boolean
  mode: ScrollMode
  now?: () => number
}

export type RenderProcessResult = {
  appliedCount: number
  elapsedMs: number
  remainingCount: number
}

export type ScrollModeInput = {
  elapsedSinceScrollMs: number
  isScrolling: boolean
  velocity: number
}

export type ScrollModeOptions = {
  flingVelocity?: number
  settlingDurationMs?: number
}

export type RenderPriorityInput = {
  distanceFromViewport: number
  isAhead: boolean
  isNearAnchor: boolean
  isVisible: boolean
  renderCost: number
}

const DEFAULT_LOW_END_BUDGET_MS = 4
const DEFAULT_NORMAL_BUDGET_MS = 8
const DEFAULT_FLING_VELOCITY = 2
const DEFAULT_SETTLING_DURATION_MS = 160

export class RenderScheduler {
  private readonly lowEndBudgetMs: number
  private readonly normalBudgetMs: number
  private readonly tasks = new Map<string, RenderTask>()
  private readonly levels = new Map<string, RenderLevel>()

  constructor(options: RenderSchedulerOptions = {}) {
    this.lowEndBudgetMs =
      options.lowEndBudgetMs ?? DEFAULT_LOW_END_BUDGET_MS
    this.normalBudgetMs =
      options.normalBudgetMs ?? DEFAULT_NORMAL_BUDGET_MS

    assertPositiveFinite(this.lowEndBudgetMs, "lowEndBudgetMs")
    assertPositiveFinite(this.normalBudgetMs, "normalBudgetMs")
  }

  get size(): number {
    return this.tasks.size
  }

  enqueue(task: RenderTask): void {
    assertTask(task)

    const currentLevel = this.getLevel(task.itemId)

    if (task.targetLevel <= currentLevel) {
      this.tasks.delete(task.itemId)
      return
    }

    const existing = this.tasks.get(task.itemId)

    this.tasks.set(task.itemId, {
      itemId: task.itemId,
      targetLevel: maxLevel(existing?.targetLevel ?? 0, task.targetLevel),
      priority: Math.max(existing?.priority ?? 0, task.priority),
      estimatedCost: task.estimatedCost,
      heavy: task.heavy ?? existing?.heavy ?? false,
    })
  }

  getLevel(itemId: string): RenderLevel {
    return this.levels.get(itemId) ?? 0
  }

  setLevel(itemId: string, level: RenderLevel): void {
    assertItemId(itemId)
    assertRenderLevel(level)

    this.levels.set(itemId, level)

    const task = this.tasks.get(itemId)

    if (task && task.targetLevel <= level) {
      this.tasks.delete(itemId)
    }
  }

  remove(itemId: string): void {
    this.tasks.delete(itemId)
    this.levels.delete(itemId)
  }

  clearTasks(): void {
    this.tasks.clear()
  }

  process(options: ProcessRenderQueueOptions): RenderProcessResult {
    assertScrollMode(options.mode)

    const now = options.now ?? performance.now.bind(performance)
    const budgetMs = options.lowEnd
      ? this.lowEndBudgetMs
      : this.normalBudgetMs
    const startedAt = now()
    const tasks = [...this.tasks.values()].sort(
      (left, right) =>
        right.priority - left.priority ||
        left.estimatedCost - right.estimatedCost ||
        left.itemId.localeCompare(right.itemId),
    )
    let appliedCount = 0
    let estimatedSpent = 0

    for (const task of tasks) {
      const elapsed = now() - startedAt

      if (elapsed >= budgetMs) {
        break
      }

      const currentLevel = this.getLevel(task.itemId)
      const allowedLevel = getMaximumRenderLevel(options.mode, task.heavy)
      const nextLevel = Math.min(
        currentLevel + 1,
        task.targetLevel,
        allowedLevel,
      ) as RenderLevel

      if (nextLevel <= currentLevel) {
        continue
      }

      const stepCost = task.estimatedCost / Math.max(task.targetLevel, 1)

      if (estimatedSpent + stepCost > budgetMs) {
        continue
      }

      options.apply(task.itemId, nextLevel)
      this.levels.set(task.itemId, nextLevel)
      estimatedSpent += stepCost
      appliedCount += 1

      if (nextLevel >= task.targetLevel) {
        this.tasks.delete(task.itemId)
      }
    }

    return {
      appliedCount,
      elapsedMs: now() - startedAt,
      remainingCount: this.tasks.size,
    }
  }
}

export function computeScrollMode(
  input: ScrollModeInput,
  options: ScrollModeOptions = {},
): ScrollMode {
  assertNonNegativeFinite(input.velocity, "velocity")
  assertNonNegativeFinite(
    input.elapsedSinceScrollMs,
    "elapsedSinceScrollMs",
  )

  const flingVelocity = options.flingVelocity ?? DEFAULT_FLING_VELOCITY
  const settlingDurationMs =
    options.settlingDurationMs ?? DEFAULT_SETTLING_DURATION_MS

  assertNonNegativeFinite(flingVelocity, "flingVelocity")
  assertNonNegativeFinite(settlingDurationMs, "settlingDurationMs")

  if (input.isScrolling) {
    return input.velocity >= flingVelocity ? "flinging" : "dragging"
  }

  if (input.elapsedSinceScrollMs < settlingDurationMs) {
    return "settling"
  }

  return "idle"
}

export function computeRenderPriority(input: RenderPriorityInput): number {
  assertNonNegativeFinite(
    input.distanceFromViewport,
    "distanceFromViewport",
  )
  assertNonNegativeFinite(input.renderCost, "renderCost")

  const visibleScore = input.isVisible ? 1_000 : 0
  const directionScore = input.isAhead ? 200 : 0
  const anchorScore = input.isNearAnchor ? 300 : 0
  const distancePenalty = input.distanceFromViewport * 0.5
  const costPenalty = input.renderCost * 20

  return visibleScore + directionScore + anchorScore - distancePenalty - costPenalty
}

export function getMaximumRenderLevel(
  mode: ScrollMode,
  heavy = false,
): RenderLevel {
  assertScrollMode(mode)

  if (mode === "flinging") {
    return heavy ? 1 : 2
  }

  if (mode === "dragging") {
    return heavy ? 2 : 3
  }

  if (mode === "settling") {
    return 2
  }

  return 3
}

function assertTask(task: RenderTask): void {
  assertItemId(task.itemId)
  assertRenderLevel(task.targetLevel)
  assertFinite(task.priority, "task priority")
  assertPositiveFinite(task.estimatedCost, "task estimatedCost")
}

function assertItemId(itemId: string): void {
  if (itemId.length === 0) {
    throw new Error("itemId must not be empty")
  }
}

function assertRenderLevel(level: number): asserts level is RenderLevel {
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw new RangeError("render level must be an integer from 0 to 3")
  }
}

function assertScrollMode(mode: ScrollMode): void {
  if (
    mode !== "idle" &&
    mode !== "dragging" &&
    mode !== "flinging" &&
    mode !== "settling"
  ) {
    throw new Error(`Unknown scroll mode: ${String(mode)}`)
  }
}

function assertNonNegativeFinite(value: number, name: string): void {
  assertFinite(value, name)

  if (value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`)
  }
}

function assertPositiveFinite(value: number, name: string): void {
  assertFinite(value, name)

  if (value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`)
  }
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

function maxLevel(left: RenderLevel, right: RenderLevel): RenderLevel {
  return Math.max(left, right) as RenderLevel
}
