import type { ExtractResult } from "./types";

/**
 * タレ・調味料など副次的な重量として扱うキーワード。
 * これらのキーワードの直前にある量は主量から除外する。
 */
const SECONDARY_KEYWORDS = /タレ|ソース|薬味|調味料|ドレッシング|付属|添付/;

/**
 * 個数単位として認識する文字列の一覧（優先順）。
 * 房・株などは重量と併記されることが多いため、重量が取れた場合は無視される。
 */
const COUNT_UNITS = [
  "枚",
  "個",
  "玉",
  "本",
  "セット",
  "袋",
  "缶",
  "瓶",
  "尾",
  "匹",
  "切",
  "房",
  "株",
] as const;

/** テキスト中の量表現（乗算あり）を1件抽出して返すユーティリティ */
type RawQuantity = {
  value: number;
  unit: "g" | "kg" | "ml" | "L";
  isSecondary: boolean;
};

/**
 * テキスト内の重量・容量表現をすべて抽出する。
 * 「500g×2パック」のような乗算も合計値に展開する。
 * SECONDARY_KEYWORDS の直後に現れる量は副次的とみなす。
 *
 * @param text - 商品名・説明文などの生テキスト
 * @returns 抽出した量の配列（副次フラグ付き）。マッチがなければ空配列。
 */
function extractQuantities(text: string): RawQuantity[] {
  // 乗算パターン: 500g×2 / 1.2kg×3 など
  const mulRe = /(\d+(?:\.\d+)?)\s*(kg|g|L|ml)\s*[×xX*✕]\s*(\d+(?:\.\d+)?)/g;
  // 単純パターン: 約500g / 1.2kg以上 など
  const singleRe = /(?:約|凡そ|おおよそ)?\s*(\d+(?:\.\d+)?)\s*(kg|g|L|ml)(?:以上|程度|前後)?/g;

  const results: RawQuantity[] = [];

  // 乗算を先に抽出（単純パターンより優先）
  const mulPositions = new Set<number>();
  for (const m of text.matchAll(mulRe)) {
    const value = parseFloat(m[1]) * parseFloat(m[3]);
    const unit = m[2] as RawQuantity["unit"];
    // マッチ位置の前にある直近のキーワードで副次判定
    const before = text.slice(0, m.index ?? 0);
    const isSecondary = SECONDARY_KEYWORDS.test(before.slice(-20));
    results.push({ value, unit, isSecondary });
    // 乗算内で使われた数値位置を記録して単純パターンと重複しないようにする
    for (let i = m.index ?? 0; i < (m.index ?? 0) + m[0].length; i++) {
      mulPositions.add(i);
    }
  }

  // 単純パターンで乗算と重ならない位置のみ追加
  for (const m of text.matchAll(singleRe)) {
    const startIdx = m.index ?? 0;
    // 乗算パターンが占有している範囲と重なっていたらスキップ
    if (mulPositions.has(startIdx)) {
      continue;
    }
    const unit = m[2] as RawQuantity["unit"];
    const value = parseFloat(m[1]);
    const before = text.slice(0, startIdx);
    const isSecondary = SECONDARY_KEYWORDS.test(before.slice(-20));
    results.push({ value, unit, isSecondary });
  }

  return results;
}

/**
 * RawQuantity を g または ml に正規化して合計する。
 * 重量と容量が混在する場合は `null` を返す。
 *
 * @param qs - `extractQuantities` が返した量の配列（副次量除去済みを想定）
 * @returns 重量または容量の正規化結果。混在または空の場合は `null`。
 */
function normalizeQuantities(
  qs: RawQuantity[],
): { kind: "weight"; amountG: number } | { kind: "volume"; amountMl: number } | null {
  let totalG = 0;
  let totalMl = 0;

  for (const q of qs) {
    if (q.unit === "g") {
      totalG += q.value;
    } else if (q.unit === "kg") {
      totalG += q.value * 1000;
    } else if (q.unit === "ml") {
      totalMl += q.value;
    } else if (q.unit === "L") {
      totalMl += q.value * 1000;
    }
  }

  if (totalG > 0 && totalMl > 0) {
    return null; // 重量と容量が混在
  }
  if (totalG > 0) {
    return { kind: "weight", amountG: totalG };
  }
  if (totalMl > 0) {
    return { kind: "volume", amountMl: totalMl };
  }
  return null;
}

/**
 * テキストから個数を抽出する。
 * 重量・容量が既に見つかっている場合は房・株などは無視する。
 *
 * @param text - 商品名・説明文などの生テキスト
 * @param hasWeightOrVolume - 重量または容量が既に検出済みかどうか
 * @returns `{ count, unitLabel }` または、個数が見つからない場合は `null`
 */
function extractCount(
  text: string,
  hasWeightOrVolume: boolean,
): { count: number; unitLabel: string } | null {
  // 重量がある場合は「房」「株」を除外
  const units = hasWeightOrVolume
    ? COUNT_UNITS.filter((u) => u !== "房" && u !== "株")
    : COUNT_UNITS;

  for (const unit of units) {
    // 「6玉」「10枚入り」など: 数字 + 単位（入り・セット等の後置も許容）
    const re = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}`, "g");
    const m = re.exec(text);
    if (m) {
      return { count: parseFloat(m[1]), unitLabel: unit };
    }
  }
  return null;
}

/**
 * 商品名や説明文のテキストから量を解析して `ExtractResult` を返す純関数。
 *
 * 判定優先順位:
 * 1. 重量（g / kg）が主量として見つかれば `weight`
 * 2. 容量（ml / L）が主量として見つかれば `volume`
 * 3. 個数単位が見つかれば `count`
 * 4. 何も見つからなければ `unknown`（reason: `"no-match"`）
 *
 * 副次的な重量（タレ・調味料など）は主量の判定から除外される。
 * 副次量のみ残った場合は `unknown`（reason: `"mixed-set"`）を返す。
 *
 * @param text - 商品名・説明文を連結した生テキスト
 * @returns 抽出結果。量が特定できない場合は `{ kind: "unknown", reason: ... }`。
 */
export function extract(text: string): ExtractResult {
  const allQs = extractQuantities(text);
  const primaryQs = allQs.filter((q) => !q.isSecondary);
  const secondaryQs = allQs.filter((q) => q.isSecondary);

  // 主量から重量・容量を計算
  if (primaryQs.length > 0) {
    const normalized = normalizeQuantities(primaryQs);
    if (normalized) {
      return normalized;
    }
  }

  // 主量がなく副次量だけある場合は混合セットとみなす
  if (primaryQs.length === 0 && secondaryQs.length > 0) {
    return { kind: "unknown", reason: "mixed-set" };
  }

  // 個数を試みる（重量・容量が見つかった上で個数も抽出できる場合は重量優先なので
  // ここに到達するのは重量・容量がないケースのみ）
  const hasWeightOrVolume = primaryQs.length > 0;
  const countResult = extractCount(text, hasWeightOrVolume);
  if (countResult) {
    return { kind: "count", ...countResult };
  }

  return { kind: "unknown", reason: "no-match" };
}
