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

try {
  processAll();

  const debouncedProcessAll = makeDebouncedProcessAll(150);

  new MutationObserver(() => {
    debouncedProcessAll();
  }).observe(document.body, { childList: true, subtree: true });
} catch (e) {
  console.warn("[furunavi-unit-price]", e);
}
