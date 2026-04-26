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

    it("Unicode の特殊単位記号 ㎏ を正規化", () => {
      expect(extract("約1.5㎏")).toEqual({ kind: "weight", amountG: 1500 });
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

    it("玉は重量と併記なら無視（合計重量として扱う）", () => {
      expect(extract("オトメメロン 2玉 約2kg")).toEqual({ kind: "weight", amountG: 2000 });
    });

    it("括弧内の乗算が括弧外の同一量を重複カウントしない", () => {
      expect(
        extract("無洗米ふるさと無洗米 5kg(5kg×1袋)《1-5日以内に出荷予定(土日祝除く)》"),
      ).toEqual({
        kind: "weight",
        amountG: 5000,
      });
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
    it("ml × 個数の乗算（× 記号あり）", () => {
      expect(extract("500ml×24本")).toEqual({ kind: "volume", amountMl: 12000 });
    });

    it("本数が × 記号なしで前置されている", () => {
      expect(
        extract("強炭酸水 VOX ストレート バナジウム 35本 500ml 富士吉田市限定カートン 炭酸"),
      ).toEqual({
        kind: "volume",
        amountMl: 17500,
      });
    });

    it("本数が括弧内に後置されている", () => {
      expect(extract("キリンビール 一番搾り 生 ビール ＜千歳工場産＞350ml（24本）")).toEqual({
        kind: "volume",
        amountMl: 8400,
      });
    });

    it("×n箱(m本入り) パターン: 箱数×単位量+括弧内総本数", () => {
      expect(extract("強炭酸水 ウィルキンソンタンサン PET500ml×2箱(48本入り) アサヒ 炭酸")).toEqual(
        { kind: "volume", amountMl: 24000 },
      );
    });

    it("×n箱(m本) 全角括弧パターン", () => {
      expect(extract("ビール 350ml×2箱（48本）")).toEqual({
        kind: "volume",
        amountMl: 16800,
      });
    });

    it("×nケース(m本入り) パターン", () => {
      expect(extract("麦茶 500ml×1ケース(24本入り)")).toEqual({
        kind: "volume",
        amountMl: 12000,
      });
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
