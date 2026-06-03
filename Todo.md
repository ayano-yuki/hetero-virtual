# Todo

Status: experimental prototype

このリポジトリは、最初から npm 公開を目指す完成ライブラリではなく、library-shaped prototype として進める。

最優先の目的は、きれいな API やパッケージングではなく、異種 DOM 混在でも低カクつきで双方向スクロールできることを数字で示すこと。

## North Star

- [ ] Next.js 上で 50,000 件の text / markdown / image / chart / tool-result 混在リストを双方向スクロールできる
- [ ] prepend 時の viewport shift を 1px 未満に抑える
- [ ] 高さ再測定時の viewport shift を 1px 未満に抑える
- [ ] Chrome CPU throttle 4x で fast scroll 時の p95 JS frame time を 6ms 以下に抑える
- [ ] heavy item を遅延しても viewport が空白化しない

## Phase 1: Demo-First Foundation

まずは demo を主戦場にする。API の綺麗さより、性能と anchor correctness の検証を優先する。

- [ ] pnpm workspace を作る
- [ ] Next.js demo app を作る
- [ ] internal core package を作る
- [ ] internal React package を作る
- [ ] TypeScript 設定を共有する
- [ ] Vitest を core 用に入れる
- [ ] basic benchmark page を用意する

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

- [ ] `ChunkedHeightTree` を実装する
- [ ] `FenwickTree` または同等の高さ集計構造を実装する
- [ ] `append(items)` を実装する
- [ ] `prepend(items)` を実装する
- [ ] `updateHeight(id, height)` を実装する
- [ ] `offsetOf(id)` を実装する
- [ ] `findItemAtOffset(offset)` を実装する
- [ ] `totalHeight()` を実装する
- [ ] core unit tests を追加する
- [ ] prepend 後も anchor item の visual position が保たれることをテストする

## Phase 3: Anchor And Range

prepend と高さ補正で viewport が飛ばないことを先に証明する。

- [ ] `AnchorManager.captureAnchor()` を実装する
- [ ] `AnchorManager.restoreAnchor()` を実装する
- [ ] `AnchorManager.isBeforeAnchor()` を実装する
- [ ] `RangeCalculator.computeVisibleRange()` を実装する
- [ ] velocity / direction を使った pixel-based adaptive overscan を入れる
- [ ] high-variance item heights のテストケースを作る
- [ ] viewport shift を計測する helper を作る

## Phase 4: Placeholder Virtualizer

重いコンポーネントを入れる前に、placeholder だけで dynamic height / bidirectional scroll / anchor preservation を確認する。

- [ ] demo で 50,000 件の placeholder list を表示する
- [ ] scrollTop から visible range を計算して描画する
- [ ] top / bottom spacer を使って総高さを表現する
- [ ] prepend ボタンまたは自動 prepend シナリオを作る
- [ ] prepend 後の viewport shift を画面上に表示する
- [ ] fast wheel scrolling のシナリオを作る

## Phase 5: Measurement Pipeline

動的高さの再測定で viewport がズレないことを検証する。

- [ ] `MeasurementQueue` を実装する
- [ ] `ResizeObserver` integration を作る
- [ ] height correction を height tree に反映する
- [ ] height correction 後に anchor restore する
- [ ] item type ごとの height estimator を更新する
- [ ] delayed image height changes の demo case を作る
- [ ] resize correction の viewport shift を 1px 未満に抑える

## Phase 6: Render Scheduler

heavy item を一気に描画せず、scroll 中の frame budget を守る。

- [ ] `RenderScheduler` を実装する
- [ ] render task queue を作る
- [ ] priority scoring を作る
- [ ] frame budget を設定する
- [ ] scroll mode を定義する
- [ ] progressive hydration を実装する
- [ ] viewport 付近を優先して render level を上げる
- [ ] CPU throttle 4x で p95 JS frame time を計測する

## Phase 7: Adapter Model

便利 API ではなく、異種 DOM の特性を明示する adapter contract を優先する。

- [ ] adapter type を定義する
- [ ] `estimateHeight` contract を定義する
- [ ] `renderCost` または cost hints を定義する
- [ ] render levels を定義する
- [ ] measurement behavior を定義する
- [ ] text adapter を作る
- [ ] markdown adapter を作る
- [ ] image adapter を作る
- [ ] chart adapter を作る
- [ ] tool-result adapter を作る

避ける API:

```tsx
<HeteroVirtual>
  {items.map(item => <AnyComponent />)}
</HeteroVirtual>
```

理由: height / cost / render levels / measurement behavior を渡せず、低カクつきの核である adapter model と矛盾するため。

## Phase 8: React Package

core は React 非依存のままにし、React 側は hooks と DOM integration に閉じる。

- [ ] `useHeteroVirtualizer` を実装する
- [ ] `measureElement` を実装する
- [ ] `HeteroVirtualItem` を実装する
- [ ] adapter rendering glue を作る
- [ ] `useSyncExternalStore` で state subscription を組む
- [ ] React-specific scheduling glue を作る
- [ ] demo app から internal package として使う

## Phase 9: Benchmarks And Evidence

数字で示せないものは、まだ売りにしない。

- [ ] 100,000 plain text items
- [ ] 50,000 markdown/code mixed items
- [ ] 20,000 image card mixed items
- [ ] 10,000 chart/tool-result heavy items
- [ ] continuous append
- [ ] continuous prepend
- [ ] fast wheel scrolling
- [ ] mobile-like CPU throttling
- [ ] delayed image height changes
- [ ] high-variance item heights
- [ ] p95 JS frame time を表示する
- [ ] viewport shift px を表示する
- [ ] rendered item count を表示する
- [ ] measurement queue length を表示する

## Phase 10: Private Package Trial

npm 公開前に、自分の別プロジェクトで使って API の痛みを見る。

- [ ] `@hetero-virtual/core` を workspace package として使う
- [ ] `@hetero-virtual/react` を workspace package として使う
- [ ] 別プロジェクトから GitHub dependency または workspace dependency で利用する
- [ ] API が不自然な箇所を記録する
- [ ] API を最低 2 回は壊して見直す

## Public Npm Publish Gate

以下を満たすまで npm publish はしない。

- [ ] prepend anchor が安定している
- [ ] resize correction が安定している
- [ ] markdown / image / heavy item 混在 demo がある
- [ ] CPU throttle で比較動画または数値がある
- [ ] API が最低 2 回は壊れている
- [ ] README に制約が明記されている
- [ ] examples がある

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
