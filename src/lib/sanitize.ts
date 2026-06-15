import type { Assumptions, LifeEvent, BigExpense } from './types';
import { createDefaultAssumptions } from './constants';

/** 有限数なら返し、そうでなければ fallback。範囲があればクランプ。 */
function num(v: unknown, fallback: number, min?: number, max?: number): number {
  let n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) n = fallback;
  if (min != null) n = Math.max(min, n);
  if (max != null) n = Math.min(max, n);
  return n;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function sanitizeLifeEvents(v: unknown): LifeEvent[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e): e is Record<string, unknown> => e != null && typeof e === 'object')
    .map((e, i) => ({
      id: str(e.id, `evt-${i}`),
      age: num(e.age, 45, 0, 120),
      label: str(e.label, '変化'),
      expenseDeltaMonthly: num(e.expenseDeltaMonthly, 0),
      investDeltaMonthly: num(e.investDeltaMonthly, 0),
    }));
}

function sanitizeBigExpenses(v: unknown): BigExpense[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e): e is Record<string, unknown> => e != null && typeof e === 'object')
    .map((e, i) => ({
      id: str(e.id, `exp-${i}`),
      age: num(e.age, 45, 0, 120),
      label: str(e.label, '出費'),
      amount: num(e.amount, 0, 0),
    }));
}

/**
 * 任意の（壊れている可能性のある）入力を、計算が NaN/クラッシュしない
 * 妥当な Assumptions に矯正する。型・範囲・相互制約（endAge ≥ currentAge）を保証。
 */
export function sanitizeAssumptions(raw: unknown): Assumptions {
  const d = createDefaultAssumptions();
  if (raw == null || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;

  const currentAge = num(r.currentAge, d.currentAge, 0, 120);
  // endAge は currentAge を下回らないことを保証
  const endAge = Math.max(currentAge, num(r.endAge, d.endAge, 0, 120));

  return {
    currentAge,
    currentYear: num(r.currentYear, d.currentYear, 1900, 2200),
    endAge,
    targetA: num(r.targetA, d.targetA, 0),
    targetB: num(r.targetB, d.targetB, 0),
    startSecurities: num(r.startSecurities, d.startSecurities, 0),
    startCash: num(r.startCash, d.startCash, 0),
    cashFloor: num(r.cashFloor, d.cashFloor, 0),
    takeHomeMonthly: num(r.takeHomeMonthly, d.takeHomeMonthly, 0),
    annualBonus: num(r.annualBonus, d.annualBonus, 0),
    expenseMonthly: num(r.expenseMonthly, d.expenseMonthly, 0),
    baseInvestMonthly: num(r.baseInvestMonthly, d.baseInvestMonthly, 0),
    lifeEvents: sanitizeLifeEvents(r.lifeEvents),
    bigExpenses: sanitizeBigExpenses(r.bigExpenses),
    idecoEnabled: bool(r.idecoEnabled, d.idecoEnabled),
    idecoMonthly2026: num(r.idecoMonthly2026, d.idecoMonthly2026, 0),
    idecoMonthlyFrom2027: num(r.idecoMonthlyFrom2027, d.idecoMonthlyFrom2027, 0),
    taxRate: num(r.taxRate, d.taxRate, 0, 1),
    idecoAnnualFee: num(r.idecoAnnualFee, d.idecoAnnualFee, 0),
    // 利回りは -1（全損）より大きく、過大入力もクランプ
    rConservative: num(r.rConservative, d.rConservative, -0.99, 1),
    rBase: num(r.rBase, d.rBase, -0.99, 1),
    rOptimistic: num(r.rOptimistic, d.rOptimistic, -0.99, 1),
  };
}
