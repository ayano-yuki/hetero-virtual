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

# Phase 4 の placeholder virtualizer demo を実装

50,000件の可変高さplaceholderをbounded DOMで描画し、prepend anchor補正、viewport shift表示、fast scrollを検証できるNext.js demoを追加した。

## 実装詳細

- `/benchmark` に50,000件の決定的な可変高さplaceholderデータを追加
- `ChunkedHeightTree` と `RangeCalculator` からvisible rangeを計算するdemo専用virtualizerを追加
- top spacer、visible placeholders、bottom spacerで総高さを表現し、mounted DOM数を制限
- scroll eventでは位置と速度だけを収集し、`requestAnimationFrame`でrangeを更新
- 1,000件ずつ追加するprepend操作と`AnchorManager`によるscrollTop補正を追加
- prepend前後のanchor visual positionからviewport shift pxを計測して表示
- total items、rendered items、viewport shift、scroll velocityのlive metricsを追加
- 高速な双方向スクロールを自動実行・停止できるscenarioを追加
- READMEにlive placeholder virtualizerの利用内容を追記
- TodoのPhase 4を完了状態へ更新

## 変更ファイル

- `apps/demo-next/app/benchmark/PlaceholderVirtualizer.tsx`
- `apps/demo-next/app/benchmark/page.tsx`
- `apps/demo-next/app/globals.css`
- `README.md`
- `Todo.md`
- `LOG.md`

# Phase 5 の measurement pipeline と resize correction を実装

測定queue、type別高さ推定、ResizeObserver、anchor restoreを接続し、遅延画像による高さ変化をviewport shift付きで検証できるようにした。

## 実装詳細

- ID単位の最新値を重複排除し、priority順・frame budget内で処理する`MeasurementQueue`を追加
- item typeごとにbias、variance、平均絶対誤差を更新する`HeightEstimator`を追加
- 複数height correction後もanchorのvisual positionを維持するcore integration testを追加
- visible rowを`ResizeObserver`で監視し、border-boxの実測高さをmeasurement queueへ登録
- queue flush前にanchorをcaptureし、height tree更新後にscrollTopをrestore
- 1回のflushで複数測定をまとめ、残ったqueueを次frameへ継続
- textとimageの高さ推定を分離し、新規prepend itemへ学習済みbiasを適用
- delayed image controlで画像相当rowを遅延拡張するdemo scenarioを追加
- measurement queue長、補正件数、image estimate MAE、resize shiftをlive表示
- READMEにmeasurement pipelineの操作内容を追記
- TodoのPhase 5を完了状態へ更新

## 変更ファイル

- `packages/core/src/MeasurementQueue.ts`
- `packages/core/src/MeasurementQueue.test.ts`
- `packages/core/src/HeightEstimator.ts`
- `packages/core/src/HeightEstimator.test.ts`
- `packages/core/src/MeasurementPipeline.test.ts`
- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`
- `apps/demo-next/app/benchmark/PlaceholderVirtualizer.tsx`
- `apps/demo-next/app/globals.css`
- `README.md`
- `Todo.md`
- `LOG.md`

# Phase 6 の frame-budget render scheduler を実装

優先度付きrender taskをframe budget内で段階処理し、scroll modeに応じてheavy itemのhydrationを制御するschedulerとdemoを追加した。

## 実装詳細

- item単位でtaskを重複排除する`RenderScheduler`を追加
- placeholder、shell、light、fullの4段階render levelを定義
- viewport内、進行方向、anchor付近、距離、render costを使うpriority scoringを追加
- 通常8ms、low-end 4msのframe budgetと推定costによる処理制限を追加
- velocityとscroll終了後の経過時間からidle、dragging、flinging、settlingを判定
- 1frameにつき各itemを1段階昇格するprogressive hydrationを追加
- flinging中はheavy imageをshell、軽量itemをlightまでに制限
- pending taskを現在のviewportとoverscan内に限定し、到達済みrender levelは保持
- demoにrender level別のplaceholder、shell、light、full表示を追加
- scroll mode、render queue、hydrated visible数、last frame、scheduler p95をlive表示
- 8msと4ms budgetを切り替えるlow-end検証controlを追加
- CPU throttle 4xでのp95実測はブラウザ検証が必要なためTodoに残した

## 変更ファイル

- `packages/core/src/RenderScheduler.ts`
- `packages/core/src/RenderScheduler.test.ts`
- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`
- `apps/demo-next/app/benchmark/PlaceholderVirtualizer.tsx`
- `apps/demo-next/app/globals.css`
- `README.md`
- `Todo.md`
- `LOG.md`

# Render scheduler の再描画ループを修正

表示対象とlow-end設定をref経由で参照してscheduler callbackを安定化し、render level更新によるtask再登録の連鎖を防止した。

## 実装詳細

- 最新のvisible itemとlow-end modeをrefへ保持
- render task登録とqueue処理のcallbackから変化しやすい配列参照を除外
- task再登録effectを表示範囲、データ、budgetの実変更時に限定
- scroll mode遷移時のtask再登録をevent handlerから明示的に実行
- scroll modeの表示更新をrequestAnimationFrameへ遅延し、scroll event中の同期更新を防止
- render queue指標をscheduler frame側だけで更新し、task登録中の同期更新を防止
- CPU throttle環境で発生した`Maximum update depth exceeded`の更新ループを防止

## 変更ファイル

- `apps/demo-next/app/benchmark/PlaceholderVirtualizer.tsx`
- `LOG.md`

# CPU throttle 4x の性能基準達成を確認

Chrome CPU throttle 4xとlow-end 4ms budgetでfast scrollを計測し、p95 JS frame time 6ms以下とviewport shift 1px未満を確認した。

## 実装詳細

- Phase 6のCPU throttle 4x計測項目を完了
- North Starのp95 JS frame time 6ms以下の性能目標を完了
- viewport shiftが1px未満であることを実ブラウザで確認

## 変更ファイル

- `Todo.md`
- `LOG.md`

# Phase 7 の adapter model を実装

高さ推定、render cost、4段階render、measurement behaviorを明示するReact非依存contractと5種類のdemo adapterを追加した。

## 実装詳細

- genericな`VirtualItemAdapter` contractをcoreへ追加
- placeholder、shell、light、fullごとのrender cost hintsとrendererを定義
- fixed、observe、observe-after-hydrationのmeasurement modeを定義
- adapterの重複、未知type、不正な高さとcostを検証する`AdapterRegistry`を追加
- adapter contractとregistryのunit testsを追加
- text、markdown、image、chart、tool-result adapterをdemoへ追加
- 50,000件のbenchmark itemを5種類のadapter-driven混在データへ変更
- 高さ推定、scheduler cost、heavy判定、段階描画、測定可否をadapter経由へ移行
- adapter modelのREADMEとconcepts documentationを更新

## 変更ファイル

- `packages/core/src/Adapter.ts`
- `packages/core/src/Adapter.test.ts`
- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`
- `apps/demo-next/app/benchmark/adapters.tsx`
- `apps/demo-next/app/benchmark/PlaceholderVirtualizer.tsx`
- `apps/demo-next/app/globals.css`
- `docs/concepts.md`
- `README.md`
- `Todo.md`
- `LOG.md`

# Phase 8 の React package integration を実装

外部store、`useSyncExternalStore` hook、DOM測定、adapter描画、React固有scheduler glueを`@hetero-virtual/react`へ追加しdemoへ接続した。

## 実装詳細

- height tree、range calculator、render schedulerを統合する`VirtualizerStore`を追加
- immutable snapshotとsubscribe APIを実装
- scroll、resize、velocity、scroll modeを接続する`useHeteroVirtualizer`を追加
- `ResizeObserver`とmeasurement behaviorを使う`measureElement`を追加
- adapterの現在render levelを描画する`renderItem`を追加
- position、測定ref、adapter描画をまとめる`HeteroVirtualItem`を追加
- requestAnimationFrameでrender queueを進めるReact-specific scheduling glueを追加
- storeのrange、subscription、measurement、render promotion、item同期testsを追加
- benchmarkのrender level、queue指標、DOM測定、adapter描画をReact packageへ接続
- React API documentationを実装済みAPIへ更新

## 変更ファイル

- `packages/react/src/VirtualizerStore.ts`
- `packages/react/src/VirtualizerStore.test.ts`
- `packages/react/src/useHeteroVirtualizer.tsx`
- `packages/react/src/index.ts`
- `packages/react/package.json`
- `packages/react/vitest.config.ts`
- `apps/demo-next/app/benchmark/PlaceholderVirtualizer.tsx`
- `docs/react-api.md`
- `README.md`
- `Todo.md`
- `pnpm-lock.yaml`
- `LOG.md`
