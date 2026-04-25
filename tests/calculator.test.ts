import { describe, expect, it } from "vitest";
import { calcUnitPrice } from "../src/calculator";

describe("calcUnitPrice", () => {
  it("重量 500g / 5,000円 → 100gあたり ¥1,000", () => {
    expect(calcUnitPrice(5000, { kind: "weight", amountG: 500 })).toEqual({
      label: "100gあたり ¥1,000",
      kind: "weight",
    });
  });

  it("容量 1,200ml / 8,000円 → 1Lあたり ¥6,667", () => {
    expect(calcUnitPrice(8000, { kind: "volume", amountMl: 1200 })).toEqual({
      label: "1Lあたり ¥6,667",
      kind: "volume",
    });
  });

  it("個数 5玉 / 10,000円 → 1玉あたり ¥2,000", () => {
    expect(calcUnitPrice(10000, { kind: "count", count: 5, unitLabel: "玉" })).toEqual({
      label: "1玉あたり ¥2,000",
      kind: "count",
    });
  });

  it("unknown(no-match) → null", () => {
    expect(calcUnitPrice(5000, { kind: "unknown", reason: "no-match" })).toBeNull();
  });

  it("unknown(mixed-set) → 計算対象外ラベル", () => {
    expect(calcUnitPrice(5000, { kind: "unknown", reason: "mixed-set" })).toEqual({
      label: "(混合セットのため計算対象外)",
      kind: "unknown",
    });
  });
});
