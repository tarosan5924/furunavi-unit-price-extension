import { processCard } from "./renderer";
import { SCHEMAS } from "./selectors";

/**
 * 全スキーマを走査して未処理カードに単価バッジを挿入する。
 * `data-furunavi-up` 付与済みのカードはスキップする。
 */
function processAll(): void {
  for (const schema of SCHEMAS) {
    for (const card of document.querySelectorAll(schema.cardSelector)) {
      processCard(card, schema);
    }
  }
}

/**
 * デバウンス済みの `processAll` を返す。
 * MutationObserver からの連続呼び出しを間引き、
 * `requestIdleCallback`（未対応環境では `setTimeout`）で実行する。
 *
 * @param delayMs - デバウンス待機時間（ミリ秒）
 * @returns デバウンス関数
 */
function makeDebouncedProcessAll(delayMs: number): () => void {
  let timerId: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      timerId = null;
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => processAll());
      } else {
        processAll();
      }
    }, delayMs);
  };
}

/**
 * 追加された DOM ノードを走査し、カードまたはカードを含む要素があれば
 * `data-furunavi-up` 属性を削除して再処理可能な状態に戻す。
 *
 * ページネーション時にふるなびが既存の `li` を再利用して中身だけ差し替えると
 * 古い属性が残り processCard() のガード節でスキップされるため、この処理が必要。
 *
 * @param mutations - MutationObserver から渡された変化リスト
 */
function resetStaleCards(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      // TextNode など Element 以外は parentElement 経由で処理する
      const el = node instanceof Element ? node : node.parentElement;
      if (!el) {
        continue;
      }
      // 自分が挿入したバッジ起因の変化はスキップ（無限ループ防止）
      if (el.classList.contains("furunavi-up-badge") || el.closest(".furunavi-up-badge")) {
        continue;
      }
      for (const schema of SCHEMAS) {
        // パターン1: 追加ノード自体がカード
        if (el.matches(schema.cardSelector)) {
          el.removeAttribute("data-furunavi-up");
        }
        // パターン2: 追加ノードがカードを含む（ul ごと差し替えなど）
        for (const card of el.querySelectorAll(schema.cardSelector)) {
          card.removeAttribute("data-furunavi-up");
        }
        // パターン3: 追加ノードがカード内部（li を再利用して子要素だけ差し替え）
        const closestCard = el.closest(schema.cardSelector);
        if (closestCard) {
          closestCard.removeAttribute("data-furunavi-up");
        }
      }
    }
  }
}

try {
  processAll();

  const debouncedProcessAll = makeDebouncedProcessAll(150);

  new MutationObserver((mutations) => {
    resetStaleCards(mutations);
    debouncedProcessAll();
  }).observe(document.body, { childList: true, subtree: true });
} catch (e) {
  console.warn("[furunavi-unit-price]", e);
}
