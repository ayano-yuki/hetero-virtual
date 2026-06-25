export type Measurement = {
  id: string
  height: number
  priority: number
}

export type MeasurementFlushOptions = {
  budgetMs: number
  now?: () => number
}

type QueuedMeasurement = Measurement & {
  sequence: number
}

export class MeasurementQueue {
  private readonly pending = new Map<string, QueuedMeasurement>()
  private nextSequence = 0

  get size(): number {
    return this.pending.size
  }

  enqueue(measurement: Measurement): void {
    assertMeasurement(measurement)

    this.pending.set(measurement.id, {
      ...measurement,
      sequence: this.nextSequence,
    })
    this.nextSequence += 1
  }

  clear(): void {
    this.pending.clear()
  }

  flush(
    process: (measurement: Measurement) => void,
    options: MeasurementFlushOptions,
  ): number {
    assertNonNegativeFinite(options.budgetMs, "budgetMs")

    const now = options.now ?? performance.now.bind(performance)
    const startedAt = now()
    const measurements = [...this.pending.values()].sort(
      (left, right) =>
        right.priority - left.priority || left.sequence - right.sequence,
    )
    let processedCount = 0

    for (const measurement of measurements) {
      if (now() - startedAt >= options.budgetMs) {
        break
      }

      if (!this.pending.delete(measurement.id)) {
        continue
      }

      process({
        id: measurement.id,
        height: measurement.height,
        priority: measurement.priority,
      })
      processedCount += 1
    }

    return processedCount
  }
}

function assertMeasurement(measurement: Measurement): void {
  if (measurement.id.length === 0) {
    throw new Error("measurement id must not be empty")
  }

  if (!Number.isFinite(measurement.height) || measurement.height <= 0) {
    throw new RangeError("measurement height must be a positive finite number")
  }

  assertNonNegativeFinite(measurement.priority, "measurement priority")
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`)
  }
}
