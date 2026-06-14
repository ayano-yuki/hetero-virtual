# Phase 1 の demo-first foundation を構築

pnpm workspace、Next.js demo、internal core/react packages、共有 TypeScript 設定、core 用 Vitest、benchmark foundation page を追加した。

## 実装詳細

- ルートに workspace 定義、共通スクリプト、共有 TypeScript 設定、lockfile を追加
- `apps/demo-next` に overview page と `/benchmark` page を追加
- `packages/core` に公開エントリ、Vitest 設定、スモークテストを追加
- `packages/react` に後続実装のための最小公開エントリを追加
- README に workspace 構成、benchmark URL、検証コマンドを追記
- Todo の Phase 1 を完了状態へ更新

## 変更ファイル

- `.gitignore`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `apps/demo-next/**`
- `packages/core/**`
- `packages/react/**`
- `README.md`
- `Todo.md`
- `LOG.md`

# Phase 2 の高さ集計 core と correctness tests を実装

React や DOM に依存しない Fenwick tree と chunked height tree を追加し、append、prepend、高さ更新、offset 検索、anchor correctness を検証した。

## 実装詳細

- 非負値の prefix sum、更新、追加、prefix bound 検索に対応する `FenwickTree` を追加
- 前方 chunk と後方 chunk を分離し、既存 item の位置情報を移動せず prepend できる `ChunkedHeightTree` を追加
- `append`、`prepend`、`updateHeight`、`offsetOf`、`findItemAtOffset`、`totalHeight` を実装
- ID 重複、未知 ID、無効な高さ、無効な offset、空 tree の境界条件を定義
- chunk 境界、連続 prepend、前後の高さ更新、offset clamp を unit test で検証
- 固定 seed のランダム操作を単純配列モデルと比較して全 item の offset と検索結果を検証
- prepend 高さを scrollTop に補償した際に anchor item の visual position が維持されることを検証
- Todo の Phase 2 を完了状態へ更新

## 変更ファイル

- `packages/core/src/FenwickTree.ts`
- `packages/core/src/FenwickTree.test.ts`
- `packages/core/src/ChunkedHeightTree.ts`
- `packages/core/src/ChunkedHeightTree.test.ts`
- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`
- `Todo.md`
- `LOG.md`

# Phase 3 の anchor preservation と adaptive range を実装

Anchor の capture/restore、viewport shift 計測、速度と方向に応じた pixel-based range 計算を React 非依存の core に追加した。

## 実装詳細

- viewport を保持する item と item 内 offset を取得する `AnchorManager.captureAnchor` を追加
- prepend や高さ補正後に適用する scrollTop を返す `AnchorManager.restoreAnchor` を追加
- item が anchor より前にあるか判定する `AnchorManager.isBeforeAnchor` を追加
- 補正前後の anchor visual position 差を絶対 px で返す `measureViewportShift` を追加
- viewport、scroll velocity、direction から item range を返す `RangeCalculator.computeVisibleRange` を追加
- viewport 比率を基準に、進行方向側を `velocity * horizonMs` で広げる adaptive overscan を追加
- overscan の最小・最大 px、horizon、base viewport ratio を設定可能にした
- prepend、高さ補正、missing anchor、上下方向、範囲境界、high-variance heights を unit test で検証
- Todo の Phase 3 を完了状態へ更新

## 変更ファイル

- `packages/core/src/AnchorManager.ts`
- `packages/core/src/AnchorManager.test.ts`
- `packages/core/src/RangeCalculator.ts`
- `packages/core/src/RangeCalculator.test.ts`
- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`
- `Todo.md`
- `LOG.md`
