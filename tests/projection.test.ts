import { describe, it, expect } from 'vitest';
import { runProjection } from '../src/lib/projection';
import { DEFAULTS } from '../src/lib/constants';
import type { Assumptions } from '../src/lib/types';

const defaultAssumptions: Assumptions = { ...DEFAULTS, idecoEnabled: true };

describe('projection — 基準6%・NISAのみの検算（30歳・月5万投資開始）', () => {
  const result = runProjection(defaultAssumptions);
  const rows = result.rows;

  function rowAt(age: number) {
    const r = rows.find((r) => r.age === age);
    if (!r) throw new Error(`row not found for age ${age}`);
    return r;
  }

  it('45歳: 総資産(基準) ≈ 1,936万 (±1%)', () => {
    const total = rowAt(45).totalBase;
    expect(total).toBeGreaterThanOrEqual(1936 * 0.99);
    expect(total).toBeLessThanOrEqual(1936 * 1.01);
  });

  it('48歳: 総資産(基準) ≈ 2,483万 (±1%)', () => {
    const total = rowAt(48).totalBase;
    expect(total).toBeGreaterThanOrEqual(2483 * 0.99);
    expect(total).toBeLessThanOrEqual(2483 * 1.01);
  });

  it('50歳: 総資産(基準) ≈ 2,905万 (±1%)', () => {
    const total = rowAt(50).totalBase;
    expect(total).toBeGreaterThanOrEqual(2905 * 0.99);
    expect(total).toBeLessThanOrEqual(2905 * 1.01);
  });

  it('55歳: 総資産(基準) ≈ 4,201万 (±1%)', () => {
    const total = rowAt(55).totalBase;
    expect(total).toBeGreaterThanOrEqual(4201 * 0.99);
    expect(total).toBeLessThanOrEqual(4201 * 1.01);
  });

  it('60歳: 総資産(基準) ≈ 5,935万 (±1%)', () => {
    const total = rowAt(60).totalBase;
    expect(total).toBeGreaterThanOrEqual(5935 * 0.99);
    expect(total).toBeLessThanOrEqual(5935 * 1.01);
  });

  it('3,000万到達: 保守→55歳 / 基準→51歳 / 楽観→48歳', () => {
    expect(result.goalA.conservative).toBe(55);
    expect(result.goalA.base).toBe(51);
    expect(result.goalA.optimistic).toBe(48);
  });

  it('5,000万到達: 基準→58歳 / 楽観→54歳', () => {
    expect(result.goalB.base).toBe(58);
    expect(result.goalB.optimistic).toBe(54);
  });

  it('iDeCo併用(基準)で5,000万到達 → 54歳', () => {
    expect(result.goalB.withIdeco).toBe(54);
  });

  it('iDeCo: 60歳の節税還付プール ≈ 1,795万 (±1%)', () => {
    const pool = rowAt(60).refundPool / 10000;
    expect(pool).toBeGreaterThanOrEqual(1795 * 0.99);
    expect(pool).toBeLessThanOrEqual(1795 * 1.01);
  });

  it('iDeCo: 60歳のロック額 ≈ 6,205万 (±1%)', () => {
    const locked = rowAt(60).lockedIdeco / 10000;
    expect(locked).toBeGreaterThanOrEqual(6205 * 0.99);
    expect(locked).toBeLessThanOrEqual(6205 * 1.01);
  });

  it('30歳時点の現金 = 100万（初期値）', () => {
    const cash = rowAt(30).cash;
    expect(cash).toBe(1_000_000);
  });

  it('NISA枠到達: 全額NISA→60歳（開始時の使用枠0・月5万積立）', () => {
    expect(result.nisaFullAge).toBe(60);
  });

  it('開始時に既にNISA枠を使っていると到達が早まる（60万消化済→59歳）', () => {
    const withHead = runProjection({ ...defaultAssumptions, nisaUsedAtStart: 600_000 });
    expect(withHead.nisaFullAge).toBe(59);
  });

  it('NISA枠到達: iDeCo併用→（60歳超）', () => {
    expect(result.nisaWithIdecoAge).toBeNull();
  });

  it('NISA年間枠360万を超える投資でも、年間消化は360万で頭打ち', () => {
    // 月50万=年600万投資。年間枠360万なので初年度既消化60万から
    // (1800-60)/360 ≈ 4.83 → 5年後（35歳）に生涯枠を使い切る
    const big = runProjection({ ...defaultAssumptions, baseInvestMonthly: 500_000 });
    expect(big.nisaFullAge).toBe(35);

    // 各年のNISA累積増分が 360万 を超えないこと
    let prev = 600_000;
    for (const r of big.rows.slice(1)) {
      expect(r.nisaCumNoIdeco - prev).toBeLessThanOrEqual(3_600_000 + 1);
      prev = r.nisaCumNoIdeco;
    }
  });

  it('0%利回りでもNaNにならず、元本と積立だけで推移する', () => {
    const flat = runProjection({
      ...defaultAssumptions,
      rConservative: 0,
      rBase: 0,
      rOptimistic: 0,
    });

    const row60 = flat.rows.find((r) => r.age === 60);
    if (!row60) throw new Error('row not found for age 60');

    expect(Number.isFinite(row60.totalBase)).toBe(true);
    expect(row60.totalBase).toBe(2060);
  });

  it('iDeCo拠出上限は現在年ではなく暦年2027年で切り替える', () => {
    const shifted = runProjection({
      ...defaultAssumptions,
      currentYear: 2025,
      endAge: 32,
      rConservative: 0,
      rBase: 0,
      rOptimistic: 0,
    });

    const refunds = shifted.rows.map((r) => r.refund);
    expect(refunds).toEqual([
      23_000 * 12 * defaultAssumptions.taxRate - defaultAssumptions.idecoAnnualFee,
      23_000 * 12 * defaultAssumptions.taxRate - defaultAssumptions.idecoAnnualFee,
      62_000 * 12 * defaultAssumptions.taxRate - defaultAssumptions.idecoAnnualFee,
    ]);
  });
});
