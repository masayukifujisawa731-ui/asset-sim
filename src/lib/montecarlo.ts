import { DEFAULT_CURRENT_YEAR, getIdecoMonthlyByYear } from './constants';
import type { MCParams, MCResult, StrategyResult } from './types';

// mulberry32 — シード固定の擬似乱数 (テスト再現性)
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box–Muller 変換で標準正規乱数を生成
function makeGauss(rand: () => number) {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u, v;
    do {
      u = rand() * 2 - 1;
      v = rand() * 2 - 1;
    } while (u * u + v * v >= 1 || u === 0);
    const mag = Math.sqrt(-2 * Math.log(u * u + v * v) / (u * u + v * v));
    spare = v * mag;
    return u * mag;
  };
}

// 対数正規パラメータ計算
function lognormalParams(aEff: number, sdEff: number) {
  // 1+aEff ≤ 0（実効リターン −100%以下）は対数正規の前提を満たさない。
  // log/除算が NaN/Infinity になるため、実効的な下限近傍にクランプする。
  const base = Math.max(1 + aEff, 1e-9);
  const v = Math.log(1 + (sdEff * sdEff) / (base * base));
  const m = Math.log(base) - v / 2;
  const s = Math.sqrt(v);
  return { m, s };
}

// パーセンタイル (ソート済み配列 arr, p=0..1)
function percentile(sorted: number[], p: number): number {
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx];
}

// iDeCo純還付の年次定数 (taxRate・idecoAnnualFee を注入)
function idecoRefund(y: number, p: MCParams): number {
  if (!p.idecoReinvest) return 0;
  const year = (p.currentYear ?? DEFAULT_CURRENT_YEAR) + y;
  const monthly = getIdecoMonthlyByYear(
    year,
    p.idecoMonthly2026,
    p.idecoMonthlyFrom2027,
  );
  return monthly * 12 * p.taxRate - p.idecoAnnualFee;
}

function runPaths(
  p: MCParams,
  aEff: number,
  sdEff: number,
  rand: (() => number) | null,
): number[][] {
  const gauss = makeGauss(rand ?? Math.random);
  const { m, s } = lognormalParams(aEff, sdEff);
  const steps = Math.max(1, p.ageN - p.age0 + 1); // 含む: 開始〜終了年齢（最低1）
  const nPaths = Math.max(1, Math.floor(p.nPaths)); // パーセンタイル計算のため最低1本
  const allPaths: number[][] = [];

  for (let path = 0; path < nPaths; path++) {
    let W = p.startW;
    const record: number[] = [];
    for (let y = 0; y < steps; y++) {
      const r = Math.exp(m + s * gauss()) - 1;
      W = W * (1 + r);
      const C = p.monthlyMan * 10000 * 12 + idecoRefund(y, p);
      W = W + C;
      record.push(W / 10000);
    }
    allPaths.push(record);
  }
  return allPaths;
}

function collectPercentiles(allPaths: number[][], steps: number) {
  const p10: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p90: number[] = [];

  for (let y = 0; y < steps; y++) {
    const col = allPaths.map((path) => path[y]).sort((a, b) => a - b);
    p10.push(percentile(col, 0.1));
    p25.push(percentile(col, 0.25));
    p50.push(percentile(col, 0.5));
    p75.push(percentile(col, 0.75));
    p90.push(percentile(col, 0.9));
  }
  return { p10, p25, p50, p75, p90 };
}

function probAtAge(
  allPaths: number[][],
  age0: number,
  targetAge: number,
  targetMan: number,
): number {
  const y = targetAge - age0;
  if (y < 0 || y >= allPaths[0].length) return 0;
  const count = allPaths.filter((path) => path[y] >= targetMan).length;
  return count / allPaths.length;
}

export function runMonteCarlo(p: MCParams, seed?: number): MCResult {
  const rand = seed !== undefined ? mulberry32(seed) : null;

  const aEff = p.leverage * p.muArith - (p.leverage - 1) * p.borrowRate;
  const sdEff = p.leverage * p.sigma;
  const { m } = lognormalParams(aEff, sdEff);
  const geomMean = Math.exp(m) - 1;

  const steps = Math.max(1, p.ageN - p.age0 + 1);
  const ages = Array.from({ length: steps }, (_, i) => p.age0 + i);

  const allPaths = runPaths(p, aEff, sdEff, rand);
  const percentiles = collectPercentiles(allPaths, steps);

  const finalIdx = steps - 1;
  const medianAt60 = percentiles.p50[finalIdx];
  const p10At60 = percentiles.p10[finalIdx];

  return {
    ages,
    percentiles,
    prob50B: probAtAge(allPaths, p.age0, 50, p.targetB),
    prob55B: probAtAge(allPaths, p.age0, 55, p.targetB),
    prob45A: probAtAge(allPaths, p.age0, 45, p.targetA),
    medianAt60,
    p10At60,
    geomMean,
  };
}

export function runStrategyComparison(base: MCParams, seed?: number): StrategyResult[] {
  const strategies: Array<{ label: string; aArith: number; sigma: number }> = [
    { label: 'ノーレバ・オルカン', aArith: base.muArith, sigma: base.sigma },
    { label: '軽いティルト', aArith: 0.08, sigma: 0.26 },
    {
      label: '3倍レバ(過剰)',
      aArith: 3 * base.muArith - 2 * base.borrowRate,
      sigma: 3 * base.sigma,
    },
  ];

  return strategies.map((s, i) => {
    const p: MCParams = {
      ...base,
      muArith: s.aArith,
      sigma: s.sigma,
      leverage: 1,
      nPaths: 2500,
    };
    const rand = seed !== undefined ? mulberry32(seed + i * 999_999) : null;
    const aEff = p.muArith;
    const sdEff = p.sigma;
    const steps = Math.max(1, p.ageN - p.age0 + 1);
    const allPaths = runPaths(p, aEff, sdEff, rand);
    const pc = collectPercentiles(allPaths, steps);
    const finalIdx = steps - 1;
    return {
      label: s.label,
      aArith: s.aArith,
      sigma: s.sigma,
      medianAt60: pc.p50[finalIdx],
      p10At60: pc.p10[finalIdx],
    };
  });
}
