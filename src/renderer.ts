import { calcUnitPrice } from "./calculator";
import { extract } from "./extractor";
import type { CardSchema } from "./types";

/**
 * 価格テキストから寄付金額（整数）を取り出す。
 * カンマ・全角カンマ・「円」・空白を除去して `parseInt` する。
 *
 * @param text - 価格要素の `textContent`（例: `"10,000円"`）
 * @returns 解析した整数値。数値として解釈できない場合は `NaN`。
 */
function parsePrice(text: string): number {
  return parseInt(text.replace(/[,，円\s]/g, ""), 10);
}

/**
 * 単価バッジ要素を生成する。
 *
 * @param label - バッジに表示するテキスト（例: `"100gあたり ¥1,000"`）
 * @param kind - バッジ色クラスを決定する種別
 * @returns スタイルクラス付きの `<span>` 要素
 */
function createBadge(label: string, kind: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `furunavi-up-badge furunavi-up-badge--${kind}`;
  span.textContent = label;
  return span;
}

/**
 * 商品カード要素に単価バッジを挿入する。
 *
 * 処理済みカードには `data-furunavi-up="1"` を付与して重複挿入を防ぐ。
 * 価格が取得できない・単価が計算対象外（`no-match`）の場合はバッジを挿入しない。
 *
 * @param card - スキーマの `cardSelector` にマッチしたカード要素
 * @param schema - カード構造を示す DOM セレクタ定義
 * @returns バッジを挿入した場合 `true`、何もしなかった場合 `false`
 */
export function processCard(card: Element, schema: CardSchema): boolean {
  if (card.getAttribute("data-furunavi-up") === "1") {
    return false;
  }
  // 属性リセット後の再処理時に古いバッジが残っている場合は除去する
  for (const stale of card.querySelectorAll(".furunavi-up-badge")) {
    stale.remove();
  }

  const priceEl = card.querySelector(schema.price);
  const price = parsePrice(priceEl?.textContent ?? "");
  if (!priceEl || Number.isNaN(price) || price <= 0) {
    return false;
  }

  const nameText = card.querySelector(schema.name)?.textContent ?? "";
  const descText = schema.description
    ? (card.querySelector(schema.description)?.textContent ?? "")
    : "";

  // 商品名を優先して抽出し、unknown の場合のみ説明文にフォールバックする。
  // 名前＋説明文を単純結合すると同じ重量が重複カウントされるため。
  const extractedFromName = extract(nameText);
  const extracted =
    extractedFromName.kind === "unknown" && descText ? extract(descText) : extractedFromName;

  const result = calcUnitPrice(price, extracted);
  if (!result) {
    return false;
  }

  const anchor = card.querySelector(schema.badgeAnchor);
  if (!anchor) {
    return false;
  }

  anchor.appendChild(createBadge(result.label, result.kind));
  card.setAttribute("data-furunavi-up", "1");
  return true;
}
