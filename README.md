# furunavi-unit-price-extension

ふるさと納税サイト「ふるなび」の返礼品一覧・検索結果に、**100g あたり・1L あたり・1個あたり**の単価バッジを自動表示する Chrome 拡張機能（Manifest V3）。

## インストール（unpacked 拡張として読み込む）

1. `pnpm install && pnpm build` を実行してビルド済みファイルを生成する
2. Chrome で `chrome://extensions/` を開く
3. 右上の「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、**このリポジトリのルートディレクトリ**を選択する

## 開発手順

```bash
pnpm install       # 依存パッケージのインストール（lefthook フックも自動セットアップ）
pnpm test          # テストを一括実行
pnpm test:watch    # ファイル変更を監視してテストを再実行
pnpm lint          # Biome によるリント
pnpm build         # Vite で dist/content.js をビルド
```

## アーキテクチャ

```
src/
├── types.ts      — ExtractResult / CardSchema など共通型定義
├── selectors.ts  — ページ内カードを走査する DOM セレクタ定数（SCHEMAS）
├── extractor.ts  — 商品名・説明文テキストから重量・容量・個数を抽出する純関数
├── calculator.ts — 寄付金額と抽出結果から単価ラベルを計算する純関数
├── renderer.ts   — カード要素にバッジを挿入する DOM 操作
└── content.ts    — エントリポイント。MutationObserver で動的読み込みにも対応
```

### 動作の流れ

1. `content.ts` が `document_idle` で起動し `processAll()` を呼ぶ
2. `SCHEMAS` の各スキーマで `document.querySelectorAll` を走査
3. カードごとに `renderer.processCard()` を呼び出す
   - 価格を `parseInt` で取り出す
   - 商品名テキストを `extractor.extract()` に渡し、重量・容量・個数を判定
   - `calculator.calcUnitPrice()` で単価ラベルを生成
   - `<span class="furunavi-up-badge ...">` を `badgeAnchor` 要素に追加
4. `MutationObserver` が DOM 変化を検知し、150ms デバウンス後に `processAll()` を再実行

### DOM スキーマ

ふるなびには 2 系統の命名規則が混在するため、両方に対応している。

| スキーマ | 対象 | cardSelector |
|---|---|---|
| メインリスト | 検索結果・一覧 | `ul.list-product > li` |
| リコメンド枠 | 上部スライダー | `li.swiper-slide.product_frame` |
