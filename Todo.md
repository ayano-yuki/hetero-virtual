# Todo

Status: experimental prototype

このリポジトリは、最初から npm 公開を目指す完成ライブラリではなく、library-shaped prototype として進める。

最優先の目的は、きれいな API やパッケージングではなく、異種 DOM 混在でも低カクつきで双方向スクロールできることを数字で示すこと。

## North Star

- [ ] Next.js 上で 50,000 件の text / markdown / image / chart / tool-result 混在リストを双方向スクロールできる
- [x] prepend 時の viewport shift を 1px 未満に抑える
- [x] 高さ再測定時の viewport shift を 1px 未満に抑える
- [x] Chrome CPU throttle 4x で fast scroll 時の p95 JS frame time を 6ms 以下に抑える
- [x] heavy item を遅延しても viewport が空白化しない

## Phase 1: Demo-First Foundation

まずは demo を主戦場にする。API の綺麗さより、性能と anchor correctness の検証を優先する。

- [x] pnpm workspace を作る
- [x] Next.js demo app を作る
- [x] internal core package を作る
- [x] internal React package を作る
- [x] TypeScript 設定を共有する
- [x] Vitest を core 用に入れる
- [x] basic benchmark page を用意する

初期構成:

```txt
apps/
  demo-next/
packages/
  core/
  react/
README.md
Todo.md
pnpm-workspace.yaml
tsconfig.base.json
```

## Phase 2: Core Correctness

React に依存しない core を先に固める。ここでは DOM や hooks よりも、offset / height / anchor の正しさを見る。

- [x] `ChunkedHeightTree` を実装する
- [x] `FenwickTree` または同等の高さ集計構造を実装する
- [x] `append(items)` を実装する
- [x] `prepend(items)` を実装する
- [x] `updateHeight(id, height)` を実装する
- [x] `offsetOf(id)` を実装する
- [x] `findItemAtOffset(offset)` を実装する
- [x] `totalHeight()` を実装する
- [x] core unit tests を追加する
- [x] prepend 後も anchor item の visual position が保たれることをテストする

## Phase 3: Anchor And Range

prepend と高さ補正で viewport が飛ばないことを先に証明する。

- [x] `AnchorManager.captureAnchor()` を実装する
- [x] `AnchorManager.restoreAnchor()` を実装する
- [x] `AnchorManager.isBeforeAnchor()` を実装する
- [x] `RangeCalculator.computeVisibleRange()` を実装する
- [x] velocity / direction を使った pixel-based adaptive overscan を入れる
- [x] high-variance item heights のテストケースを作る
- [x] viewport shift を計測する helper を作る

## Phase 4: Placeholder Virtualizer

重いコンポーネントを入れる前に、placeholder だけで dynamic height / bidirectional scroll / anchor preservation を確認する。

- [x] demo で 50,000 件の placeholder list を表示する
- [x] scrollTop から visible range を計算して描画する
- [x] top / bottom spacer を使って総高さを表現する
- [x] prepend ボタンまたは自動 prepend シナリオを作る
- [x] prepend 後の viewport shift を画面上に表示する
- [x] fast wheel scrolling のシナリオを作る

## Phase 5: Measurement Pipeline

動的高さの再測定で viewport がズレないことを検証する。

- [x] `MeasurementQueue` を実装する
- [x] `ResizeObserver` integration を作る
- [x] height correction を height tree に反映する
- [x] height correction 後に anchor restore する
- [x] item type ごとの height estimator を更新する
- [x] delayed image height changes の demo case を作る
- [x] resize correction の viewport shift を 1px 未満に抑える

## Phase 6: Render Scheduler

heavy item を一気に描画せず、scroll 中の frame budget を守る。

- [x] `RenderScheduler` を実装する
- [x] render task queue を作る
- [x] priority scoring を作る
- [x] frame budget を設定する
- [x] scroll mode を定義する
- [x] progressive hydration を実装する
- [x] viewport 付近を優先して render level を上げる
- [x] CPU throttle 4x で p95 JS frame time を計測する

## Phase 7: Adapter Model

便利 API ではなく、異種 DOM の特性を明示する adapter contract を優先する。

- [x] adapter type を定義する
- [x] `estimateHeight` contract を定義する
- [x] `renderCost` または cost hints を定義する
- [x] render levels を定義する
- [x] measurement behavior を定義する
- [x] text adapter を作る
- [x] markdown adapter を作る
- [x] image adapter を作る
- [x] chart adapter を作る
- [x] tool-result adapter を作る

避ける API:

```tsx
<HeteroVirtual>
  {items.map(item => <AnyComponent />)}
</HeteroVirtual>
```

理由: height / cost / render levels / measurement behavior を渡せず、低カクつきの核である adapter model と矛盾するため。

## Phase 8: React Package

core は React 非依存のままにし、React 側は hooks と DOM integration に閉じる。

- [x] `useHeteroVirtualizer` を実装する
- [x] `measureElement` を実装する
- [x] `HeteroVirtualItem` を実装する
- [x] adapter rendering glue を作る
- [x] `useSyncExternalStore` で state subscription を組む
- [x] React-specific scheduling glue を作る
- [x] demo app から internal package として使う

## Phase 9: Benchmarks And Evidence

数字で示せないものは、まだ売りにしない。

- [x] 100,000 plain text items
- [x] 50,000 markdown/code mixed items
- [x] 20,000 image card mixed items
- [x] 10,000 chart/tool-result heavy items
- [x] continuous append
- [x] continuous prepend
- [x] fast wheel scrolling
- [x] mobile-like CPU throttling
- [x] delayed image height changes
- [x] high-variance item heights
- [x] p95 JS frame time を表示する
- [x] viewport shift px を表示する
- [x] rendered item count を表示する
- [x] measurement queue length を表示する

## Phase 10: Private Package Trial

npm 公開前に、自分の別プロジェクトで使って API の痛みを見る。

- [x] `@hetero-virtual/core` を workspace package として使う
- [x] `@hetero-virtual/react` を workspace package として使う
- [x] 別プロジェクトから GitHub dependency または workspace dependency で利用する
- [x] API が不自然な箇所を記録する
- [x] API を最低 2 回は壊して見直す

## Public Npm Publish Gate

以下を満たすまで npm publish はしない。

- [ ] 既存の類似ライブラリとの性能比較ができ、強みがある状態になっている
- [x] prepend anchor が安定している
- [x] resize correction が安定している
- [x] markdown / image / heavy item 混在 demo がある
- [x] CPU throttle で比較動画または数値がある
- [x] API が最低 2 回は壊れている
- [x] README に制約が明記されている
- [x] examples がある

## Not Now

初期には入れない。性能検証より先にやると、手触りの良い逃避になりやすい。

- [ ] changesets
- [ ] npm publish workflow
- [ ] storybook
- [ ] typedoc
- [ ] visual regression
- [ ] multi-framework support
- [ ] Vue adapter
- [ ] Svelte adapter
- [ ] SSR examples
- [ ] complex CI matrix

## Package Names

package 名は最初から library 前提で切る。ただし公開は後回し。

```txt
@hetero-virtual/core
@hetero-virtual/react
```

## Current Rule

今は library として仕上げない。

monorepo + Next.js demo + internal packages で、性能と anchor correctness を先に証明する。
