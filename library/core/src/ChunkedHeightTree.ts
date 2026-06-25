import { FenwickTree } from "./FenwickTree"

export type HeightTreeItem = {
  id: string
  height: number
}

export type HeightTreeMatch = HeightTreeItem & {
  offset: number
}

export type ChunkedHeightTreeOptions = {
  chunkSize?: number
}

type ItemLocation = {
  side: "front" | "back"
  chunkIndex: number
  itemIndex: number
}

type HeightChunk = {
  items: HeightTreeItem[]
  heights: FenwickTree
}

const DEFAULT_CHUNK_SIZE = 128

export class ChunkedHeightTree {
  private readonly chunkSize: number
  private readonly frontChunks: HeightChunk[] = []
  private readonly backChunks: HeightChunk[] = []
  private readonly frontHeights = new FenwickTree()
  private readonly backHeights = new FenwickTree()
  private readonly locations = new Map<string, ItemLocation>()
  private itemCount = 0

  constructor(options: ChunkedHeightTreeOptions = {}) {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE

    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new RangeError("chunkSize must be a positive integer")
    }

    this.chunkSize = chunkSize
  }

  get size(): number {
    return this.itemCount
  }

  append(items: readonly HeightTreeItem[]): void {
    this.assertInsertable(items)

    for (const itemGroup of chunkItems(items, this.chunkSize)) {
      const chunkIndex = this.backChunks.length
      const chunk = createChunk(itemGroup)

      this.backChunks.push(chunk)
      this.backHeights.push(chunk.heights.total())
      this.registerChunk("back", chunkIndex, chunk)
    }

    this.itemCount += items.length
  }

  prepend(items: readonly HeightTreeItem[]): void {
    this.assertInsertable(items)

    const chunks = chunkItems(items, this.chunkSize)

    for (let index = chunks.length - 1; index >= 0; index -= 1) {
      const chunkIndex = this.frontChunks.length
      const chunk = createChunk(chunks[index])

      this.frontChunks.push(chunk)
      this.frontHeights.push(chunk.heights.total())
      this.registerChunk("front", chunkIndex, chunk)
    }

    this.itemCount += items.length
  }

  updateHeight(id: string, height: number): void {
    assertHeight(height)

    const location = this.locations.get(id)

    if (!location) {
      throw new Error(`Unknown item id: ${id}`)
    }

    const chunks =
      location.side === "front" ? this.frontChunks : this.backChunks
    const chunkHeights =
      location.side === "front" ? this.frontHeights : this.backHeights
    const chunk = chunks[location.chunkIndex]

    chunk.heights.update(location.itemIndex, height)
    chunk.items[location.itemIndex] = { id, height }
    chunkHeights.update(location.chunkIndex, chunk.heights.total())
  }

  offsetOf(id: string): number | undefined {
    const location = this.locations.get(id)

    if (!location) {
      return undefined
    }

    const frontHeight = this.frontHeights.total()

    if (location.side === "front") {
      const chunk = this.frontChunks[location.chunkIndex]
      const chunkOffset =
        frontHeight - this.frontHeights.prefixSum(location.chunkIndex + 1)

      return chunkOffset + chunk.heights.prefixSum(location.itemIndex)
    }

    const chunk = this.backChunks[location.chunkIndex]
    const chunkOffset = this.backHeights.prefixSum(location.chunkIndex)

    return (
      frontHeight +
      chunkOffset +
      chunk.heights.prefixSum(location.itemIndex)
    )
  }

  findItemAtOffset(offset: number): HeightTreeMatch | undefined {
    if (!Number.isFinite(offset)) {
      throw new RangeError("offset must be finite")
    }

    if (this.size === 0) {
      return undefined
    }

    const totalHeight = this.totalHeight()
    const clampedOffset = Math.min(Math.max(offset, 0), totalHeight)
    const frontHeight = this.frontHeights.total()

    if (clampedOffset < frontHeight) {
      return this.findFrontItem(clampedOffset, frontHeight)
    }

    return this.findBackItem(clampedOffset - frontHeight, frontHeight)
  }

  totalHeight(): number {
    return this.frontHeights.total() + this.backHeights.total()
  }

  private findFrontItem(
    offset: number,
    frontHeight: number,
  ): HeightTreeMatch {
    const distanceFromBottom = frontHeight - offset
    const chunkIndex = this.frontHeights.lowerBound(distanceFromBottom)

    if (chunkIndex === undefined) {
      throw new Error("Unable to locate front chunk")
    }

    const chunk = this.frontChunks[chunkIndex]
    const chunkOffset =
      frontHeight - this.frontHeights.prefixSum(chunkIndex + 1)
    const itemOffset = offset - chunkOffset
    const itemIndex = chunk.heights.upperBound(itemOffset)

    if (itemIndex === undefined) {
      throw new Error("Unable to locate front item")
    }

    const item = chunk.items[itemIndex]

    return {
      ...item,
      offset: chunkOffset + chunk.heights.prefixSum(itemIndex),
    }
  }

  private findBackItem(
    offset: number,
    frontHeight: number,
  ): HeightTreeMatch {
    const chunkIndex = this.backHeights.upperBound(offset)

    if (chunkIndex === undefined) {
      const lastFrontChunkIndex = this.frontChunks.length - 1

      if (lastFrontChunkIndex < 0) {
        throw new Error("Unable to locate item")
      }

      const firstVisualFrontChunk = this.frontChunks[0]
      const itemIndex = firstVisualFrontChunk.items.length - 1
      const item = firstVisualFrontChunk.items[itemIndex]

      return {
        ...item,
        offset:
          frontHeight -
          firstVisualFrontChunk.heights.total() +
          firstVisualFrontChunk.heights.prefixSum(itemIndex),
      }
    }

    const chunk = this.backChunks[chunkIndex]
    const chunkOffset = this.backHeights.prefixSum(chunkIndex)
    const itemOffset = offset - chunkOffset
    const itemIndex = chunk.heights.upperBound(itemOffset)

    if (itemIndex === undefined) {
      throw new Error("Unable to locate back item")
    }

    const item = chunk.items[itemIndex]

    return {
      ...item,
      offset:
        frontHeight + chunkOffset + chunk.heights.prefixSum(itemIndex),
    }
  }

  private assertInsertable(items: readonly HeightTreeItem[]): void {
    const incomingIds = new Set<string>()

    for (const item of items) {
      if (item.id.length === 0) {
        throw new Error("Item id must not be empty")
      }

      assertHeight(item.height)

      if (this.locations.has(item.id) || incomingIds.has(item.id)) {
        throw new Error(`Duplicate item id: ${item.id}`)
      }

      incomingIds.add(item.id)
    }
  }

  private registerChunk(
    side: ItemLocation["side"],
    chunkIndex: number,
    chunk: HeightChunk,
  ): void {
    for (let itemIndex = 0; itemIndex < chunk.items.length; itemIndex += 1) {
      this.locations.set(chunk.items[itemIndex].id, {
        side,
        chunkIndex,
        itemIndex,
      })
    }
  }
}

function assertHeight(height: number): void {
  if (!Number.isFinite(height) || height <= 0) {
    throw new RangeError("height must be a positive finite number")
  }
}

function chunkItems(
  items: readonly HeightTreeItem[],
  chunkSize: number,
): HeightTreeItem[][] {
  const chunks: HeightTreeItem[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(
      items
        .slice(index, index + chunkSize)
        .map((item) => ({ id: item.id, height: item.height })),
    )
  }

  return chunks
}

function createChunk(items: HeightTreeItem[]): HeightChunk {
  return {
    items,
    heights: new FenwickTree(items.map((item) => item.height)),
  }
}
