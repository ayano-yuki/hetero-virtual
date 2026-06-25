export {
  AdapterRegistry,
  getRenderLevelName,
  type AdapterLayoutContext,
  type AdapterRenderContext,
  type AdapterRenderCost,
  type AdapterRenderCostHints,
  type AdapterRenderLevels,
  type MeasurementBehavior,
  type MeasurementMode,
  type MeasurementTrigger,
  type VirtualItemAdapter,
} from "@core/adapter/Adapter"
export {
  AnchorManager,
  measureViewportShift,
  type Anchor,
  type ViewportAnchorSnapshot,
} from "@core/anchor/AnchorManager"
export {
  ChunkedHeightTree,
  type ChunkedHeightTreeOptions,
  type HeightTreeItem,
  type HeightTreeMatch,
} from "@core/structures/ChunkedHeightTree"
export { FenwickTree } from "@core/structures/FenwickTree"
export {
  HeightEstimator,
  type HeightEstimatorOptions,
  type HeightEstimatorStats,
} from "@core/estimator/HeightEstimator"
export {
  MeasurementQueue,
  type Measurement,
  type MeasurementFlushOptions,
} from "@core/measurement/MeasurementQueue"
export {
  RangeCalculator,
  type Overscan,
  type RangeCalculatorOptions,
  type ScrollDirection,
  type VisibleRange,
  type VisibleRangeInput,
} from "@core/range/RangeCalculator"
export {
  RenderScheduler,
  computeRenderPriority,
  computeScrollMode,
  getMaximumRenderLevel,
  type ProcessRenderQueueOptions,
  type RenderLevel,
  type RenderPriorityInput,
  type RenderProcessResult,
  type RenderSchedulerOptions,
  type RenderTask,
  type ScrollMode,
  type ScrollModeInput,
  type ScrollModeOptions,
} from "@core/scheduler/RenderScheduler"

export const CORE_PACKAGE_NAME = "@hetero-virtual/core"
