# @hetero-virtual/core

Framework-independent core for heterogeneous virtual scrolling.

このpackageはReactやDOMに依存しない仮想スクロールの中核です。高さ集計、表示範囲計算、prepend anchor維持、測定queue、render scheduling、adapter contractを扱います。

## Directory Structure

```txt
library/core/
  src/
    adapter/       Item typeごとのestimate/render/measurement contract
    anchor/        Prependや高さ補正後のscroll anchor維持
    estimator/     Dynamic heightの推定値と補正統計
    measurement/   DOM measurement結果をflushするqueue
    range/         Scroll位置、速度、方向からvisible rangeを算出
    scheduler/     Render levelとhydration taskの優先度制御
    structures/    Height treeやFenwick treeなどの低レベル構造
    index.ts       Public export surface
  tests/           Core unit tests
```

## Import Rules

core内部のimportはpackage-local aliasを使います。

```ts
import { ChunkedHeightTree } from "@core/structures/ChunkedHeightTree"
```

`@core/*` は `library/core/src/*` を指します。相対パスの階層移動を避け、責務別ディレクトリを移動しても参照が読みやすい状態を保つためです。

外部consumerや他packageはpackage名からimportします。

```ts
import { RangeCalculator } from "@hetero-virtual/core"
```

## Responsibilities

- `adapter`: heterogeneous item typeごとのheight estimate、render cost、measurement behavior、render level定義
- `anchor`: viewport内のanchor itemをcaptureし、prependやheight correction後のscrollTopを復元
- `estimator`: item typeごとの実測高さを元に推定値を更新
- `measurement`: measurement結果をdedupeし、まとめてflush
- `range`: pixel-based overscanとscroll velocityからvisible rangeを計算
- `scheduler`: heavy itemの段階的render/hydrationをbudget内で進める
- `structures`: dynamic height listを支える集計データ構造

## Tests

unit testは`tests/`に集約しています。実装ファイルと同じ責務名で、core behaviorをReact非依存で検証します。

```bash
pnpm --filter @hetero-virtual/core test
pnpm --filter @hetero-virtual/core typecheck
```

## Public Boundary

公開面は`src/index.ts`に集約します。新しい機能を追加する場合、内部moduleを直接consumerに参照させず、必要な型とAPIだけを`index.ts`からexportします。
