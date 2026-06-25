"use client"

import {
  computeScrollMode,
  type AdapterRegistry,
  type RangeCalculatorOptions,
  type RenderSchedulerOptions,
  type ScrollDirection,
  type ScrollMode,
} from "@hetero-virtual/core"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefCallback,
} from "react"

import {
  VirtualizerStore,
  type VirtualItem,
  type VirtualizerSnapshot,
} from "@react/store/VirtualizerStore"

export type UseHeteroVirtualizerOptions<TItem> = {
  adapters: AdapterRegistry<TItem, ReactNode>
  estimateHeight: (item: TItem) => number
  getKey: (item: TItem) => string
  getScrollElement: () => HTMLElement | null
  getType: (item: TItem) => string
  items: readonly TItem[]
  lowEnd?: boolean
  overscan?: RangeCalculatorOptions
  scheduler?: RenderSchedulerOptions
}

export type HeteroVirtualizer<TItem> =
  VirtualizerSnapshot<TItem> & {
    measureElement: (id: string) => RefCallback<HTMLElement>
    renderItem: (item: VirtualItem<TItem>) => ReactNode
    store: VirtualizerStore<TItem, ReactNode>
  }

const SCROLL_END_DELAY_MS = 80
const SETTLING_DURATION_MS = 160

export function useHeteroVirtualizer<TItem>(
  options: UseHeteroVirtualizerOptions<TItem>,
): HeteroVirtualizer<TItem> {
  const storeRef = useRef<VirtualizerStore<TItem, ReactNode> | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const elementsRef = useRef(new Map<string, HTMLElement>())
  const measureRefsRef = useRef(
    new Map<string, RefCallback<HTMLElement>>(),
  )
  const viewportFrameRef = useRef<number | null>(null)
  const renderFrameRef = useRef<number | null>(null)
  const scrollEndTimeoutRef = useRef<number | null>(null)
  const idleTimeoutRef = useRef<number | null>(null)
  const previousScrollRef = useRef({ top: 0, time: 0 })
  const latestScrollRef = useRef({
    direction: "none" as ScrollDirection,
    top: 0,
    velocity: 0,
  })
  const scrollModeRef = useRef<ScrollMode>("idle")

  if (!storeRef.current) {
    storeRef.current = new VirtualizerStore(options)
  }

  const store = storeRef.current
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )

  useLayoutEffect(() => {
    store.syncItems(options.items)
  }, [options.items, store])

  useEffect(() => {
    store.setViewport({ lowEnd: options.lowEnd ?? false })
  }, [options.lowEnd, store])

  const scheduleRender = useCallback(() => {
    if (renderFrameRef.current !== null) {
      return
    }

    renderFrameRef.current = requestAnimationFrame(() => {
      renderFrameRef.current = null
      const changed = store.processRenderQueue()

      if (changed) {
        scheduleRender()
      }
    })
  }, [store])

  useEffect(() => {
    if (snapshot.renderQueueSize > 0) {
      scheduleRender()
    }
  }, [scheduleRender, snapshot])

  useEffect(() => {
    const scrollElement = options.getScrollElement()

    if (!scrollElement) {
      return
    }

    const updateViewport = () => {
      viewportFrameRef.current = null
      const latest = latestScrollRef.current

      store.setViewport({
        direction: latest.direction,
        height: Math.max(scrollElement.clientHeight, 1),
        mode: scrollModeRef.current,
        scrollTop: scrollElement.scrollTop,
        velocity: latest.velocity,
        width: Math.max(scrollElement.clientWidth, 1),
      })
    }

    const scheduleViewport = () => {
      if (viewportFrameRef.current === null) {
        viewportFrameRef.current = requestAnimationFrame(updateViewport)
      }
    }

    const setScrollMode = (mode: ScrollMode) => {
      if (scrollModeRef.current === mode) {
        return
      }

      scrollModeRef.current = mode
      scheduleViewport()
    }

    const handleScroll = () => {
      const now = performance.now()
      const previous = previousScrollRef.current
      const delta = scrollElement.scrollTop - previous.top
      const elapsed = Math.max(now - previous.time, 1)
      const velocity = Math.abs(delta) / elapsed
      const direction: ScrollDirection =
        delta > 0 ? "down" : delta < 0 ? "up" : "none"

      previousScrollRef.current = {
        top: scrollElement.scrollTop,
        time: now,
      }
      latestScrollRef.current = {
        direction,
        top: scrollElement.scrollTop,
        velocity,
      }
      setScrollMode(
        computeScrollMode({
          elapsedSinceScrollMs: 0,
          isScrolling: true,
          velocity,
        }),
      )

      if (scrollEndTimeoutRef.current !== null) {
        window.clearTimeout(scrollEndTimeoutRef.current)
      }

      if (idleTimeoutRef.current !== null) {
        window.clearTimeout(idleTimeoutRef.current)
      }

      scrollEndTimeoutRef.current = window.setTimeout(() => {
        setScrollMode("settling")
        idleTimeoutRef.current = window.setTimeout(() => {
          setScrollMode("idle")
        }, SETTLING_DURATION_MS)
      }, SCROLL_END_DELAY_MS)
      scheduleViewport()
    }

    previousScrollRef.current = {
      top: scrollElement.scrollTop,
      time: performance.now(),
    }
    latestScrollRef.current.top = scrollElement.scrollTop
    updateViewport()
    scrollElement.addEventListener("scroll", handleScroll, {
      passive: true,
    })
    window.addEventListener("resize", scheduleViewport)

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", scheduleViewport)

      if (viewportFrameRef.current !== null) {
        cancelAnimationFrame(viewportFrameRef.current)
      }

      if (renderFrameRef.current !== null) {
        cancelAnimationFrame(renderFrameRef.current)
      }

      if (scrollEndTimeoutRef.current !== null) {
        window.clearTimeout(scrollEndTimeoutRef.current)
      }

      if (idleTimeoutRef.current !== null) {
        window.clearTimeout(idleTimeoutRef.current)
      }
    }
  }, [options.getScrollElement, store])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement
        const id = element.dataset.virtualId

        if (!id) {
          continue
        }

        const behavior = store.getMeasurementMode(id)

        if (
          !behavior ||
          behavior.mode === "fixed" ||
          (behavior.mode === "observe-after-hydration" &&
            store.getLevel(id) < 2)
        ) {
          continue
        }

        store.measure(
          id,
          entry.borderBoxSize?.[0]?.blockSize ??
            element.getBoundingClientRect().height,
        )
      }
    })

    observerRef.current = observer

    for (const element of elementsRef.current.values()) {
      observer.observe(element)
    }

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [store])

  const measureElement = useCallback(
    (id: string): RefCallback<HTMLElement> => {
      const existing = measureRefsRef.current.get(id)

      if (existing) {
        return existing
      }

      const ref: RefCallback<HTMLElement> = (element) => {
        const previous = elementsRef.current.get(id)

        if (previous) {
          observerRef.current?.unobserve(previous)
          elementsRef.current.delete(id)
        }

        if (!element) {
          return
        }

        element.dataset.virtualId = id
        elementsRef.current.set(id, element)
        observerRef.current?.observe(element)
      }

      measureRefsRef.current.set(id, ref)
      return ref
    },
    [],
  )

  const renderItem = useCallback(
    (item: VirtualItem<TItem>) => store.render(item),
    [store],
  )

  return {
    ...snapshot,
    measureElement,
    renderItem,
    store,
  }
}

export type HeteroVirtualItemProps<TItem> = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  virtualItem: VirtualItem<TItem>
  virtualizer: Pick<
    HeteroVirtualizer<TItem>,
    "measureElement" | "renderItem"
  >
}

export function HeteroVirtualItem<TItem>({
  style,
  virtualItem,
  virtualizer,
  ...props
}: HeteroVirtualItemProps<TItem>) {
  const itemStyle: CSSProperties = {
    position: "absolute",
    width: "100%",
    transform: `translateY(${virtualItem.start}px)`,
    ...style,
  }

  return (
    <div
      {...props}
      data-render-level={virtualItem.level}
      data-virtual-id={virtualItem.id}
      ref={virtualizer.measureElement(virtualItem.id)}
      style={itemStyle}
    >
      {virtualizer.renderItem(virtualItem)}
    </div>
  )
}
