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
