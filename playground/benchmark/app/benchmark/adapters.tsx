import {
  AdapterRegistry,
  type VirtualItemAdapter,
} from "@hetero-virtual/core"
import type { ReactNode } from "react"

export type DemoItemType =
  | "text"
  | "markdown"
  | "image"
  | "chart"
  | "tool-result"

export type DemoItem = {
  id: string
  height: number
  actualHeight: number
  baseHeight: number
  label: string
  loaded: boolean
  tone: "cyan" | "violet" | "amber" | "blue"
  type: DemoItemType
  complexity: number
}

const textAdapter: VirtualItemAdapter<DemoItem, ReactNode> = {
  type: "text",
  estimateHeight: (item) => item.baseHeight,
  renderCost: {
    placeholder: 0.25,
    shell: 0.5,
    light: 0.75,
    full: 1,
  },
  measurement: {
    mode: "observe",
    triggers: ["content", "resize"],
  },
  canHydrateDuringScroll: true,
  renderLevels: createRenderLevels("text"),
}

const markdownAdapter: VirtualItemAdapter<DemoItem, ReactNode> = {
  type: "markdown",
  estimateHeight: (item, context) =>
    item.baseHeight +
    item.complexity * 18 +
    Math.max(0, 720 - context.viewportWidth) * 0.04,
  renderCost: {
    placeholder: 0.5,
    shell: 1,
    light: (item) => 1.5 + item.complexity * 0.25,
    full: (item) => 3 + item.complexity * 0.75,
  },
  measurement: {
    mode: "observe",
    triggers: ["content", "resize"],
  },
  canHydrateDuringScroll: false,
  renderLevels: createRenderLevels("markdown"),
}

const imageAdapter: VirtualItemAdapter<DemoItem, ReactNode> = {
  type: "image",
  estimateHeight: (item) => item.baseHeight + 180,
  renderCost: {
    placeholder: 0.5,
    shell: 1,
    light: 2,
    full: 6,
  },
  measurement: {
    mode: "observe-after-hydration",
    triggers: ["load", "resize"],
  },
  canHydrateDuringScroll: false,
  renderLevels: createRenderLevels("image"),
}

const chartAdapter: VirtualItemAdapter<DemoItem, ReactNode> = {
  type: "chart",
  estimateHeight: (item) => item.baseHeight + 120,
  renderCost: {
    placeholder: 0.5,
    shell: 1,
    light: 2.5,
    full: (item) => 5 + item.complexity * 0.5,
  },
  measurement: {
    mode: "fixed",
  },
  canHydrateDuringScroll: false,
  renderLevels: createRenderLevels("chart"),
}

const toolResultAdapter: VirtualItemAdapter<DemoItem, ReactNode> = {
  type: "tool-result",
  estimateHeight: (item) => item.baseHeight + item.complexity * 12,
  renderCost: {
    placeholder: 0.5,
    shell: 1,
    light: 2,
    full: (item) => 3 + item.complexity * 0.4,
  },
  measurement: {
    mode: "observe",
    triggers: ["content"],
  },
  canHydrateDuringScroll: false,
  renderLevels: createRenderLevels("tool-result"),
}

export const demoAdapterRegistry = new AdapterRegistry<
  DemoItem,
  ReactNode
>([
  textAdapter,
  markdownAdapter,
  imageAdapter,
  chartAdapter,
  toolResultAdapter,
])

function createRenderLevels(
  type: DemoItemType,
): VirtualItemAdapter<DemoItem, ReactNode>["renderLevels"] {
  return {
    placeholder: () => (
      <>
        <span className="renderSkeleton" aria-label="Placeholder" />
        <code>{type} / placeholder</code>
      </>
    ),
    shell: () => (
      <>
        <span className="renderShell">
          <i />
          <i />
        </span>
        <code>{type} / shell</code>
      </>
    ),
    light: (item) => (
      <>
        <span>{item.label}</span>
        <code>
          {type} / light / {Math.round(item.height)}px
        </code>
      </>
    ),
    full: (item) => (
      <>
        <span className="renderFull">
          {item.label}
          {type === "image" ? <i className="imagePreview" /> : null}
          {type === "chart" ? <i className="chartPreview" /> : null}
          {type === "markdown" ? <b className="markdownPreview">md</b> : null}
          {type === "tool-result" ? (
            <b className="toolResultPreview">json</b>
          ) : null}
        </span>
        <code>
          {type} / full / {Math.round(item.height)}px
        </code>
      </>
    ),
  }
}
