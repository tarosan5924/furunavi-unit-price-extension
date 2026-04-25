/**
 * 抽出結果の種別。
 * - `"weight"` : 重量（g 換算）
 * - `"volume"` : 容量（ml 換算）
 * - `"count"`  : 個数（玉・枚・本など）
 * - `"unknown"`: 判定不能
 */
export type ExtractKind = "weight" | "volume" | "count" | "unknown";

/**
 * テキストから量を抽出した結果を表す判別共用体。
 *
 * - `weight`  : `amountG` に合計グラム数を持つ（kg は自動換算済み）
 * - `volume`  : `amountMl` に合計ミリリットル数を持つ（L は自動換算済み）
 * - `count`   : `count` に個数、`unitLabel` に単位文字列（例: `"玉"`）を持つ
 * - `unknown` : 量を特定できなかった理由を `reason` に持つ
 *   - `"mixed-set"` : タレ・調味料など副次的な重量が混在するセット品
 *   - `"no-match"`  : パターンがひとつも見つからなかった
 *   - `"ambiguous"` : 複数の異なる単位が競合して一意に決定できない
 */
export type ExtractResult =
  | { kind: "weight"; amountG: number }
  | { kind: "volume"; amountMl: number }
  | { kind: "count"; count: number; unitLabel: string }
  | { kind: "unknown"; reason: "mixed-set" | "no-match" | "ambiguous" };

/**
 * ページ内の商品カードを走査するための DOM セレクタ定義。
 *
 * ふるなびは「メインリスト（ハイフン系クラス）」と
 * 「リコメンド枠（アンダースコア系クラス）」の 2 系統が混在するため、
 * 系統ごとにスキーマを定義して `SCHEMAS` 配列で管理する。
 */
export interface CardSchema {
  /** カード要素を特定する CSS セレクタ */
  cardSelector: string;
  /** 商品名テキストを含む要素のセレクタ（cardSelector 起点の相対指定） */
  name: string;
  /** 寄付金額テキストを含む要素のセレクタ */
  price: string;
  /** 内容量テキストを含む要素のセレクタ。存在しないスキーマは `null` */
  description: string | null;
  /** 単価バッジを挿入する親要素のセレクタ */
  badgeAnchor: string;
}
