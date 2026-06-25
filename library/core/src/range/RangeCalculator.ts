import {
  ChunkedHeightTree,
  type HeightTreeMatch,
} from "@core/structures/ChunkedHeightTree"

export type ScrollDirection = "up" | "down" | "none"

export type RangeCalculatorOptions = {
  minOverscanPx?: number
  maxOverscanPx?: number
  horizonMs?: number
  baseViewportRatio?: number
}

export type VisibleRangeInput = {
  scrollTop: number
  viewportHeight: number
  velocity: number
  direction: ScrollDirection
}

export type Overscan = {
  before: number
  after: number
}

export type VisibleRange = {
  start: HeightTreeMatch
  end: HeightTreeMatch
  startOffset: number
  endOffset: number
  overscan: Overscan
}

const DEFAULT_MIN_OVERSCAN_PX = 200
const DEFAULT_MAX_OVERSCAN_PX = 3_600
const DEFAULT_HORIZON_MS = 120
const DEFAULT_BASE_VIEWPORT_RATIO = 0.5

export class RangeCalculator {
  private readonly minOverscanPx: number
  private readonly maxOverscanPx: number
  private readonly horizonMs: number
  private readonly baseViewportRatio: number

  constructor(
    private readonly heightTree: ChunkedHeightTree,
    options: RangeCalculatorOptions = {},
  ) {
    this.minOverscanPx =
      options.minOverscanPx ?? DEFAULT_MIN_OVERSCAN_PX
    this.maxOverscanPx =
      options.maxOverscanPx ?? DEFAULT_MAX_OVERSCAN_PX
    this.horizonMs = options.horizonMs ?? DEFAULT_HORIZON_MS
    this.baseViewportRatio =
      options.baseViewportRatio ?? DEFAULT_BASE_VIEWPORT_RATIO

    assertNonNegativeFinite(this.minOverscanPx, "minOverscanPx")
    assertNonNegativeFinite(this.maxOverscanPx, "maxOverscanPx")
    assertNonNegativeFinite(this.horizonMs, "horizonMs")
    assertNonNegativeFinite(this.baseViewportRatio, "baseViewportRatio")

    if (this.maxOverscanPx < this.minOverscanPx) {
      throw new RangeError(
        "maxOverscanPx must be greater than or equal to minOverscanPx",
      )
    }
  }

  computeVisibleRange(input: VisibleRangeInput): VisibleRange | undefined {
    assertFinite(input.scrollTop, "scrollTop")
    assertPositiveFinite(input.viewportHeight, "viewportHeight")
    assertNonNegativeFinite(input.velocity, "velocity")
    assertDirection(input.direction)

    if (this.heightTree.size === 0) {
      return undefined
    }

    const totalHeight = this.heightTree.totalHeight()
    const scrollTop = clamp(input.scrollTop, 0, totalHeight)
    const overscan = this.computeOverscan(
      input.viewportHeight,
      input.velocity,
      input.direction,
    )
    const startOffset = Math.max(0, scrollTop - overscan.before)
    const endOffset = Math.min(
      totalHeight,
      scrollTop + input.viewportHeight + overscan.after,
    )
    const start = this.heightTree.findItemAtOffset(startOffset)
    const end = this.heightTree.findItemAtOffset(endOffset)

    if (!start || !end) {
      return undefined
    }

    return {
      start,
      end,
      startOffset,
      endOffset,
      overscan,
    }
  }

  computeOverscan(
    viewportHeight: number,
    velocity: number,
    direction: ScrollDirection,
  ): Overscan {
    assertPositiveFinite(viewportHeight, "viewportHeight")
    assertNonNegativeFinite(velocity, "velocity")
    assertDirection(direction)

    const base = clamp(
      viewportHeight * this.baseViewportRatio,
      this.minOverscanPx,
      this.maxOverscanPx,
    )
    const directional = clamp(
      base + velocity * this.horizonMs,
      this.minOverscanPx,
      this.maxOverscanPx,
    )

    if (direction === "up") {
      return { before: directional, after: base }
    }

    if (direction === "down") {
      return { before: base, after: directional }
    }

    return { before: base, after: base }
  }
}

function assertDirection(direction: ScrollDirection): void {
  if (direction !== "up" && direction !== "down" && direction !== "none") {
    throw new Error(`Unknown scroll direction: ${String(direction)}`)
  }
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

function assertNonNegativeFinite(value: number, name: string): void {
  assertFinite(value, name)

  if (value < 0) {
    throw new RangeError(`${name} must not be negative`)
  }
}

function assertPositiveFinite(value: number, name: string): void {
  assertFinite(value, name)

  if (value <= 0) {
    throw new RangeError(`${name} must be positive`)
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
