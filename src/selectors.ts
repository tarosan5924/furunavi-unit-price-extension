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
    // 検索ページのメインリスト（div.product-attr 構造）
    cardSelector: "ul.list-product:not(.carousel):not(.ranking) > li",
    name: "h2.product-name a",
    price: "div.product-attr p.product-price",
    description: "div.product-content",
    badgeAnchor: "div.product-attr",
  },
  {
    // ランキングページ・カルーセル・特集ページ・トップページ（div.product-info 構造）
    cardSelector:
      ":is(ul, ol).list-product.ranking > li, ul.list-product.carousel > li, ul.list-product:not(.ranking):not(.carousel) > li:has(div.product-info)",
    name: ":is(h2, p).product-name a",
    price: "p.product-price",
    description: null,
    badgeAnchor: "div.product-info",
  },
  {
    // 詳細ページのメイン商品
    cardSelector: "div.page-product_detail main",
    name: "h1.product-name-text",
    price: "dl.product-info-price dd strong",
    description: null,
    badgeAnchor: "dl.product-info-price",
  },
  {
    cardSelector: "li.swiper-slide.product_frame",
    name: "p.product_name a",
    price: "p.product_price",
    description: null,
    badgeAnchor: "div.product_attr, p.product_price",
  },
];
