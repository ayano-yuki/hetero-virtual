# @hetero-virtual/react

React integration for `@hetero-virtual/core`.

このpackageはcoreの仮想スクロール機能をReact component/hookとして利用するための統合層です。DOM scroll state、subscription、measurement callback、React render item wrapperを扱います。

## Directory Structure

```txt
library/react/
  src/
    hooks/         React hooks and item components
    store/         Core objects and DOM stateを接続するstore
    index.ts       Public export surface
  tests/           React integration unit tests
```

## Import Rules

react package内部のimportはpackage-local aliasを使います。

```ts
import { VirtualizerStore } from "@react/store/VirtualizerStore"
```

`@react/*` は `library/react/src/*` を指します。hookやstoreの配置を責務別に保ち、深い相対パスを増やさないためのルールです。

core packageは公開境界としてpackage名からimportします。

```ts
import { computeScrollMode } from "@hetero-virtual/core"
```

## Responsibilities

- `hooks/useHeteroVirtualizer.tsx`: `useSyncExternalStore`でstore snapshotを購読し、virtual items、scroll handlers、measurement refをReactへ公開
- `hooks/HeteroVirtualItem`: itemごとのDOM measurementとabsolute positioningを担う軽量component
- `store/VirtualizerStore.ts`: coreのtree、range calculator、scheduler、measurement queueをDOM scroll stateと接続
- `index.ts`: external consumerが利用するhook、component、型だけをexport

## Tests

unit testは`tests/`に集約しています。storeのrange更新、measurement flush、scheduler連携など、React runtimeに寄りすぎない境界を中心に検証します。

```bash
pnpm --filter @hetero-virtual/react test
pnpm --filter @hetero-virtual/react typecheck
```

## Public Boundary

consumerは`@hetero-virtual/react`からimportします。`@react/hooks/*`や`@react/store/*`はpackage内部専用です。

```ts
import {
  HeteroVirtualItem,
  useHeteroVirtualizer,
} from "@hetero-virtual/react"
```
