import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { runProjection } from '../src/lib/projection';
import { runMonteCarlo } from '../src/lib/montecarlo';
import { sanitizeAssumptions } from '../src/lib/sanitize';
import { DEFAULTS } from '../src/lib/constants';
import type { Assumptions, MCParams } from '../src/lib/types';

const finite = (n: number) => Number.isFinite(n);

// 妥当レンジ内のランダムな前提（極端値も含む）
const assumptionsArb: fc.Arbitrary<Assumptions> = fc.record({
  currentAge: fc.integer({ min: 18, max: 90 }),
  endAge: fc.integer({ min: 18, max: 95 }),
  currentYear: fc.integer({ min: 2000, max: 2100 }),
  targetA: fc.integer({ min: 0, max: 50000 }),
  targetB: fc.integer({ min: 0, max: 50000 }),
  startSecurities: fc.integer({ min: 0, max: 200_000_000 }),
  startCash: fc.integer({ min: 0, max: 200_000_000 }),
  cashFloor: fc.integer({ min: 0, max: 50_000_000 }),
  takeHomeMonthly: fc.integer({ min: 0, max: 3_000_000 }),
  annualBonus: fc.integer({ min: 0, max: 20_000_000 }),
  expenseMonthly: fc.integer({ min: 0, max: 3_000_000 }),
  baseInvestMonthly: fc.integer({ min: 0, max: 3_000_000 }),
  idecoEnabled: fc.boolean(),
  idecoMonthly2026: fc.integer({ min: 0, max: 100_000 }),
  idecoMonthlyFrom2027: fc.integer({ min: 0, max: 100_000 }),
  taxRate: fc.float({ min: 0, max: 1, noNaN: true }),
  idecoAnnualFee: fc.integer({ min: 0, max: 10_000 }),
  rConservative: fc.float({ min: Math.fround(-0.9), max: 1, noNaN: true }),
  rBase: fc.float({ min: Math.fround(-0.9), max: 1, noNaN: true }),
  rOptimistic: fc.float({ min: Math.fround(-0.9), max: 1, noNaN: true }),
}).map((r) => ({ ...r, lifeEvents: [], bigExpenses: [] }));

describe('robustness — projection の不変条件', () => {
  it('どんな入力でも全出力が有限（NaN/Infinityを出さない）', () => {
    fc.assert(
      fc.property(assumptionsArb, (a) => {
        const { rows } = runProjection(a);
        for (const r of rows) {
          expect(finite(r.totalConservative)).toBe(true);
          expect(finite(r.totalBase)).toBe(true);
          expect(finite(r.totalOptimistic)).toBe(true);
          expect(finite(r.totalWithIdeco)).toBe(true);
          expect(finite(r.cash)).toBe(true);
          expect(finite(r.invBase)).toBe(true);
          expect(finite(r.lockedIdeco)).toBe(true);
          expect(finite(r.refundPool)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('常に1行以上を返す（endAge < currentAge でもクラッシュしない）', () => {
    fc.assert(
      fc.property(assumptionsArb, (a) => {
        expect(runProjection(a).rows.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 200 },
    );
  });

  it('恒等式: 総資産(基準) = (投資資産 + 現金) / 10000', () => {
    fc.assert(
      fc.property(assumptionsArb, (a) => {
        for (const r of runProjection(a).rows) {
          // /10000→×10000 の往復で生じる浮動小数の丸めは相対誤差で許容する
          const lhs = r.totalBase * 10000;
          const rhs = r.invBase + r.cash;
          const tol = 1e-9 * Math.max(1, Math.abs(rhs));
          expect(Math.abs(lhs - rhs)).toBeLessThanOrEqual(tol);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('利回りが 保守≤基準≤楽観 なら 総資産も 保守≤基準≤楽観', () => {
    fc.assert(
      fc.property(assumptionsArb, fc.tuple(
        fc.float({ min: 0, max: Math.fround(0.15), noNaN: true }),
        fc.float({ min: 0, max: Math.fround(0.15), noNaN: true }),
        fc.float({ min: 0, max: Math.fround(0.15), noNaN: true }),
      ), (a, rates) => {
        const [rc, rb, ro] = [...rates].sort((x, y) => x - y);
        const sorted: Assumptions = { ...a, rConservative: rc, rBase: rb, rOptimistic: ro };
        for (const r of runProjection(sorted).rows) {
          // 同符号の利回り差による単調性。浮動小数ノイズ分の相対許容を持たせる
          const tol = (x: number) => 1e-9 * Math.max(1, Math.abs(x));
          expect(r.totalConservative).toBeLessThanOrEqual(r.totalBase + tol(r.totalBase));
          expect(r.totalBase).toBeLessThanOrEqual(r.totalOptimistic + tol(r.totalOptimistic));
        }
      }),
      { numRuns: 150 },
    );
  });
});

const mcParamsArb: fc.Arbitrary<MCParams> = fc.record({
  muArith: fc.float({ min: 0, max: Math.fround(0.15), noNaN: true }),
  sigma: fc.float({ min: Math.fround(0.01), max: Math.fround(0.4), noNaN: true }),
  leverage: fc.float({ min: 1, max: 3, noNaN: true }),
  borrowRate: fc.float({ min: 0, max: Math.fround(0.05), noNaN: true }),
  monthlyMan: fc.integer({ min: 0, max: 50 }),
  idecoReinvest: fc.boolean(),
  startW: fc.integer({ min: 0, max: 100_000_000 }),
  age0: fc.integer({ min: 20, max: 70 }),
  ageN: fc.integer({ min: 20, max: 95 }),
  nPaths: fc.constant(300),
  taxRate: fc.float({ min: 0, max: Math.fround(0.5), noNaN: true }),
  idecoAnnualFee: fc.integer({ min: 0, max: 5000 }),
  targetA: fc.integer({ min: 0, max: 30000 }),
  targetB: fc.integer({ min: 0, max: 30000 }),
});

describe('robustness — montecarlo の不変条件', () => {
  it('パーセンタイル順序 p10≤p25≤p50≤p75≤p90 が常に成立', () => {
    fc.assert(
      fc.property(mcParamsArb, (p) => {
        const { percentiles } = runMonteCarlo(p, 42);
        const { p10, p25, p50, p75, p90 } = percentiles;
        for (let i = 0; i < p50.length; i++) {
          expect(p10[i]).toBeLessThanOrEqual(p25[i] + 1e-6);
          expect(p25[i]).toBeLessThanOrEqual(p50[i] + 1e-6);
          expect(p50[i]).toBeLessThanOrEqual(p75[i] + 1e-6);
          expect(p75[i]).toBeLessThanOrEqual(p90[i] + 1e-6);
        }
      }),
      { numRuns: 80 },
    );
  });

  it('確率は [0,1]、主要指標は有限', () => {
    fc.assert(
      fc.property(mcParamsArb, (p) => {
        const res = runMonteCarlo(p, 42);
        for (const prob of [res.prob45A, res.prob50B, res.prob55B]) {
          expect(prob).toBeGreaterThanOrEqual(0);
          expect(prob).toBeLessThanOrEqual(1);
        }
        expect(finite(res.medianAt60)).toBe(true);
        expect(finite(res.p10At60)).toBe(true);
        expect(finite(res.geomMean)).toBe(true);
        expect(res.ages.length).toBe(res.percentiles.p50.length);
      }),
      { numRuns: 80 },
    );
  });
});

describe('robustness — sanitizeAssumptions', () => {
  it('壊れた入力でも妥当な Assumptions を返し、endAge ≥ currentAge を保証', () => {
    fc.assert(
      fc.property(fc.anything(), (junk) => {
        const a = sanitizeAssumptions(junk);
        expect(a.endAge).toBeGreaterThanOrEqual(a.currentAge);
        for (const v of [a.currentAge, a.endAge, a.startCash, a.takeHomeMonthly, a.rBase, a.taxRate]) {
          expect(finite(v)).toBe(true);
        }
        expect(Array.isArray(a.lifeEvents)).toBe(true);
        expect(Array.isArray(a.bigExpenses)).toBe(true);
        // サニタイズ後の値は必ず計算可能
        expect(runProjection(a).rows.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 200 },
    );
  });

  it('型違い（文字列の数値・余計なキー）を矯正する', () => {
    const a = sanitizeAssumptions({
      currentAge: '40', endAge: '35', startCash: 'abc', taxRate: 5, rBase: 'x', junk: 1,
    } as unknown);
    expect(a.currentAge).toBe(40);
    expect(a.endAge).toBe(40);          // currentAge を下回らない
    expect(a.startCash).toBe(DEFAULTS.startCash); // 解析不能→既定値
    expect(a.taxRate).toBe(1);          // 0..1 にクランプ
    expect(a.rBase).toBe(DEFAULTS.rBase);
  });
});
