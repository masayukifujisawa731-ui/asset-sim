import { NISA_LIFETIME_LIMIT, NISA_INITIAL_CONSUMED, getIdecoMonthlyByYear } from './constants';
import type { Assumptions, ProjectionRow, ProjectionResult, GoalAge } from './types';

function fvCoeff(r: number): number {
  // 1+r ≤ 0 だと月利が定義できない。元本全損相当の非現実領域なので
  // 月次積立は年内据え置き（係数12）に縮退させ、NaN伝播を防ぐ。
  if (1 + r <= 0) return 12;
  // 月利 i = (1+r)^(1/12) - 1。pow(...)-1 はゼロ近傍で桁落ちするため
  // log1p/expm1 で安定に計算する（極小 r でも精度・単調性を保つ）。
  const i = Math.expm1(Math.log1p(r) / 12);
  // r=0 など i=0 では r/i が Infinity。月利ゼロの極限の係数 12 に縮退。
  if (i === 0) return 12;
  return r / i;
}

function findGoalAge(
  rows: ProjectionRow[],
  target: number,
  getTotal: (r: ProjectionRow) => number,
): number | null {
  const row = rows.find((r) => getTotal(r) >= target);
  return row ? row.age : null;
}

export function runProjection(a: Assumptions): ProjectionResult {
  const fvC = fvCoeff(a.rConservative);
  const fvB = fvCoeff(a.rBase);
  const fvO = fvCoeff(a.rOptimistic);

  // endAge < currentAge でも最低1行（現在年齢）を返し、呼び出し側の
  // rows[rows.length-1] 参照がクラッシュしないようにする。
  const endAge = Math.max(a.endAge, a.currentAge);

  const rows: ProjectionRow[] = [];

  let cash = a.startCash;
  let invC = a.startSecurities;
  let invB = a.startSecurities;
  let invO = a.startSecurities;
  let lockedIdeco = 0;
  let refundPool = 0;
  let nisaCumNoIdeco = NISA_INITIAL_CONSUMED;
  let nisaCumWithIdeco = NISA_INITIAL_CONSUMED;
  let nisaFullReached = nisaCumNoIdeco >= NISA_LIFETIME_LIMIT;
  let nisaWithIdecoReached = nisaCumWithIdeco >= NISA_LIFETIME_LIMIT;

  for (let age = a.currentAge; age <= endAge; age++) {
    const t = age - a.currentAge;
    const year = a.currentYear + t;

    // ライフステージの変化を累積適用（その年齢以降のイベントを合算）
    const activeEvents = a.lifeEvents.filter((e) => age >= e.age);
    const expenseDelta = activeEvents.reduce((s, e) => s + e.expenseDeltaMonthly, 0);
    const investDelta = activeEvents.reduce((s, e) => s + e.investDeltaMonthly, 0);

    const monthlyInv = Math.max(0, a.baseInvestMonthly + investDelta);
    const annualInv = monthlyInv * 12;
    const monthlyExp = a.expenseMonthly + expenseDelta;

    // 大型イベント出費（その年齢の年に発生する分を合算）
    const oneTime = a.bigExpenses
      .filter((e) => e.age === age)
      .reduce((s, e) => s + e.amount, 0);

    const cashAddYear = (a.takeHomeMonthly - monthlyExp - monthlyInv) * 12 + a.annualBonus;
    cash = cash + cashAddYear - oneTime;

    invC = invC * (1 + a.rConservative) + monthlyInv * fvC;
    invB = invB * (1 + a.rBase) + monthlyInv * fvB;
    invO = invO * (1 + a.rOptimistic) + monthlyInv * fvO;

    const idecoMonthly = a.idecoEnabled
      ? getIdecoMonthlyByYear(year, a.idecoMonthly2026, a.idecoMonthlyFrom2027)
      : 0;
    const idecoContribAnnual = idecoMonthly * 12;

    lockedIdeco = a.idecoEnabled
      ? lockedIdeco * (1 + a.rBase) + (idecoContribAnnual / 12) * fvB
      : 0;

    const refund = a.idecoEnabled ? idecoContribAnnual * a.taxRate - a.idecoAnnualFee : 0;
    refundPool = a.idecoEnabled ? refundPool * (1 + a.rBase) + refund : 0;

    const totalWithIdeco = (invB + cash + refundPool) / 10000;
    const liquid = (invB + cash + refundPool - lockedIdeco) / 10000;

    // NISA累積トラッカー
    if (t === 0) {
      // 初年度は既消化分のまま
    } else {
      if (!nisaFullReached) {
        nisaCumNoIdeco = Math.min(NISA_LIFETIME_LIMIT, nisaCumNoIdeco + monthlyInv * 12);
        nisaFullReached = nisaCumNoIdeco >= NISA_LIFETIME_LIMIT;
      }
      if (!nisaWithIdecoReached) {
        const nisaMonthly = Math.max(0, monthlyInv - idecoMonthly);
        nisaCumWithIdeco = Math.min(NISA_LIFETIME_LIMIT, nisaCumWithIdeco + nisaMonthly * 12);
        nisaWithIdecoReached = nisaCumWithIdeco >= NISA_LIFETIME_LIMIT;
      }
    }

    rows.push({
      year,
      age,
      annualInv,
      cash,
      invConservative: invC,
      invBase: invB,
      invOptimistic: invO,
      totalConservative: (invC + cash) / 10000,
      totalBase: (invB + cash) / 10000,
      totalOptimistic: (invO + cash) / 10000,
      lockedIdeco,
      refund,
      refundPool,
      totalWithIdeco,
      liquid,
      nisaCumNoIdeco,
      nisaCumWithIdeco,
      nisaFullReached,
      nisaWithIdecoReached,
    });
  }

  const goalFor = (target: number): GoalAge => ({
    conservative: findGoalAge(rows, target, (r) => r.totalConservative),
    base: findGoalAge(rows, target, (r) => r.totalBase),
    optimistic: findGoalAge(rows, target, (r) => r.totalOptimistic),
    withIdeco: findGoalAge(rows, target, (r) => r.totalWithIdeco),
  });

  const goalA = goalFor(a.targetA);
  const goalB = goalFor(a.targetB);

  const nisaFullAge = rows.find((r) => r.nisaFullReached)?.age ?? null;
  const nisaWithIdecoAge = rows.find((r) => r.nisaWithIdecoReached)?.age ?? null;

  return { rows, goalA, goalB, nisaFullAge, nisaWithIdecoAge };
}
