export class FenwickTree {
  private readonly values: number[] = []
  private readonly tree: number[] = [0]

  constructor(values: readonly number[] = []) {
    for (const value of values) {
      this.push(value)
    }
  }

  get length(): number {
    return this.values.length
  }

  get(index: number): number {
    this.assertIndex(index)
    return this.values[index]
  }

  push(value: number): void {
    assertTreeValue(value)

    const treeIndex = this.tree.length
    const rangeStart = treeIndex - lowestSetBit(treeIndex)
    const inheritedSum =
      this.prefixSum(treeIndex - 1) - this.prefixSum(rangeStart)

    this.values.push(value)
    this.tree.push(inheritedSum + value)
  }

  update(index: number, value: number): void {
    this.assertIndex(index)
    assertTreeValue(value)

    const delta = value - this.values[index]
    this.values[index] = value

    for (
      let treeIndex = index + 1;
      treeIndex < this.tree.length;
      treeIndex += lowestSetBit(treeIndex)
    ) {
      this.tree[treeIndex] += delta
    }
  }

  prefixSum(endExclusive: number): number {
    if (!Number.isInteger(endExclusive)) {
      throw new TypeError("endExclusive must be an integer")
    }

    if (endExclusive < 0 || endExclusive > this.length) {
      throw new RangeError("endExclusive is outside the tree")
    }

    let sum = 0

    for (
      let treeIndex = endExclusive;
      treeIndex > 0;
      treeIndex -= lowestSetBit(treeIndex)
    ) {
      sum += this.tree[treeIndex]
    }

    return sum
  }

  total(): number {
    return this.prefixSum(this.length)
  }

  lowerBound(target: number): number | undefined {
    assertFiniteNumber(target)

    if (this.length === 0 || target > this.total()) {
      return undefined
    }

    if (target <= 0) {
      return 0
    }

    let index = 0
    let sum = 0
    let step = highestPowerOfTwoAtMost(this.length)

    while (step > 0) {
      const nextIndex = index + step

      if (
        nextIndex <= this.length &&
        sum + this.tree[nextIndex] < target
      ) {
        index = nextIndex
        sum += this.tree[nextIndex]
      }

      step = Math.floor(step / 2)
    }

    return Math.min(index, this.length - 1)
  }

  upperBound(offset: number): number | undefined {
    assertFiniteNumber(offset)

    if (this.length === 0) {
      return undefined
    }

    if (offset < 0) {
      return 0
    }

    let index = 0
    let sum = 0
    let step = highestPowerOfTwoAtMost(this.length)

    while (step > 0) {
      const nextIndex = index + step

      if (
        nextIndex <= this.length &&
        sum + this.tree[nextIndex] <= offset
      ) {
        index = nextIndex
        sum += this.tree[nextIndex]
      }

      step = Math.floor(step / 2)
    }

    return Math.min(index, this.length - 1)
  }

  private assertIndex(index: number): void {
    if (!Number.isInteger(index)) {
      throw new TypeError("index must be an integer")
    }

    if (index < 0 || index >= this.length) {
      throw new RangeError("index is outside the tree")
    }
  }
}

function assertFiniteNumber(value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError("value must be finite")
  }
}

function assertTreeValue(value: number): void {
  assertFiniteNumber(value)

  if (value < 0) {
    throw new RangeError("value must not be negative")
  }
}

function highestPowerOfTwoAtMost(value: number): number {
  if (value < 1) {
    return 0
  }

  return 2 ** Math.floor(Math.log2(value))
}

function lowestSetBit(value: number): number {
  return value & -value
}
