"use client"

import { useVirtualizer } from "@tanstack/react-virtual"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Virtuoso } from "react-virtuoso"
import {
  List,
  type ListImperativeAPI,
  type RowComponentProps,
} from "react-window"

import {
  BENCHMARK_THRESHOLDS,
  evaluateBenchmarkEvidence,
  type BenchmarkEvidence,
} from "./benchmarkScenarios"

type ComparisonLibrary =
  | "react-virtuoso"
  | "react-window"
  | "tanstack-virtual"

type ComparisonItem = {
  height: number
  id: string
  label: string
}

const COMPARISON_ITEM_COUNT = 100_000
const COMPARISON_ROW_HEIGHT = 56
const FAST_SCROLL_FRAME_COUNT = 90
const FAST_SCROLL_STEP_PX = 1_100
const FRAME_SAMPLE_LIMIT = 240

const comparisonLibraries: readonly {
  id: ComparisonLibrary
  label: string
  role: string
}[] = [
  {
    id: "react-virtuoso",
    label: "React Virtuoso",
    role: "React chat / complex feed comparison",
  },
  {
    id: "react-window",
    label: "react-window",
    role: "React fixed/simple list comparison",
  },
  {
    id: "tanstack-virtual",
    label: "TanStack Virtual",
    role: "Framework-agnostic/headless comparison",
  },
]

export function VirtualizerComparison() {
  const [library, setLibrary] =
    useState<ComparisonLibrary>("react-virtuoso")

  return (
    <section className="virtualizerPanel" aria-label="Library comparison">
      <div className="virtualizerToolbar">
        <div>
          <p className="eyebrow">Library comparison</p>
          <h2>Plain text fast scroll</h2>
          <p className="scenarioDescription">
            Compare existing React virtualizers under the same browser and CPU
            throttle conditions as the hetero-virtual evidence.
          </p>
        </div>
        <div className="virtualizerActions">
          <label className="scenarioSelect">
            <span>Library</span>
            <select
              value={library}
              onChange={(event) =>
                setLibrary(event.target.value as ComparisonLibrary)
              }
            >
              {comparisonLibraries.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <ComparisonRunner key={library} library={library} />
    </section>
  )
}

function ComparisonRunner({ library }: { library: ComparisonLibrary }) {
  const items = useMemo(createComparisonItems, [])
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const virtuosoScrollerRef = useRef<HTMLElement | null>(null)
  const reactWindowApiRef = useRef<ListImperativeAPI | null>(null)
  const fastScrollFrameRef = useRef<number | null>(null)
  const frameSamplesRef = useRef<number[]>([])
  const renderedItemsRef = useRef(0)
  const [copyStatus, setCopyStatus] = useState("Copy comparison evidence JSON")
  const [isFastScrolling, setIsFastScrolling] = useState(false)
  const [lastFrameTime, setLastFrameTime] = useState(0)
  const [lowEndMode, setLowEndMode] = useState(false)
  const [p95FrameTime, setP95FrameTime] = useState(0)
  const [renderedItems, setRenderedItems] = useState(0)
  const [blankFrameCount, setBlankFrameCount] = useState(0)
  const tanstackVirtualizer = useVirtualizer({
    count: items.length,
    estimateSize: () => COMPARISON_ROW_HEIGHT,
    getScrollElement: () => scrollRootRef.current,
    overscan: 12,
  })
  const tanstackVirtualItems = tanstackVirtualizer.getVirtualItems()
  const selected = comparisonLibraries.find(
    (candidate) => candidate.id === library,
  )
  const updateRenderedItems = useCallback((count: number) => {
    renderedItemsRef.current = count
    setRenderedItems(count)
  }, [])

  useEffect(() => {
    if (library === "tanstack-virtual") {
      updateRenderedItems(tanstackVirtualItems.length)
    }
  }, [library, tanstackVirtualItems.length, updateRenderedItems])

  useEffect(
    () => () => {
      if (fastScrollFrameRef.current !== null) {
        cancelAnimationFrame(fastScrollFrameRef.current)
      }
    },
    [],
  )

  const getScrollElement = useCallback((): HTMLElement | null => {
    if (library === "react-virtuoso") {
      return virtuosoScrollerRef.current
    }

    if (library === "react-window") {
      return reactWindowApiRef.current?.element ?? null
    }

    return scrollRootRef.current
  }, [library])

  const resetFrameEvidence = useCallback(() => {
    frameSamplesRef.current = []
    setBlankFrameCount(0)
    setLastFrameTime(0)
    setP95FrameTime(0)
  }, [])

  const handleFastScroll = useCallback(() => {
    const scrollElement = getScrollElement()

    if (!scrollElement) {
      return
    }

    if (fastScrollFrameRef.current !== null) {
      cancelAnimationFrame(fastScrollFrameRef.current)
      fastScrollFrameRef.current = null
      setIsFastScrolling(false)
      return
    }

    resetFrameEvidence()
    setIsFastScrolling(true)
    let remainingFrames = FAST_SCROLL_FRAME_COUNT
    let direction =
      scrollElement.scrollTop >= scrollElement.scrollHeight / 2 ? -1 : 1

    const scrollFrame = () => {
      const currentElement = getScrollElement()
      const frameStartedAt = performance.now()

      if (!currentElement || remainingFrames <= 0) {
        fastScrollFrameRef.current = null
        setIsFastScrolling(false)
        return
      }

      const maximumScrollTop =
        currentElement.scrollHeight - currentElement.clientHeight
      const nextScrollTop =
        currentElement.scrollTop + direction * FAST_SCROLL_STEP_PX

      if (nextScrollTop <= 0 || nextScrollTop >= maximumScrollTop) {
        direction *= -1
      }

      currentElement.scrollTop = clamp(nextScrollTop, 0, maximumScrollTop)

      if (renderedItemsRef.current === 0) {
        setBlankFrameCount((count) => count + 1)
      }

      const frameTime = performance.now() - frameStartedAt
      const samples = frameSamplesRef.current
      samples.push(frameTime)

      if (samples.length > FRAME_SAMPLE_LIMIT) {
        samples.shift()
      }

      setLastFrameTime(frameTime)
      setP95FrameTime(percentile(samples, 0.95))
      remainingFrames -= 1
      fastScrollFrameRef.current = requestAnimationFrame(scrollFrame)
    }

    fastScrollFrameRef.current = requestAnimationFrame(scrollFrame)
  }, [getScrollElement, resetFrameEvidence])

  const evidence = evaluateBenchmarkEvidence({
    cpuThrottle: lowEndMode ? "4x external / 4ms budget" : "none / 8ms budget",
    dataset: "plain-text-100k",
    heavyBlankFrameCount: blankFrameCount,
    heavyPlaceholderOnlyFrameCount: 0,
    library,
    measuredAt: new Date().toISOString(),
    measurementQueue: 0,
    p95JsFrameTime: p95FrameTime,
    renderedItems,
    sampleCount: frameSamplesRef.current.length,
    scenario: `${selected?.label ?? library} plain text fast scroll`,
    scenarioId: "plain-text-100k",
    totalItems: items.length,
    viewportShift: 0,
  } satisfies BenchmarkEvidence)

  const handleCopyEvidence = async () => {
    await navigator.clipboard.writeText(JSON.stringify(evidence, null, 2))
    setCopyStatus("Copied")
    window.setTimeout(
      () => setCopyStatus("Copy comparison evidence JSON"),
      1_500,
    )
  }

  return (
    <>
      <div className="liveMetrics" aria-label="Comparison metrics">
        <Metric label="Library" value={selected?.label ?? library} />
        <Metric label="Role" value={selected?.role ?? "Comparison"} />
        <Metric label="Total items" value={items.length.toLocaleString()} />
        <Metric label="Rendered items" value={renderedItems.toString()} />
        <Metric
          label="Frame samples"
          value={frameSamplesRef.current.length.toString()}
        />
        <Metric
          label="Last frame"
          value={`${lastFrameTime.toFixed(2)} ms`}
        />
        <Metric label="p95 JS" value={`${p95FrameTime.toFixed(2)} ms`} />
        <Metric label="Blank frames" value={blankFrameCount.toString()} />
      </div>

      <div className="evidencePanel" aria-label="Comparison evidence">
        <div>
          <p className="eyebrow">Comparison evidence</p>
          <strong>{selected?.label ?? library}</strong>
        </div>
        <EvidenceStatus
          label="p95 JS"
          passed={evidence.frameTimePassed}
          value={`${p95FrameTime.toFixed(2)} ms / ${frameSamplesRef.current.length} samples / <= ${BENCHMARK_THRESHOLDS.p95JsFrameTime} ms`}
        />
        <EvidenceStatus
          label="Queue"
          passed={evidence.measurementQueuePassed}
          value="0 / 0"
        />
        <EvidenceStatus
          label="Blank frames"
          passed={evidence.heavyBlankFramePassed}
          value={`${blankFrameCount} / ${BENCHMARK_THRESHOLDS.heavyBlankFrameCount}`}
        />
        <button type="button" onClick={handleCopyEvidence}>
          {copyStatus}
        </button>
      </div>

      <div className="virtualizerActions comparisonActions">
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

      {library === "react-virtuoso" ? (
        <Virtuoso
          className="placeholderScrollRoot"
          computeItemKey={(index) => items[index].id}
          data={items}
          defaultItemHeight={COMPARISON_ROW_HEIGHT}
          fixedItemHeight={COMPARISON_ROW_HEIGHT}
          increaseViewportBy={720}
          itemContent={(_, item) => <ComparisonRow item={item} />}
          itemsRendered={(rendered) => updateRenderedItems(rendered.length)}
          scrollerRef={(element) => {
            virtuosoScrollerRef.current =
              element instanceof HTMLElement ? element : null
          }}
        />
      ) : null}

      {library === "react-window" ? (
        <List
          className="placeholderScrollRoot"
          defaultHeight={680}
          listRef={(api) => {
            reactWindowApiRef.current = api
          }}
          onRowsRendered={(_, allRows) =>
            updateRenderedItems(allRows.stopIndex - allRows.startIndex + 1)
          }
          overscanCount={12}
          rowComponent={ReactWindowRow}
          rowCount={items.length}
          rowHeight={COMPARISON_ROW_HEIGHT}
          rowProps={{ items }}
        />
      ) : null}

      {library === "tanstack-virtual" ? (
        <div ref={scrollRootRef} className="placeholderScrollRoot">
          <div
            style={{
              height: tanstackVirtualizer.getTotalSize(),
              position: "relative",
            }}
          >
            {tanstackVirtualItems.map((virtualItem) => (
              <div
                className="comparisonVirtualRow"
                data-index={virtualItem.index}
                key={virtualItem.key}
                ref={tanstackVirtualizer.measureElement}
                style={{
                  height: virtualItem.size,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ComparisonRow item={items[virtualItem.index]} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}

function ReactWindowRow({
  ariaAttributes,
  index,
  items,
  style,
}: RowComponentProps<{ items: ComparisonItem[] }>) {
  return (
    <div
      aria-posinset={ariaAttributes["aria-posinset"]}
      aria-setsize={ariaAttributes["aria-setsize"]}
      className="comparisonVirtualRow"
      role={ariaAttributes.role}
      style={style}
    >
      <ComparisonRow item={items[index]} />
    </div>
  )
}

function ComparisonRow({ item }: { item: ComparisonItem }) {
  return (
    <div className="placeholderItem placeholderItem--cyan">
      <span>{item.label}</span>
      <code>{item.height}px / comparison</code>
    </div>
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

function createComparisonItems(): ComparisonItem[] {
  return Array.from({ length: COMPARISON_ITEM_COUNT }, (_, index) => ({
    height: COMPARISON_ROW_HEIGHT,
    id: `comparison-${index}`,
    label: `Comparison row ${index.toLocaleString()}`,
  }))
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
