import { describe, expect, it } from "vitest";
import { extract } from "../src/extractor";

describe("extract", () => {
  describe("重量（weight）", () => {
    it("単純な g 表記", () => {
      expect(extract("500g")).toEqual({ kind: "weight", amountG: 500 });
    });

    it("kg を g に換算", () => {
      expect(extract("1.2kg")).toEqual({ kind: "weight", amountG: 1200 });
    });

    it("g × 個数の乗算", () => {
      expect(extract("500g×2パック")).toEqual({ kind: "weight", amountG: 1000 });
    });

    it("房は重量と併記なら無視（約表記）", () => {
      expect(extract("シャインマスカット 約1.3kg 2～3房")).toEqual({
        kind: "weight",
        amountG: 1300,
      });
    });

    it("房は重量と併記なら無視（カッコ内表記）", () => {
      expect(extract("シャインマスカット2kg(3～5房)")).toEqual({ kind: "weight", amountG: 2000 });
    });

    it("重量優先: 房と kg が並ぶ場合は kg を採用", () => {
      expect(extract("シャインマスカット 2～3房 （1.0kg以上）")).toEqual({
        kind: "weight",
        amountG: 1000,
      });
    });

    it("タレ付きの副次重量は無視して主重量のみ採用", () => {
      expect(extract("牛タン 500g（タレ 50g 付き）")).toEqual({ kind: "weight", amountG: 500 });
    });
  });

  describe("容量（volume）", () => {
    it("ml × 個数の乗算", () => {
      expect(extract("500ml×24本")).toEqual({ kind: "volume", amountMl: 12000 });
    });
  });

  describe("個数（count）", () => {
    it("玉単位", () => {
      expect(extract("6玉")).toEqual({ kind: "count", count: 6, unitLabel: "玉" });
    });

    it("枚入り表記", () => {
      expect(extract("10枚入り")).toEqual({ kind: "count", count: 10, unitLabel: "枚" });
    });
  });

  describe("判定不能（unknown）", () => {
    it("量の情報が全くない", () => {
      expect(extract("おまかせセット")).toEqual({ kind: "unknown", reason: "no-match" });
    });
  });
});
