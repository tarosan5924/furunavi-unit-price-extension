import type { CardSchema } from "./types";

/**
 * ふるなびの商品カード DOM スキーマ定義一覧。
 *
 * ふるなびには 2 系統の命名規則が混在する:
 * - **メインリスト**: `ul.list-product > li` ベースのハイフン区切りクラス
 * - **リコメンド枠**: `li.swiper-slide.product_frame` ベースのアンダースコア区切りクラス
 *
 * `content.ts` はこの配列を順番に走査して両系統のカードを処理する。
 */
export const SCHEMAS: CardSchema[] = [
  {
    cardSelector: "ul.list-product > li",
    name: "h2.product-name a",
    price: "div.product-attr p.product-price",
    description: "div.product-content",
    badgeAnchor: "div.product-attr",
  },
  {
    cardSelector: "li.swiper-slide.product_frame",
    name: "p.product_name a",
    price: "p.product_price",
    description: null,
    badgeAnchor: "div.product_attr, p.product_price",
  },
];
