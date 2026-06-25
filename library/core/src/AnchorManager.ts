import { ChunkedHeightTree } from "./ChunkedHeightTree"

export type Anchor = {
  itemId: string
  offsetWithinItem: number
}

export type ViewportAnchorSnapshot = {
  anchorOffset: number
  scrollTop: number
}

export class AnchorManager {
  constructor(private readonly heightTree: ChunkedHeightTree) {}

  captureAnchor(scrollTop: number): Anchor | undefined {
    assertFiniteNumber(scrollTop, "scrollTop")

    const item = this.heightTree.findItemAtOffset(scrollTop)

    if (!item) {
      return undefined
    }

    const normalizedScrollTop = clamp(
      scrollTop,
      0,
      this.heightTree.totalHeight(),
    )

    return {
      itemId: item.id,
      offsetWithinItem: normalizedScrollTop - item.offset,
    }
  }

  restoreAnchor(anchor: Anchor): number | undefined {
    assertAnchor(anchor)

    const itemOffset = this.heightTree.offsetOf(anchor.itemId)

    if (itemOffset === undefined) {
      return undefined
    }

    return itemOffset + anchor.offsetWithinItem
  }

  isBeforeAnchor(itemId: string, anchor: Anchor): boolean | undefined {
    assertAnchor(anchor)

    const itemOffset = this.heightTree.offsetOf(itemId)
    const anchorOffset = this.heightTree.offsetOf(anchor.itemId)

    if (itemOffset === undefined || anchorOffset === undefined) {
      return undefined
    }

    return itemOffset < anchorOffset
  }
}

export function measureViewportShift(
  before: ViewportAnchorSnapshot,
  after: ViewportAnchorSnapshot,
): number {
  assertSnapshot(before, "before")
  assertSnapshot(after, "after")

  const visualPositionBefore = before.anchorOffset - before.scrollTop
  const visualPositionAfter = after.anchorOffset - after.scrollTop

  return Math.abs(visualPositionAfter - visualPositionBefore)
}

function assertAnchor(anchor: Anchor): void {
  if (anchor.itemId.length === 0) {
    throw new Error("anchor itemId must not be empty")
  }

  assertFiniteNumber(anchor.offsetWithinItem, "anchor offsetWithinItem")

  if (anchor.offsetWithinItem < 0) {
    throw new RangeError("anchor offsetWithinItem must not be negative")
  }
}

function assertSnapshot(
  snapshot: ViewportAnchorSnapshot,
  name: string,
): void {
  assertFiniteNumber(snapshot.anchorOffset, `${name} anchorOffset`)
  assertFiniteNumber(snapshot.scrollTop, `${name} scrollTop`)
}

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
