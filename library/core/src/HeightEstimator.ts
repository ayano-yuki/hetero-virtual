export type HeightEstimatorOptions = {
  learningRate?: number
}

export type HeightEstimatorStats = {
  bias: number
  count: number
  meanAbsoluteError: number
  variance: number
}

const DEFAULT_LEARNING_RATE = 0.05

export class HeightEstimator {
  private readonly learningRate: number
  private readonly statsByType = new Map<string, HeightEstimatorStats>()

  constructor(options: HeightEstimatorOptions = {}) {
    this.learningRate = options.learningRate ?? DEFAULT_LEARNING_RATE

    if (
      !Number.isFinite(this.learningRate) ||
      this.learningRate <= 0 ||
      this.learningRate > 1
    ) {
      throw new RangeError("learningRate must be greater than 0 and at most 1")
    }
  }

  estimate(type: string, baseHeight: number): number {
    assertType(type)
    assertPositiveFinite(baseHeight, "baseHeight")

    const stats = this.statsByType.get(type)
    return Math.max(1, baseHeight + (stats?.bias ?? 0))
  }

  update(
    type: string,
    predictedHeight: number,
    measuredHeight: number,
  ): HeightEstimatorStats {
    assertType(type)
    assertPositiveFinite(predictedHeight, "predictedHeight")
    assertPositiveFinite(measuredHeight, "measuredHeight")

    const previous = this.getStats(type)
    const error = measuredHeight - predictedHeight
    const count = previous.count + 1
    const meanAbsoluteError =
      previous.meanAbsoluteError +
      (Math.abs(error) - previous.meanAbsoluteError) / count
    const next = {
      bias: previous.bias + this.learningRate * error,
      count,
      meanAbsoluteError,
      variance:
        (1 - this.learningRate) * previous.variance +
        this.learningRate * error * error,
    }

    this.statsByType.set(type, next)
    return { ...next }
  }

  getStats(type: string): HeightEstimatorStats {
    assertType(type)

    const stats = this.statsByType.get(type)

    return stats
      ? { ...stats }
      : {
          bias: 0,
          count: 0,
          meanAbsoluteError: 0,
          variance: 0,
        }
  }
}

function assertType(type: string): void {
  if (type.length === 0) {
    throw new Error("type must not be empty")
  }
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`)
  }
}
