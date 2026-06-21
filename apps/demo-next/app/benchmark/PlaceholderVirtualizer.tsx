"use client"

import {
  AnchorManager,
  ChunkedHeightTree,
  HeightEstimator,
  MeasurementQueue,
  RangeCalculator,
  RenderScheduler,
  computeRenderPriority,
  computeScrollMode,
  measureViewportShift,
  type Anchor,
  type ScrollDirection,
  type ScrollMode,
} from "@hetero-virtual/core"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useHeteroVirtualizer } from "@hetero-virtual/react"

import {
  demoAdapterRegistry,
  type DemoItem,
  type DemoItemType,
} from "./adapters"
import {
  BENCHMARK_THRESHOLDS,
  BENCHMARK_SCENARIOS,
  DEFAULT_BENCHMARK_SCENARIO,
  evaluateBenchmarkEvidence,
  getScenarioHeightVariance,
  getScenarioItemType,
  type BenchmarkScenario,
  type BenchmarkScenarioId,
} from "./benchmarkScenarios"

const PREPEND_ITEM_COUNT = 1_000
const APPEND_ITEM_COUNT = 1_000
const FALLBACK_VIEWPORT_HEIGHT = 640
const FAST_SCROLL_STEP_PX = 1_100
const FAST_SCROLL_FRAME_COUNT = 90
const MEASUREMENT_BUDGET_MS = 4
const SCROLL_END_DELAY_MS = 80
const SETTLING_DURATION_MS = 160
const FRAME_SAMPLE_LIMIT = 240

type RestoreReason = "measurement" | "prepend"

type RenderWindow = {
  startIndex: number
  endIndex: number
  topSpacer: number
  bottomSpacer: number
}

type PendingAnchorRestore = {
  anchor: Anchor
  anchorOffsetBefore: number
  reason: RestoreReason
  scrollTopBefore: number
  targetScrollTop: number
}

type Runtime = {
  items: DemoItem[]
  indexById: Map<string, number>
  heightTree: ChunkedHeightTree
  anchorManager: AnchorManager
  rangeCalculator: RangeCalculator
  measurementQueue: MeasurementQueue
  heightEstimator: HeightEstimator
  renderScheduler: RenderScheduler
}

export function PlaceholderVirtualizer() {
  const [scenarioId, setScenarioId] = useState<BenchmarkScenarioId>(
    DEFAULT_BENCHMARK_SCENARIO.id,
  )
  const scenario =
    BENCHMARK_SCENARIOS.find((candidate) => candidate.id === scenarioId) ??
    DEFAULT_BENCHMARK_SCENARIO

  return (
    <BenchmarkVirtualizer
      key={scenario.id}
      scenario={scenario}
      onScenarioChange={setScenarioId}
    />
  )
}

function BenchmarkVirtualizer({
  scenario,
  onScenarioChange,
}: {
  scenario: BenchmarkScenario
  onScenarioChange: (id: BenchmarkScenarioId) => void
}) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<Runtime | null>(null)
  const rangeFrameRef = useRef<number | null>(null)
  const measurementFrameRef = useRef<number | null>(null)
  const renderFrameRef = useRef<number | null>(null)
  const scrollModeFrameRef = useRef<number | null>(null)
  const fastScrollFrameRef = useRef<number | null>(null)
  const scrollEndTimeoutRef = useRef<number | null>(null)
  const idleTimeoutRef = useRef<number | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const scheduleMeasurementFlushRef = useRef<() => void>(() => undefined)
  const processRenderQueueRef = useRef<() => void>(() => undefined)
  const measuredElementsRef = useRef(new Map<string, HTMLDivElement>())
  const measureRefsRef = useRef(
    new Map<string, (node: HTMLDivElement | null) => void>(),
  )
  const combinedMeasureRefsRef = useRef(
    new Map<string, (node: HTMLDivElement | null) => void>(),
  )
  const renderWindowRef = useRef<RenderWindow | null>(null)
  const visibleItemsRef = useRef<DemoItem[]>([])
  const previousScrollRef = useRef({ top: 0, time: 0 })
  const lastScrollTimeRef = useRef(0)
  const scrollModeRef = useRef<ScrollMode>("idle")
  const lowEndModeRef = useRef(false)
  const renderQueueSizeRef = useRef(0)
  const hydratedCountRef = useRef(0)
  const heavyBlankFrameCountRef = useRef(0)
  const heavyPlaceholderOnlyFrameCountRef = useRef(0)
  const frameSamplesRef = useRef<number[]>([])
  const latestScrollRef = useRef({
    direction: "none" as ScrollDirection,
    top: 0,
    velocity: 0,
  })
  const pendingRestoreRef = useRef<PendingAnchorRestore | null>(null)
  const prependCursorRef = useRef(-1)
  const appendCursorRef = useRef(scenario.count)

  if (!runtimeRef.current) {
    runtimeRef.current = createRuntime(0, scenario.count, scenario.id)
  }

  const runtime = runtimeRef.current
  const [dataVersion, setDataVersion] = useState(0)
  const [renderWindow, setRenderWindow] = useState<RenderWindow>(() =>
    computeRenderWindow(runtime, 0, FALLBACK_VIEWPORT_HEIGHT, 0, "none"),
  )
  const [prependViewportShift, setPrependViewportShift] = useState(0)
  const [resizeViewportShift, setResizeViewportShift] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [isFastScrolling, setIsFastScrolling] = useState(false)
  const [measurementQueueSize, setMeasurementQueueSize] = useState(0)
  const [measurementCount, setMeasurementCount] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [, setRenderVersion] = useState(0)
  const [scrollMode, setScrollMode] = useState<ScrollMode>("idle")
  const [renderQueueSize, setRenderQueueSize] = useState(0)
  const [hydratedCount, setHydratedCount] = useState(0)
  const [heavyBlankFrameCount, setHeavyBlankFrameCount] = useState(0)
  const [
    heavyPlaceholderOnlyFrameCount,
    setHeavyPlaceholderOnlyFrameCount,
  ] = useState(0)
  const [p95FrameTime, setP95FrameTime] = useState(0)
  const [lastFrameTime, setLastFrameTime] = useState(0)
  const [lowEndMode, setLowEndMode] = useState(false)
  const [continuousMode, setContinuousMode] = useState<
    "append" | "prepend" | null
  >(null)
  const [copyStatus, setCopyStatus] = useState("Copy evidence JSON")
  const packageItems = useMemo(
    () => [...runtime.items],
    [dataVersion, runtime],
  )
  const getScrollElement = useCallback(() => scrollRootRef.current, [])
  const reactVirtualizer = useHeteroVirtualizer({
    items: packageItems,
    getScrollElement,
    getKey: (item) => item.id,
    getType: (item) => item.type,
    estimateHeight: (item) => item.height,
    adapters: demoAdapterRegistry,
    lowEnd: lowEndMode,
    overscan: {
      minOverscanPx: 600,
      maxOverscanPx: 3_600,
      horizonMs: 120,
      baseViewportRatio: 0.5,
    },
    scheduler: {
      lowEndBudgetMs: 4,
      normalBudgetMs: 8,
    },
  })
  const packageVirtualItemsById = useMemo(
    () =>
      new Map(
        reactVirtualizer.virtualItems.map((item) => [item.id, item] as const),
    ),
    [reactVirtualizer.virtualItems],
  )

  renderWindowRef.current = renderWindow

  const visibleItems = useMemo(
    () =>
      runtime.items.slice(renderWindow.startIndex, renderWindow.endIndex + 1),
    [dataVersion, renderWindow, runtime],
  )
  visibleItemsRef.current = visibleItems
  lowEndModeRef.current = lowEndMode
  const imageStats = runtime.heightEstimator.getStats("image")

  const updateRenderWindow = useCallback(
    (
      scrollTop: number,
      viewportHeight: number,
      nextVelocity: number,
      direction: ScrollDirection,
    ) => {
      setRenderWindow(
        computeRenderWindow(
          runtime,
          scrollTop,
          viewportHeight,
          nextVelocity,
          direction,
        ),
      )
      setVelocity(nextVelocity)
    },
    [runtime],
  )

  const updateScrollMode = useCallback((mode: ScrollMode): boolean => {
    if (scrollModeRef.current === mode) {
      return false
    }

    scrollModeRef.current = mode

    if (scrollModeFrameRef.current === null) {
      scrollModeFrameRef.current = requestAnimationFrame(() => {
        scrollModeFrameRef.current = null
        const nextMode = scrollModeRef.current
        setScrollMode((currentMode) =>
          currentMode === nextMode ? currentMode : nextMode,
        )
      })
    }

    return true
  }, [])

  const updateRenderQueueSize = useCallback((size: number) => {
    if (renderQueueSizeRef.current === size) {
      return
    }

    renderQueueSizeRef.current = size
    setRenderQueueSize(size)
  }, [])

  const updateHydratedCount = useCallback((count: number) => {
    if (hydratedCountRef.current === count) {
      return
    }

    hydratedCountRef.current = count
    setHydratedCount(count)
  }, [])

  const recordBlankFrameDiagnostics = useCallback(() => {
    const visible = visibleItemsRef.current

    if (visible.length === 0) {
      heavyBlankFrameCountRef.current += 1
      setHeavyBlankFrameCount(heavyBlankFrameCountRef.current)
      return
    }

    const heavyVisibleItems = visible.filter((item) =>
      isHeavyItemType(item.type),
    )

    if (
      heavyVisibleItems.length > 0 &&
      heavyVisibleItems.every(
        (item) => runtime.renderScheduler.getLevel(item.id) === 0,
      )
    ) {
      heavyPlaceholderOnlyFrameCountRef.current += 1
      setHeavyPlaceholderOnlyFrameCount(
        heavyPlaceholderOnlyFrameCountRef.current,
      )
    }
  }, [runtime])

  const scheduleRenderFrame = useCallback(() => {
    if (renderFrameRef.current !== null) {
      return
    }

    renderFrameRef.current = requestAnimationFrame(() => {
      processRenderQueueRef.current()
    })
  }, [])

  const enqueueVisibleRenderTasks = useCallback(() => {
    const scrollRoot = scrollRootRef.current

    if (!scrollRoot) {
      return
    }

    const viewportStart = scrollRoot.scrollTop
    const viewportEnd = viewportStart + scrollRoot.clientHeight
    const viewportCenter = (viewportStart + viewportEnd) / 2
    const direction = latestScrollRef.current.direction
    const anchor = runtime.anchorManager.captureAnchor(viewportStart)

    runtime.renderScheduler.clearTasks()

    for (const item of visibleItemsRef.current) {
      const itemOffset = runtime.heightTree.offsetOf(item.id)

      if (itemOffset === undefined) {
        continue
      }

      const adapter = demoAdapterRegistry.get(item.type)
      const renderCost = demoAdapterRegistry.estimateRenderCost(
        item.type,
        item,
        3,
      )
      const itemEnd = itemOffset + item.height
      const isVisible = itemEnd > viewportStart && itemOffset < viewportEnd
      const distanceFromViewport = isVisible
        ? 0
        : itemEnd <= viewportStart
          ? viewportStart - itemEnd
          : itemOffset - viewportEnd
      const isAhead =
        direction === "down"
          ? itemOffset >= viewportCenter
          : direction === "up"
            ? itemEnd <= viewportCenter
            : false

      runtime.renderScheduler.enqueue({
        itemId: item.id,
        targetLevel: 3,
        priority: computeRenderPriority({
          distanceFromViewport,
          isAhead,
          isNearAnchor: anchor?.itemId === item.id,
          isVisible,
          renderCost,
        }),
        estimatedCost: renderCost,
        heavy: adapter.canHydrateDuringScroll === false,
      })
    }

    scheduleRenderFrame()
  }, [runtime, scheduleRenderFrame])

  const processRenderQueue = useCallback(() => {
    renderFrameRef.current = null

    const frameStartedAt = performance.now()
    const result = runtime.renderScheduler.process({
      apply: () => undefined,
      lowEnd: lowEndModeRef.current,
      mode: scrollModeRef.current,
    })
    const frameTime = performance.now() - frameStartedAt
    const samples = frameSamplesRef.current

    samples.push(frameTime)

    if (samples.length > FRAME_SAMPLE_LIMIT) {
      samples.shift()
    }

    setLastFrameTime(frameTime)
    setP95FrameTime(percentile(samples, 0.95))
    updateRenderQueueSize(result.remainingCount)
    updateHydratedCount(
      visibleItemsRef.current.filter(
        (item) => runtime.renderScheduler.getLevel(item.id) >= 2,
      ).length,
    )
    recordBlankFrameDiagnostics()

    if (result.appliedCount > 0) {
      setRenderVersion((version) => version + 1)
      scheduleRenderFrame()
    }
  }, [
    runtime,
    scheduleRenderFrame,
    updateHydratedCount,
    recordBlankFrameDiagnostics,
    updateRenderQueueSize,
  ])
  processRenderQueueRef.current = processRenderQueue

  const flushMeasurements = useCallback(() => {
    measurementFrameRef.current = null

    const scrollRoot = scrollRootRef.current

    if (
      !scrollRoot ||
      runtime.measurementQueue.size === 0 ||
      pendingRestoreRef.current
    ) {
      return
    }

    const anchor = runtime.anchorManager.captureAnchor(scrollRoot.scrollTop)
    const anchorOffsetBefore = anchor
      ? runtime.heightTree.offsetOf(anchor.itemId)
      : undefined
    let correctedCount = 0

    runtime.measurementQueue.flush(
      (measurement) => {
        const itemIndex = runtime.indexById.get(measurement.id)

        if (itemIndex === undefined) {
          return
        }

        const item = runtime.items[itemIndex]

        if (Math.abs(item.height - measurement.height) < 0.5) {
          return
        }

        runtime.heightEstimator.update(
          item.type,
          item.height,
          measurement.height,
        )
        item.height = measurement.height
        runtime.heightTree.updateHeight(item.id, measurement.height)
        correctedCount += 1
      },
      { budgetMs: MEASUREMENT_BUDGET_MS },
    )

    setMeasurementQueueSize(runtime.measurementQueue.size)

    if (correctedCount === 0) {
      if (runtime.measurementQueue.size > 0) {
        scheduleMeasurementFlushRef.current()
      }

      return
    }

    setMeasurementCount((count) => count + correctedCount)

    if (anchor && anchorOffsetBefore !== undefined) {
      const targetScrollTop = runtime.anchorManager.restoreAnchor(anchor)

      if (targetScrollTop !== undefined) {
        pendingRestoreRef.current = {
          anchor,
          anchorOffsetBefore,
          reason: "measurement",
          scrollTopBefore: scrollRoot.scrollTop,
          targetScrollTop,
        }
      }
    }

    const nextScrollTop =
      pendingRestoreRef.current?.targetScrollTop ?? scrollRoot.scrollTop
    setRenderWindow(
      computeRenderWindow(
        runtime,
        nextScrollTop,
        scrollRoot.clientHeight,
        0,
        "none",
      ),
    )
    setVelocity(0)
    setDataVersion((version) => version + 1)
  }, [runtime])

  const scheduleMeasurementFlush = useCallback(() => {
    if (measurementFrameRef.current !== null) {
      return
    }

    measurementFrameRef.current = requestAnimationFrame(flushMeasurements)
  }, [flushMeasurements])
  scheduleMeasurementFlushRef.current = scheduleMeasurementFlush

  const scheduleRangeUpdate = useCallback(() => {
    if (rangeFrameRef.current !== null) {
      return
    }

    rangeFrameRef.current = requestAnimationFrame(() => {
      rangeFrameRef.current = null

      const scrollRoot = scrollRootRef.current

      if (!scrollRoot) {
        return
      }

      const latest = latestScrollRef.current
      updateRenderWindow(
        latest.top,
        scrollRoot.clientHeight,
        latest.velocity,
        latest.direction,
      )
    })
  }, [updateRenderWindow])

  const handleScroll = useCallback(() => {
    const scrollRoot = scrollRootRef.current

    if (!scrollRoot) {
      return
    }

    const now = performance.now()
    const previous = previousScrollRef.current
    const delta = scrollRoot.scrollTop - previous.top
    const elapsed = Math.max(now - previous.time, 1)
    const nextVelocity = Math.abs(delta) / elapsed
    const direction: ScrollDirection =
      delta > 0 ? "down" : delta < 0 ? "up" : "none"
    const nextMode = computeScrollMode({
      elapsedSinceScrollMs: 0,
      isScrolling: true,
      velocity: nextVelocity,
    })

    previousScrollRef.current = {
      top: scrollRoot.scrollTop,
      time: now,
    }
    lastScrollTimeRef.current = now
    latestScrollRef.current = {
      direction,
      top: scrollRoot.scrollTop,
      velocity: nextVelocity,
    }
    if (updateScrollMode(nextMode)) {
      enqueueVisibleRenderTasks()
    }

    if (scrollEndTimeoutRef.current !== null) {
      window.clearTimeout(scrollEndTimeoutRef.current)
    }

    if (idleTimeoutRef.current !== null) {
      window.clearTimeout(idleTimeoutRef.current)
    }

    scrollEndTimeoutRef.current = window.setTimeout(() => {
      updateScrollMode(
        computeScrollMode({
          elapsedSinceScrollMs:
            performance.now() - lastScrollTimeRef.current,
          isScrolling: false,
          velocity: 0,
        }),
      )
      enqueueVisibleRenderTasks()

      idleTimeoutRef.current = window.setTimeout(() => {
        updateScrollMode("idle")
        enqueueVisibleRenderTasks()
      }, SETTLING_DURATION_MS)
    }, SCROLL_END_DELAY_MS)

    scheduleRangeUpdate()
  }, [
    enqueueVisibleRenderTasks,
    scheduleRangeUpdate,
    updateScrollMode,
  ])

  const handlePrepend = useCallback(() => {
    const scrollRoot = scrollRootRef.current

    if (!scrollRoot || pendingRestoreRef.current) {
      return
    }

    stopFastScroll(fastScrollFrameRef, setIsFastScrolling)

    const anchor = runtime.anchorManager.captureAnchor(scrollRoot.scrollTop)

    if (!anchor) {
      return
    }

    const anchorOffsetBefore = runtime.heightTree.offsetOf(anchor.itemId)

    if (anchorOffsetBefore === undefined) {
      return
    }

    const firstId = prependCursorRef.current - PREPEND_ITEM_COUNT + 1
    const prependedItems = createPlaceholderItems(
      firstId,
      PREPEND_ITEM_COUNT,
      runtime.heightEstimator,
      imagesLoaded,
      scenario.id,
    )
    prependCursorRef.current = firstId - 1

    runtime.heightTree.prepend(prependedItems)
    runtime.items.unshift(...prependedItems)
    rebuildIndex(runtime)

    const targetScrollTop = runtime.anchorManager.restoreAnchor(anchor)

    if (targetScrollTop === undefined) {
      return
    }

    pendingRestoreRef.current = {
      anchor,
      anchorOffsetBefore,
      reason: "prepend",
      scrollTopBefore: scrollRoot.scrollTop,
      targetScrollTop,
    }
    setDataVersion((version) => version + 1)
  }, [imagesLoaded, runtime, scenario.id])

  const handleAppend = useCallback(() => {
    const appendedItems = createPlaceholderItems(
      appendCursorRef.current,
      APPEND_ITEM_COUNT,
      runtime.heightEstimator,
      imagesLoaded,
      scenario.id,
    )

    appendCursorRef.current += APPEND_ITEM_COUNT
    runtime.heightTree.append(appendedItems)
    runtime.items.push(...appendedItems)
    rebuildIndex(runtime)
    setDataVersion((version) => version + 1)
  }, [imagesLoaded, runtime, scenario.id])

  const handleLoadImages = useCallback(() => {
    if (imagesLoaded) {
      return
    }

    for (const item of runtime.items) {
      if (item.type === "image") {
        item.loaded = true
      }
    }

    setImagesLoaded(true)
    setDataVersion((version) => version + 1)
  }, [imagesLoaded, runtime])

  const handleHighVariance = useCallback(() => {
    for (let index = 0; index < runtime.items.length; index += 7) {
      const item = runtime.items[index]
      item.actualHeight += 80 + (index % 9) * 28
      item.loaded = true
    }

    setImagesLoaded(true)
    setDataVersion((version) => version + 1)
  }, [runtime])

  useEffect(() => {
    if (!continuousMode) {
      return
    }

    const interval = window.setInterval(() => {
      if (continuousMode === "append") {
        handleAppend()
      } else {
        handlePrepend()
      }
    }, 350)

    return () => window.clearInterval(interval)
  }, [continuousMode, handleAppend, handlePrepend])

  const handleFastScroll = useCallback(() => {
    const scrollRoot = scrollRootRef.current

    if (!scrollRoot) {
      return
    }

    if (fastScrollFrameRef.current !== null) {
      stopFastScroll(fastScrollFrameRef, setIsFastScrolling)
      return
    }

    setIsFastScrolling(true)
    let remainingFrames = FAST_SCROLL_FRAME_COUNT
    let direction = scrollRoot.scrollTop >= scrollRoot.scrollHeight / 2 ? -1 : 1

    const scrollFrame = () => {
      const currentRoot = scrollRootRef.current

      if (!currentRoot || remainingFrames <= 0) {
        stopFastScroll(fastScrollFrameRef, setIsFastScrolling)
        return
      }

      const maximumScrollTop =
        currentRoot.scrollHeight - currentRoot.clientHeight
      const nextScrollTop =
        currentRoot.scrollTop + direction * FAST_SCROLL_STEP_PX

      if (nextScrollTop <= 0 || nextScrollTop >= maximumScrollTop) {
        direction *= -1
      }

      currentRoot.scrollTop = clamp(nextScrollTop, 0, maximumScrollTop)
      remainingFrames -= 1
      fastScrollFrameRef.current = requestAnimationFrame(scrollFrame)
    }

    fastScrollFrameRef.current = requestAnimationFrame(scrollFrame)
  }, [])

  const getMeasureRef = useCallback((id: string) => {
    const existing = measureRefsRef.current.get(id)

    if (existing) {
      return existing
    }

    const measureRef = (node: HTMLDivElement | null) => {
      const previous = measuredElementsRef.current.get(id)

      if (previous) {
        resizeObserverRef.current?.unobserve(previous)
        measuredElementsRef.current.delete(id)
      }

      if (node) {
        measuredElementsRef.current.set(id, node)
        resizeObserverRef.current?.observe(node)
      }
    }

    measureRefsRef.current.set(id, measureRef)
    return measureRef
  }, [])

  const getCombinedMeasureRef = useCallback(
    (id: string) => {
      const existing = combinedMeasureRefsRef.current.get(id)

      if (existing) {
        return existing
      }

      const localMeasureRef = getMeasureRef(id)
      const packageMeasureRef = reactVirtualizer.measureElement(id)
      const measureRef = (node: HTMLDivElement | null) => {
        localMeasureRef(node)
        packageMeasureRef(node)
      }

      combinedMeasureRefsRef.current.set(id, measureRef)
      return measureRef
    },
    [getMeasureRef, reactVirtualizer.measureElement],
  )

  useLayoutEffect(() => {
    const pending = pendingRestoreRef.current
    const scrollRoot = scrollRootRef.current

    if (!pending || !scrollRoot) {
      return
    }

    scrollRoot.scrollTop = pending.targetScrollTop

    const anchorOffsetAfter = runtime.heightTree.offsetOf(pending.anchor.itemId)

    if (anchorOffsetAfter !== undefined) {
      const shift = measureViewportShift(
        {
          anchorOffset: pending.anchorOffsetBefore,
          scrollTop: pending.scrollTopBefore,
        },
        {
          anchorOffset: anchorOffsetAfter,
          scrollTop: scrollRoot.scrollTop,
        },
      )

      if (pending.reason === "measurement") {
        setResizeViewportShift(shift)
      } else {
        setPrependViewportShift(shift)
      }
    }

    previousScrollRef.current = {
      top: scrollRoot.scrollTop,
      time: performance.now(),
    }
    latestScrollRef.current = {
      direction: "none",
      top: scrollRoot.scrollTop,
      velocity: 0,
    }
    updateRenderWindow(
      scrollRoot.scrollTop,
      scrollRoot.clientHeight,
      0,
      "none",
    )
    pendingRestoreRef.current = null

    if (runtime.measurementQueue.size > 0) {
      scheduleMeasurementFlush()
    }
  }, [
    dataVersion,
    runtime,
    scheduleMeasurementFlush,
    updateRenderWindow,
  ])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const currentWindow = renderWindowRef.current
      const visibleCenter = currentWindow
        ? (currentWindow.startIndex + currentWindow.endIndex) / 2
        : 0

      for (const entry of entries) {
        const element = entry.target as HTMLDivElement
        const id = element.dataset.virtualId

        if (!id) {
          continue
        }

        const itemIndex = runtime.indexById.get(id)

        if (itemIndex === undefined) {
          continue
        }

        const item = runtime.items[itemIndex]
        const measurement = demoAdapterRegistry.get(item.type).measurement

        if (
          measurement.mode === "fixed" ||
          (measurement.mode === "observe-after-hydration" &&
            runtime.renderScheduler.getLevel(id) < 2)
        ) {
          continue
        }

        runtime.measurementQueue.enqueue({
          id,
          height:
            entry.borderBoxSize?.[0]?.blockSize ??
            element.getBoundingClientRect().height,
          priority: Math.max(1, 1_000 - Math.abs(itemIndex - visibleCenter)),
        })
      }

      setMeasurementQueueSize(runtime.measurementQueue.size)
      scheduleMeasurementFlush()
    })

    resizeObserverRef.current = observer

    for (const element of measuredElementsRef.current.values()) {
      observer.observe(element)
    }

    return () => {
      observer.disconnect()
      resizeObserverRef.current = null
    }
  }, [runtime, scheduleMeasurementFlush])

  useEffect(() => {
    enqueueVisibleRenderTasks()
  }, [
    dataVersion,
    enqueueVisibleRenderTasks,
    lowEndMode,
    renderWindow.endIndex,
    renderWindow.startIndex,
  ])

  useEffect(() => {
    const scrollRoot = scrollRootRef.current

    if (!scrollRoot) {
      return
    }

    previousScrollRef.current = {
      top: scrollRoot.scrollTop,
      time: performance.now(),
    }
    updateRenderWindow(
      scrollRoot.scrollTop,
      scrollRoot.clientHeight,
      0,
      "none",
    )

    const handleResize = () => {
      updateRenderWindow(
        scrollRoot.scrollTop,
        scrollRoot.clientHeight,
        latestScrollRef.current.velocity,
        latestScrollRef.current.direction,
      )
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)

      if (rangeFrameRef.current !== null) {
        cancelAnimationFrame(rangeFrameRef.current)
      }

      if (measurementFrameRef.current !== null) {
        cancelAnimationFrame(measurementFrameRef.current)
      }

      if (renderFrameRef.current !== null) {
        cancelAnimationFrame(renderFrameRef.current)
      }

      if (scrollModeFrameRef.current !== null) {
        cancelAnimationFrame(scrollModeFrameRef.current)
      }

      if (scrollEndTimeoutRef.current !== null) {
        window.clearTimeout(scrollEndTimeoutRef.current)
      }

      if (idleTimeoutRef.current !== null) {
        window.clearTimeout(idleTimeoutRef.current)
      }

      stopFastScroll(fastScrollFrameRef)
    }
  }, [updateRenderWindow])

  const viewportShift = Math.max(
    Math.abs(prependViewportShift),
    Math.abs(resizeViewportShift),
  )
  const evidenceResult = evaluateBenchmarkEvidence({
    cpuThrottle: lowEndMode ? "4x external / 4ms budget" : "none / 8ms budget",
    dataset: scenario.id,
    heavyBlankFrameCount,
    heavyPlaceholderOnlyFrameCount,
    library: "hetero-virtual",
    measuredAt: new Date().toISOString(),
    measurementQueue: measurementQueueSize,
    p95JsFrameTime: p95FrameTime,
    renderedItems: visibleItems.length,
    sampleCount: frameSamplesRef.current.length,
    scenario: scenario.label,
    scenarioId: scenario.id,
    totalItems: runtime.items.length,
    viewportShift,
  })

  const handleCopyEvidence = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(evidenceResult, null, 2),
    )
    setCopyStatus("Copied")
    window.setTimeout(() => setCopyStatus("Copy evidence JSON"), 1_500)
  }

  return (
    <section className="virtualizerPanel">
      <div className="virtualizerToolbar">
        <div>
          <p className="eyebrow">Live measurement virtualizer</p>
          <h2>{scenario.label}</h2>
          <p className="scenarioDescription">{scenario.description}</p>
        </div>
        <div className="virtualizerActions">
          <label className="scenarioSelect">
            <span>Dataset</span>
            <select
              value={scenario.id}
              onChange={(event) =>
                onScenarioChange(event.target.value as BenchmarkScenarioId)
              }
            >
              {BENCHMARK_SCENARIOS.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.shortLabel} ({candidate.count.toLocaleString()})
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleAppend}>
            Append {APPEND_ITEM_COUNT.toLocaleString()}
          </button>
          <button type="button" onClick={handlePrepend}>
            Prepend {PREPEND_ITEM_COUNT.toLocaleString()}
          </button>
          <button
            type="button"
            aria-pressed={continuousMode === "append"}
            onClick={() =>
              setContinuousMode((mode) =>
                mode === "append" ? null : "append",
              )
            }
          >
            {continuousMode === "append"
              ? "Stop continuous append"
              : "Continuous append"}
          </button>
          <button
            type="button"
            aria-pressed={continuousMode === "prepend"}
            onClick={() =>
              setContinuousMode((mode) =>
                mode === "prepend" ? null : "prepend",
              )
            }
          >
            {continuousMode === "prepend"
              ? "Stop continuous prepend"
              : "Continuous prepend"}
          </button>
          <button
            type="button"
            onClick={handleLoadImages}
            disabled={imagesLoaded}
          >
            {imagesLoaded ? "Delayed images loaded" : "Load delayed images"}
          </button>
          <button type="button" onClick={handleHighVariance}>
            Apply high variance
          </button>
          <button type="button" onClick={handleFastScroll}>
            {isFastScrolling ? "Stop fast scroll" : "Run fast scroll"}
          </button>
          <button
            type="button"
            aria-pressed={lowEndMode}
            onClick={() => setLowEndMode((enabled) => !enabled)}
          >
            {lowEndMode ? "Low-end budget: 4ms" : "Normal budget: 8ms"}
          </button>
        </div>
      </div>

      <div className="liveMetrics" aria-label="Virtualizer metrics">
        <Metric
          label="Total items"
          value={runtime.items.length.toLocaleString()}
        />
        <Metric label="Adapter types" value="5" />
        <Metric label="Rendered items" value={visibleItems.length.toString()} />
        <Metric
          label="Prepend shift"
          value={`${prependViewportShift.toFixed(2)} px`}
        />
        <Metric
          label="Resize shift"
          value={`${resizeViewportShift.toFixed(2)} px`}
        />
        <Metric
          label="Measurement queue"
          value={measurementQueueSize.toString()}
        />
        <Metric
          label="Measured corrections"
          value={measurementCount.toLocaleString()}
        />
        <Metric
          label="Image estimate MAE"
          value={`${imageStats.meanAbsoluteError.toFixed(1)} px`}
        />
        <Metric label="Scroll velocity" value={`${velocity.toFixed(2)} px/ms`} />
        <Metric label="Scroll mode" value={scrollMode} />
        <Metric
          label="Render queue"
          value={reactVirtualizer.renderQueueSize.toString()}
        />
        <Metric
          label="Hydrated visible"
          value={reactVirtualizer.virtualItems
            .filter((item) => item.level >= 2)
            .length.toString()}
        />
        <Metric
          label="Last scheduler frame"
          value={`${lastFrameTime.toFixed(2)} ms`}
        />
        <Metric label="p95 scheduler JS" value={`${p95FrameTime.toFixed(2)} ms`} />
        <Metric
          label="Blank frames"
          value={heavyBlankFrameCount.toString()}
        />
        <Metric
          label="Heavy placeholder-only"
          value={heavyPlaceholderOnlyFrameCount.toString()}
        />
      </div>
      <p className="schedulerNote">
        Scheduler-only timing. Use Chrome DevTools CPU throttling at 4x with
        the low-end 4ms budget for the Phase 6 external measurement.
      </p>

      <div className="evidencePanel" aria-label="Benchmark evidence">
        <div>
          <p className="eyebrow">Evidence snapshot</p>
          <strong>{scenario.label}</strong>
        </div>
        <EvidenceStatus
          label="p95 JS"
          passed={evidenceResult.frameTimePassed}
          value={`${p95FrameTime.toFixed(2)} ms / <= ${BENCHMARK_THRESHOLDS.p95JsFrameTime} ms`}
        />
        <EvidenceStatus
          label="Viewport shift"
          passed={evidenceResult.viewportShiftPassed}
          value={`${viewportShift.toFixed(2)} px / < ${BENCHMARK_THRESHOLDS.viewportShift} px`}
        />
        <EvidenceStatus
          label="Rendered / queue"
          passed={evidenceResult.measurementQueuePassed}
          value={`${visibleItems.length} / ${measurementQueueSize}`}
        />
        <EvidenceStatus
          label="Blank frames"
          passed={evidenceResult.heavyBlankFramePassed}
          value={`${heavyBlankFrameCount} / ${BENCHMARK_THRESHOLDS.heavyBlankFrameCount}`}
        />
        <button type="button" onClick={handleCopyEvidence}>
          {copyStatus}
        </button>
      </div>

      <div
        ref={scrollRootRef}
        className="placeholderScrollRoot"
        onScroll={handleScroll}
      >
        <div style={{ height: renderWindow.topSpacer }} aria-hidden="true" />
        {visibleItems.map((item) => {
          const packageVirtualItem = packageVirtualItemsById.get(item.id)
          const renderLevel =
            packageVirtualItem?.level ??
            runtime.renderScheduler.getLevel(item.id)
          const viewportWidth =
            scrollRootRef.current?.clientWidth ?? 960

          return (
            <div
              key={item.id}
              ref={getCombinedMeasureRef(item.id)}
              data-virtual-id={item.id}
              data-item-type={item.type}
              data-render-level={renderLevel}
              className={`placeholderItem placeholderItem--${item.tone}`}
              style={{ height: getRenderedHeight(item) }}
            >
              {packageVirtualItem
                ? reactVirtualizer.renderItem(packageVirtualItem)
                : demoAdapterRegistry.render(item.type, item, {
                    level: renderLevel,
                    viewportWidth,
                  })}
            </div>
          )
        })}
        <div style={{ height: renderWindow.bottomSpacer }} aria-hidden="true" />
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="liveMetric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EvidenceStatus({
  label,
  passed,
  value,
}: {
  label: string
  passed: boolean
  value: string
}) {
  return (
    <div className="evidenceStatus">
      <span>{label}</span>
      <strong>{value}</strong>
      <i data-passed={passed}>{passed ? "PASS" : "CHECK"}</i>
    </div>
  )
}

function createRuntime(
  firstIndex: number,
  count: number,
  scenarioId: BenchmarkScenarioId,
): Runtime {
  const heightEstimator = new HeightEstimator()
  const items = createPlaceholderItems(
    firstIndex,
    count,
    heightEstimator,
    false,
    scenarioId,
  )
  const heightTree = new ChunkedHeightTree({ chunkSize: 128 })
  heightTree.append(items)

  const runtime: Runtime = {
    items,
    indexById: new Map(),
    heightTree,
    anchorManager: new AnchorManager(heightTree),
    rangeCalculator: new RangeCalculator(heightTree, {
      minOverscanPx: 600,
      maxOverscanPx: 3_600,
      horizonMs: 120,
      baseViewportRatio: 0.5,
    }),
    measurementQueue: new MeasurementQueue(),
    heightEstimator,
    renderScheduler: new RenderScheduler({
      lowEndBudgetMs: 4,
      normalBudgetMs: 8,
    }),
  }

  rebuildIndex(runtime)
  return runtime
}

function createPlaceholderItems(
  firstIndex: number,
  count: number,
  heightEstimator: HeightEstimator,
  imagesLoaded: boolean,
  scenarioId: BenchmarkScenarioId,
): DemoItem[] {
  const tones: DemoItem["tone"][] = ["cyan", "violet", "amber", "blue"]

  return Array.from({ length: count }, (_, offset) => {
    const index = firstIndex + offset
    const normalized = Math.abs(index)
    const type = getScenarioItemType(scenarioId, normalized)
    const baseHeight = 52 + ((normalized * 37) % 76)
    const complexity = 1 + (normalized % 6)
    const variance = getScenarioHeightVariance(scenarioId, normalized)
    const item: DemoItem = {
      id: `placeholder-${index}`,
      height: 1,
      actualHeight:
        getActualHeight(type, baseHeight, complexity, normalized) + variance,
      baseHeight,
      label: `${getTypeLabel(type)} ${index.toLocaleString()}`,
      loaded: type !== "image" || imagesLoaded,
      tone: tones[normalized % tones.length],
      type,
      complexity,
    }
    const adapterHeight = demoAdapterRegistry.estimateHeight(type, item, {
      viewportWidth: 960,
    })

    item.height = heightEstimator.estimate(type, adapterHeight)
    return item
  })
}

function getRenderedHeight(item: DemoItem): number {
  return item.type !== "image" || item.loaded
    ? item.actualHeight
    : item.height
}

function getActualHeight(
  type: DemoItemType,
  baseHeight: number,
  complexity: number,
  index: number,
): number {
  if (type === "image") {
    return baseHeight + 160 + (index % 5) * 28
  }

  if (type === "chart") {
    return baseHeight + 120
  }

  if (type === "markdown") {
    return baseHeight + complexity * 20 + (index % 3) * 12
  }

  if (type === "tool-result") {
    return baseHeight + complexity * 14 + (index % 4) * 8
  }

  return Math.max(36, baseHeight + ((index * 13) % 17) - 8)
}

function getTypeLabel(type: DemoItemType): string {
  if (type === "tool-result") {
    return "Tool result"
  }

  return `${type[0].toUpperCase()}${type.slice(1)}`
}

function isHeavyItemType(type: DemoItemType): boolean {
  return type === "chart" || type === "image" || type === "tool-result"
}

function rebuildIndex(runtime: Runtime): void {
  runtime.indexById.clear()

  for (let index = 0; index < runtime.items.length; index += 1) {
    runtime.indexById.set(runtime.items[index].id, index)
  }
}

function computeRenderWindow(
  runtime: Runtime,
  scrollTop: number,
  viewportHeight: number,
  velocity: number,
  direction: ScrollDirection,
): RenderWindow {
  const range = runtime.rangeCalculator.computeVisibleRange({
    scrollTop,
    viewportHeight: Math.max(viewportHeight, 1),
    velocity,
    direction,
  })

  if (!range) {
    return {
      startIndex: 0,
      endIndex: -1,
      topSpacer: 0,
      bottomSpacer: 0,
    }
  }

  const startIndex = runtime.indexById.get(range.start.id)
  const endIndex = runtime.indexById.get(range.end.id)

  if (startIndex === undefined || endIndex === undefined) {
    throw new Error("Visible range item is missing from the demo index")
  }

  const topSpacer = range.start.offset
  const renderedHeight =
    range.end.offset + range.end.height - range.start.offset

  return {
    startIndex,
    endIndex,
    topSpacer,
    bottomSpacer: Math.max(
      0,
      runtime.heightTree.totalHeight() - topSpacer - renderedHeight,
    ),
  }
}

function stopFastScroll(
  frameRef: { current: number | null },
  setIsFastScrolling?: (value: boolean) => void,
): void {
  if (frameRef.current !== null) {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = null
  }

  setIsFastScrolling?.(false)
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * ratio) - 1,
  )

  return sorted[index]
}
