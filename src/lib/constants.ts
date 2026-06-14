import type { Assumptions } from './types';

// 制度・既定値 — 法改正時はここだけ修正する

// iDeCo 拠出上限
// 2025年成立の年金制度改正: 2026年12月拠出分(=2027年1月引落分)から
// 会社員・企業年金なしは月6.2万に引き上げ
export const IDECO_MONTHLY_2026 = 23_000;          // 現行上限 (円/月)
export const IDECO_MONTHLY_FROM_2027 = 62_000;     // 改正後上限 (円/月)
export const IDECO_NEW_LIMIT_START_YEAR = 2027;
export const IDECO_ANNUAL_FEE = 2_052;             // 口座手数料 (円/年)

// NISA (2024年改正後・恒久化)
export const NISA_LIFETIME_LIMIT = 18_000_000;    // 生涯投資枠 (円)
export const NISA_INITIAL_CONSUMED = 600_000;     // 初年度既消化分 (円)

// 税率既定値
export const DEFAULT_TAX_RATE = 0.30;             // 所得税20%+住民税10%
export const EXIT_TAX_RATE = 0.2;                 // 譲渡益課税 (課税口座, 参考)
export const DEFAULT_CURRENT_YEAR = 2026;

export function getIdecoMonthlyByYear(
  year: number,
  monthlyBefore2027 = IDECO_MONTHLY_2026,
  monthlyFrom2027 = IDECO_MONTHLY_FROM_2027,
): number {
  return year < IDECO_NEW_LIMIT_START_YEAR ? monthlyBefore2027 : monthlyFrom2027;
}

// 既定の入力値
export const DEFAULTS: Assumptions = {
  currentAge: 30,
  currentYear: DEFAULT_CURRENT_YEAR,
  endAge: 60,
  targetA: 3000,
  targetB: 5000,
  startSecurities: 1_000_000,
  startCash: 1_000_000,
  cashFloor: 1_000_000,
  takeHomeMonthly: 300_000,
  annualBonus: 0,
  expenseMonthly: 250_000,
  baseInvestMonthly: 50_000,
  lifeEvents: [],
  bigExpenses: [],
  idecoEnabled: false,
  idecoMonthly2026: IDECO_MONTHLY_2026,
  idecoMonthlyFrom2027: IDECO_MONTHLY_FROM_2027,
  taxRate: DEFAULT_TAX_RATE,
  idecoAnnualFee: IDECO_ANNUAL_FEE,
  rConservative: 0.04,
  rBase: 0.06,
  rOptimistic: 0.08,
};

// localStorage/初期化用にarrayを含む深いコピーを返す
export function createDefaultAssumptions(): Assumptions {
  return structuredClone(DEFAULTS);
}
