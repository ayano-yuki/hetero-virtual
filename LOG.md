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
