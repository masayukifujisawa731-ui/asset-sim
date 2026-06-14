import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '../src/lib/montecarlo';
import type { MCParams } from '../src/lib/types';

const defaultMCParams: MCParams = {
  muArith: 0.075,
  sigma: 0.18,
  leverage: 1.0,
  borrowRate: 0.025,
  monthlyMan: 5,  // 月5万投資（既定値に合わせ）
  idecoReinvest: true,
  startW: 1_000_000,  // 初期証券口座100万
  age0: 30,  // 現在30歳
  ageN: 60,
  nPaths: 4000,
  taxRate: 0.30,
  idecoAnnualFee: 2_052,
  targetA: 3000,
  targetB: 5000,
};

describe('montecarlo — 既定前提での受け入れ確認（30歳・月5万投資）', () => {
  // シード固定で再現性を確保
  const result = runMonteCarlo(defaultMCParams, 12345);

  it('実質複利(中央値) ≈ 5.8% (±0.3%)', () => {
    const gm = result.geomMean;
    expect(gm).toBeGreaterThanOrEqual(0.055);
    expect(gm).toBeLessThanOrEqual(0.061);
  });

  it('60歳・中央値が 7,000〜8,500万の範囲内', () => {
    const median60 = result.medianAt60; // 万円
    expect(median60).toBeGreaterThanOrEqual(7000);
    expect(median60).toBeLessThanOrEqual(8500);
  });

  it('50歳で5,000万以上の確率: 20〜35%のレンジ', () => {
    const prob = result.prob50B;
    expect(prob).toBeGreaterThanOrEqual(0.20);
    expect(prob).toBeLessThanOrEqual(0.35);
  });

  it('iDeCo還付は暦年とカスタム拠出額を使って計算する', () => {
    const result = runMonteCarlo({
      ...defaultMCParams,
      muArith: 0,
      sigma: 0,
      monthlyMan: 0,
      startW: 0,
      age0: 30,
      ageN: 30,
      currentYear: 2027,
      nPaths: 1,
      taxRate: 0.5,
      idecoAnnualFee: 0,
      idecoMonthly2026: 10_000,
      idecoMonthlyFrom2027: 20_000,
    }, 12345);

    expect(result.medianAt60).toBe(12);
  });
});
