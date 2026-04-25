import type { ExtractKind, ExtractResult } from "./types";

/** `calcUnitPrice` の戻り値。表示ラベルと種別を持つ。 */
export interface UnitPriceResult {
  /** バッジに表示する文字列（例: `"100gあたり ¥1,000"`） */
  label: string;
  /** バッジの色クラスを決定するための種別 */
  kind: ExtractKind;
}

/** 3桁区切り整数フォーマッタ（ja-JP ロケール） */
const yenFormatter = new Intl.NumberFormat("ja-JP");

/**
 * 寄付金額と抽出結果から単価ラベルを計算する純関数。
 *
 * - `weight`  → 100g あたりの金額
 * - `volume`  → 1L あたりの金額
 * - `count`   → 1{単位} あたりの金額
 * - `unknown(no-match)` → `null`（バッジ非表示）
 * - `unknown(mixed-set)` → 計算対象外ラベル
 *
 * @param yen - 寄付金額（円）
 * @param ext - `extract()` の戻り値
 * @returns 表示用ラベルと種別、または `null`
 */
export function calcUnitPrice(yen: number, ext: ExtractResult): UnitPriceResult | null {
  if (ext.kind === "weight") {
    const per100g = Math.round((yen / ext.amountG) * 100);
    return { label: `100gあたり ¥${yenFormatter.format(per100g)}`, kind: "weight" };
  }

  if (ext.kind === "volume") {
    const per1L = Math.round((yen / ext.amountMl) * 1000);
    return { label: `1Lあたり ¥${yenFormatter.format(per1L)}`, kind: "volume" };
  }

  if (ext.kind === "count") {
    const perUnit = Math.round(yen / ext.count);
    return { label: `1${ext.unitLabel}あたり ¥${yenFormatter.format(perUnit)}`, kind: "count" };
  }

  // unknown
  if (ext.reason === "mixed-set") {
    return { label: "(混合セットのため計算対象外)", kind: "unknown" };
  }

  return null;
}
