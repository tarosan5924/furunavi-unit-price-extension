import { beforeEach, describe, expect, it } from "vitest";
import { processCard } from "../src/renderer";
import type { CardSchema } from "../src/types";

/** メインリスト形式の最小カード HTML */
const MAIN_SCHEMA: CardSchema = {
  cardSelector: "ul.list-product > li",
  name: "h2.product-name a",
  price: "div.product-attr p.product-price",
  description: "div.product-content",
  badgeAnchor: "div.product-attr",
};

/**
 * テスト用のメインリスト形式カード要素を生成する。
 *
 * @param priceText - 価格テキスト（例: `"10,000"`）
 * @param nameText - 商品名テキスト（例: `"シャインマスカット"`）
 * @param descText - 説明文テキスト（例: `"約1kg"`）
 * @returns MAIN_SCHEMA に対応した構造を持つ `<li>` 要素
 */
function makeCard(priceText: string, nameText: string, descText: string): Element {
  const li = document.createElement("li");
  li.innerHTML = `
    <h2 class="product-name"><a>${nameText}</a></h2>
    <div class="product-content">${descText}</div>
    <div class="product-attr">
      <p class="product-price">${priceText}</p>
    </div>
  `;
  return li;
}

describe("processCard", () => {
  let card: Element;

  beforeEach(() => {
    card = makeCard("10,000", "シャインマスカット", "約1kg");
  });

  it("バッジが div.product-attr 内に挿入される", () => {
    const result = processCard(card, MAIN_SCHEMA);

    expect(result).toBe(true);
    expect(card.querySelector(".furunavi-up-badge")).not.toBeNull();
    expect(card.querySelector("div.product-attr .furunavi-up-badge")).not.toBeNull();
  });

  it("二重実行してもバッジが1つだけ", () => {
    processCard(card, MAIN_SCHEMA);
    processCard(card, MAIN_SCHEMA);

    expect(card.querySelectorAll(".furunavi-up-badge")).toHaveLength(1);
  });

  it("二度目の processCard は false を返す", () => {
    processCard(card, MAIN_SCHEMA);
    const second = processCard(card, MAIN_SCHEMA);

    expect(second).toBe(false);
  });

  it("価格が抽出不能なカードは false を返しバッジを挿入しない", () => {
    const noPrice = makeCard("", "シャインマスカット", "約1kg");
    const result = processCard(noPrice, MAIN_SCHEMA);

    expect(result).toBe(false);
    expect(noPrice.querySelector(".furunavi-up-badge")).toBeNull();
  });

  it("バッジに weight クラスが付く", () => {
    processCard(card, MAIN_SCHEMA);
    const badge = card.querySelector(".furunavi-up-badge");

    expect(badge?.classList.contains("furunavi-up-badge--weight")).toBe(true);
  });
});
