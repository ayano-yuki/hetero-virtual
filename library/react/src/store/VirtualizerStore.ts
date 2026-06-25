import {
  AdapterRegistry,
  ChunkedHeightTree,
  RangeCalculator,
  RenderScheduler,
  computeRenderPriority,
  type RangeCalculatorOptions,
  type RenderLevel,
  type RenderSchedulerOptions,
  type ScrollDirection,
  type ScrollMode,
} from "@hetero-virtual/core"

export type VirtualizerStoreItem = {
  id: string
  height: number
  type: string
}

export type VirtualItem<TItem> = {
  id: string
  index: number
  item: TItem
  key: string
  level: RenderLevel
  size: number
  start: number
}

export type VirtualizerSnapshot<TItem> = {
  measurementCount: number
  renderQueueSize: number
  totalSize: number
  virtualItems: readonly VirtualItem<TItem>[]
}

export type VirtualizerStoreOptions<TItem, TRenderOutput> = {
  adapters: AdapterRegistry<TItem, TRenderOutput>
  estimateHeight: (item: TItem) => number
  getKey: (item: TItem) => string
  getType: (item: TItem) => string
  items: readonly TItem[]
  overscan?: RangeCalculatorOptions
  scheduler?: RenderSchedulerOptions
}

export type ViewportState = {
  direction: ScrollDirection
  height: number
  lowEnd: boolean
  mode: ScrollMode
  scrollTop: number
  velocity: number
  width: number
}

const EMPTY_SNAPSHOT: VirtualizerSnapshot<never> = {
  measurementCount: 0,
  renderQueueSize: 0,
  totalSize: 0,
  virtualItems: [],
}

export class VirtualizerStore<TItem, TRenderOutput> {
  private readonly listeners = new Set<() => void>()
  private readonly adapters: AdapterRegistry<TItem, TRenderOutput>
  private readonly estimateHeight: (item: TItem) => number
  private readonly getKey: (item: TItem) => string
  private readonly getType: (item: TItem) => string
  private readonly overscan: RangeCalculatorOptions
  private readonly schedulerOptions: RenderSchedulerOptions
  private heightTree = new ChunkedHeightTree()
  private rangeCalculator: RangeCalculator
  private renderScheduler: RenderScheduler
  private items: readonly TItem[] = []
  private indexById = new Map<string, number>()
  private sizeById = new Map<string, number>()
  private measurementCount = 0
  private viewport: ViewportState = {
    direction: "none",
    height: 1,
    lowEnd: false,
    mode: "idle",
    scrollTop: 0,
    velocity: 0,
    width: 1,
  }
  private snapshot: VirtualizerSnapshot<TItem> =
    EMPTY_SNAPSHOT as VirtualizerSnapshot<TItem>

  constructor(options: VirtualizerStoreOptions<TItem, TRenderOutput>) {
    this.adapters = options.adapters
    this.estimateHeight = options.estimateHeight
    this.getKey = options.getKey
    this.getType = options.getType
    this.overscan = options.overscan ?? {}
    this.schedulerOptions = options.scheduler ?? {}
    this.rangeCalculator = new RangeCalculator(
      this.heightTree,
      this.overscan,
    )
    this.renderScheduler = new RenderScheduler(this.schedulerOptions)
    this.syncItems(options.items)
  }

  getSnapshot = (): VirtualizerSnapshot<TItem> => this.snapshot

  getServerSnapshot = (): VirtualizerSnapshot<TItem> => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  syncItems(items: readonly TItem[]): void {
    const previousLevels = new Map<string, RenderLevel>()

    for (const item of this.items) {
      const id = this.getKey(item)
      previousLevels.set(id, this.renderScheduler.getLevel(id))
    }

    this.items = items
    this.heightTree = new ChunkedHeightTree()
    this.indexById = new Map()
    const heightItems = items.map((item, index) => {
      const id = this.getKey(item)
      const size = this.sizeById.get(id) ?? this.estimateHeight(item)

      assertPositiveFinite(size, `estimated height for ${id}`)
      this.indexById.set(id, index)
      this.sizeById.set(id, size)
      return { id, height: size }
    })

    this.heightTree.append(heightItems)
    this.rangeCalculator = new RangeCalculator(
      this.heightTree,
      this.overscan,
    )
    this.renderScheduler = new RenderScheduler(this.schedulerOptions)

    for (const [id, level] of previousLevels) {
      if (this.indexById.has(id)) {
        this.renderScheduler.setLevel(id, level)
      }
    }

    this.recompute()
  }

  setViewport(viewport: Partial<ViewportState>): void {
    this.viewport = { ...this.viewport, ...viewport }
    this.recompute()
  }

  measure(id: string, height: number): boolean {
    assertPositiveFinite(height, "measured height")

    const previous = this.sizeById.get(id)

    if (previous === undefined) {
      return false
    }

    if (Math.abs(previous - height) < 0.5) {
      return false
    }

    this.sizeById.set(id, height)
    this.heightTree.updateHeight(id, height)
    this.measurementCount += 1
    this.recompute()
    return true
  }

  getLevel(id: string): RenderLevel {
    return this.renderScheduler.getLevel(id)
  }

  processRenderQueue(now?: () => number): boolean {
    const result = this.renderScheduler.process({
      apply: () => undefined,
      lowEnd: this.viewport.lowEnd,
      mode: this.viewport.mode,
      now,
    })

    if (result.appliedCount > 0) {
      this.recompute()
      return true
    }

    if (result.remainingCount !== this.snapshot.renderQueueSize) {
      this.recompute()
    }

    return false
  }

  render(virtualItem: VirtualItem<TItem>): TRenderOutput {
    return this.adapters.render(
      this.getType(virtualItem.item),
      virtualItem.item,
      {
        level: virtualItem.level,
        viewportWidth: this.viewport.width,
      },
    )
  }

  getMeasurementMode(id: string) {
    const index = this.indexById.get(id)

    if (index === undefined) {
      return undefined
    }

    return this.adapters.get(this.getType(this.items[index])).measurement
  }

  private recompute(): void {
    const range = this.rangeCalculator.computeVisibleRange({
      scrollTop: this.viewport.scrollTop,
      viewportHeight: this.viewport.height,
      velocity: this.viewport.velocity,
      direction: this.viewport.direction,
    })
    const virtualItems: VirtualItem<TItem>[] = []

    this.renderScheduler.clearTasks()

    if (range) {
      const startIndex = this.indexById.get(range.start.id) ?? 0
      const endIndex = this.indexById.get(range.end.id) ?? startIndex
      const viewportEnd =
        this.viewport.scrollTop + this.viewport.height
      const viewportCenter =
        (this.viewport.scrollTop + viewportEnd) / 2

      for (let index = startIndex; index <= endIndex; index += 1) {
        const item = this.items[index]
        const id = this.getKey(item)
        const type = this.getType(item)
        const start = this.heightTree.offsetOf(id) ?? 0
        const size = this.sizeById.get(id) ?? this.estimateHeight(item)
        const end = start + size
        const isVisible =
          end > this.viewport.scrollTop && start < viewportEnd
        const distanceFromViewport = isVisible
          ? 0
          : end <= this.viewport.scrollTop
            ? this.viewport.scrollTop - end
            : start - viewportEnd
        const isAhead =
          this.viewport.direction === "down"
            ? start >= viewportCenter
            : this.viewport.direction === "up"
              ? end <= viewportCenter
              : false
        const adapter = this.adapters.get(type)
        const renderCost = this.adapters.estimateRenderCost(
          type,
          item,
          3,
        )

        this.renderScheduler.enqueue({
          itemId: id,
          targetLevel: 3,
          priority: computeRenderPriority({
            distanceFromViewport,
            isAhead,
            isNearAnchor: index === startIndex,
            isVisible,
            renderCost,
          }),
          estimatedCost: renderCost,
          heavy: adapter.canHydrateDuringScroll === false,
        })
        virtualItems.push({
          id,
          index,
          item,
          key: id,
          level: this.renderScheduler.getLevel(id),
          size,
          start,
        })
      }
    }

    this.snapshot = {
      measurementCount: this.measurementCount,
      renderQueueSize: this.renderScheduler.size,
      totalSize: this.heightTree.totalHeight(),
      virtualItems,
    }

    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`)
  }
}
