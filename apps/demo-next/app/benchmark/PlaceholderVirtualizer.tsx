"use client"

import {
  AnchorManager,
  ChunkedHeightTree,
  RangeCalculator,
  measureViewportShift,
  type Anchor,
  type ScrollDirection,
} from "@hetero-virtual/core"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

const INITIAL_ITEM_COUNT = 50_000
const PREPEND_ITEM_COUNT = 1_000
const FALLBACK_VIEWPORT_HEIGHT = 640
const FAST_SCROLL_STEP_PX = 1_100
const FAST_SCROLL_FRAME_COUNT = 90

type PlaceholderTone = "cyan" | "violet" | "amber" | "blue"

type PlaceholderItem = {
  id: string
  height: number
  label: string
  tone: PlaceholderTone
}

type RenderWindow = {
  startIndex: number
  endIndex: number
  topSpacer: number
  bottomSpacer: number
}

type PendingAnchorRestore = {
  anchor: Anchor
  anchorOffsetBefore: number
  scrollTopBefore: number
  targetScrollTop: number
}

type Runtime = {
  items: PlaceholderItem[]
  indexById: Map<string, number>
  heightTree: ChunkedHeightTree
  anchorManager: AnchorManager
  rangeCalculator: RangeCalculator
}

export function PlaceholderVirtualizer() {
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<Runtime | null>(null)
  const frameRef = useRef<number | null>(null)
  const fastScrollFrameRef = useRef<number | null>(null)
  const previousScrollRef = useRef({ top: 0, time: 0 })
  const latestScrollRef = useRef({
    direction: "none" as ScrollDirection,
    top: 0,
    velocity: 0,
  })
  const pendingRestoreRef = useRef<PendingAnchorRestore | null>(null)
  const prependCursorRef = useRef(-1)

  if (!runtimeRef.current) {
    runtimeRef.current = createRuntime(createPlaceholderItems(0, INITIAL_ITEM_COUNT))
  }

  const runtime = runtimeRef.current
  const [dataVersion, setDataVersion] = useState(0)
  const [renderWindow, setRenderWindow] = useState<RenderWindow>(() =>
    computeRenderWindow(runtime, 0, FALLBACK_VIEWPORT_HEIGHT, 0, "none"),
  )
  const [viewportShift, setViewportShift] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [isFastScrolling, setIsFastScrolling] = useState(false)

  const visibleItems = useMemo(
    () =>
      runtime.items.slice(renderWindow.startIndex, renderWindow.endIndex + 1),
    [dataVersion, renderWindow, runtime],
  )

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

  const scheduleRangeUpdate = useCallback(() => {
    if (frameRef.current !== null) {
      return
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null

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

    previousScrollRef.current = {
      top: scrollRoot.scrollTop,
      time: now,
    }
    latestScrollRef.current = {
      direction,
      top: scrollRoot.scrollTop,
      velocity: nextVelocity,
    }
    scheduleRangeUpdate()
  }, [scheduleRangeUpdate])

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
      scrollTopBefore: scrollRoot.scrollTop,
      targetScrollTop,
    }
    setDataVersion((version) => version + 1)
  }, [runtime])

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

  useLayoutEffect(() => {
    const pending = pendingRestoreRef.current
    const scrollRoot = scrollRootRef.current

    if (!pending || !scrollRoot) {
      return
    }

    scrollRoot.scrollTop = pending.targetScrollTop

    const anchorOffsetAfter = runtime.heightTree.offsetOf(pending.anchor.itemId)

    if (anchorOffsetAfter !== undefined) {
      setViewportShift(
        measureViewportShift(
          {
            anchorOffset: pending.anchorOffsetBefore,
            scrollTop: pending.scrollTopBefore,
          },
          {
            anchorOffset: anchorOffsetAfter,
            scrollTop: scrollRoot.scrollTop,
          },
        ),
      )
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
  }, [dataVersion, runtime, updateRenderWindow])

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

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }

      stopFastScroll(fastScrollFrameRef)
    }
  }, [updateRenderWindow])

  return (
    <section className="virtualizerPanel">
      <div className="virtualizerToolbar">
        <div>
          <p className="eyebrow">Live placeholder virtualizer</p>
          <h2>50,000 variable-height rows</h2>
        </div>
        <div className="virtualizerActions">
          <button type="button" onClick={handlePrepend}>
            Prepend {PREPEND_ITEM_COUNT.toLocaleString()}
          </button>
          <button type="button" onClick={handleFastScroll}>
            {isFastScrolling ? "Stop fast scroll" : "Run fast scroll"}
          </button>
        </div>
      </div>

      <div className="liveMetrics" aria-label="Virtualizer metrics">
        <Metric
          label="Total items"
          value={runtime.items.length.toLocaleString()}
        />
        <Metric label="Rendered items" value={visibleItems.length.toString()} />
        <Metric label="Viewport shift" value={`${viewportShift.toFixed(2)} px`} />
        <Metric label="Scroll velocity" value={`${velocity.toFixed(2)} px/ms`} />
      </div>

      <div
        ref={scrollRootRef}
        className="placeholderScrollRoot"
        onScroll={handleScroll}
      >
        <div style={{ height: renderWindow.topSpacer }} aria-hidden="true" />
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className={`placeholderItem placeholderItem--${item.tone}`}
            style={{ height: item.height }}
          >
            <span>{item.label}</span>
            <code>{item.height}px</code>
          </div>
        ))}
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

function createRuntime(items: PlaceholderItem[]): Runtime {
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
  }

  rebuildIndex(runtime)
  return runtime
}

function createPlaceholderItems(
  firstIndex: number,
  count: number,
): PlaceholderItem[] {
  const tones: PlaceholderTone[] = ["cyan", "violet", "amber", "blue"]

  return Array.from({ length: count }, (_, offset) => {
    const index = firstIndex + offset
    const variance = deterministicVariance(index)
    const height = 44 + variance

    return {
      id: `placeholder-${index}`,
      height,
      label: `Placeholder ${index.toLocaleString()}`,
      tone: tones[Math.abs(index) % tones.length],
    }
  })
}

function deterministicVariance(index: number): number {
  const normalized = Math.abs(index)

  if (normalized % 97 === 0) {
    return 220
  }

  if (normalized % 23 === 0) {
    return 96
  }

  return (normalized * 37) % 52
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
