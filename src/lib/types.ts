// ライフステージの変化（ある年齢から毎月の支出・投資が変わるイベント）
export interface LifeEvent {
  id: string;
  age: number;                 // この年齢以降に適用
  label: string;
  expenseDeltaMonthly: number; // 円/月 月支出の変化(+増/-減)
  investDeltaMonthly: number;  // 円/月 月投資額の変化(+増/-減)
}

// 大型イベント出費（一度きりの大きな支出）
export interface BigExpense {
  id: string;
  age: number;     // この年齢の年に発生
  label: string;
  amount: number;  // 円
}

export interface Assumptions {
  currentAge: number;
  currentYear: number;
  endAge: number;
  targetA: number;            // 目標金額A（万円）
  targetB: number;            // 目標金額B（万円）
  startSecurities: number;
  startCash: number;
  cashFloor: number;
  nisaUsedAtStart: number;    // 開始時点で既に使ったNISA生涯枠 (円)
  takeHomeMonthly: number;
  annualBonus: number;        // 円/年 手取りボーナス(現金へ積み上げ)
  expenseMonthly: number;     // 基準の月支出
  baseInvestMonthly: number;  // 基準の月投資額
  lifeEvents: LifeEvent[];
  bigExpenses: BigExpense[];
  idecoEnabled: boolean;
  idecoMonthly2026: number;
  idecoMonthlyFrom2027: number;
  taxRate: number;
  idecoAnnualFee: number;
  rConservative: number;
  rBase: number;
  rOptimistic: number;
  inflationRate: number;      // 年率インフレ（実質値換算用）
}

export interface ProjectionRow {
  year: number;
  age: number;
  annualInv: number;
  cash: number;
  invConservative: number;
  invBase: number;
  invOptimistic: number;
  totalConservative: number; // 万円
  totalBase: number;         // 万円
  totalOptimistic: number;   // 万円
  lockedIdeco: number;       // iDeCo残高 (円)
  refund: number;            // 年間節税還付 (円)
  refundPool: number;        // 節税還付累積 (円)
  totalWithIdeco: number;    // iDeCo込み総資産基準 (万円)
  liquid: number;            // 流動資産 (万円)
  nisaCumNoIdeco: number;    // NISA累積 全額NISA (円)
  nisaCumWithIdeco: number;  // NISA累積 iDeCo併用 (円)
  nisaFullReached: boolean;
  nisaWithIdecoReached: boolean;
}

export interface GoalAge {
  conservative: number | null;
  base: number | null;
  optimistic: number | null;
  withIdeco: number | null;
}

export interface ProjectionResult {
  rows: ProjectionRow[];
  goalA: GoalAge;  // targetA への到達年齢
  goalB: GoalAge;  // targetB への到達年齢
  nisaFullAge: number | null;
  nisaWithIdecoAge: number | null;
}

export interface MCParams {
  muArith: number;
  sigma: number;
  leverage: number;
  borrowRate: number;
  monthlyMan: number;  // 万円
  idecoReinvest: boolean;
  startW: number;      // 円
  age0: number;
  ageN: number;
  currentYear?: number;
  nPaths: number;
  taxRate: number;
  idecoAnnualFee: number;
  idecoMonthly2026?: number;
  idecoMonthlyFrom2027?: number;
  targetA: number;  // 目標金額A（万円）
  targetB: number;  // 目標金額B（万円）
}

export interface MCPercentiles {
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
}

export interface MCResult {
  ages: number[];
  percentiles: MCPercentiles;
  prob50B: number;   // 50歳で targetB 以上
  prob55B: number;   // 55歳で targetB 以上
  prob45A: number;   // 45歳で targetA 以上
  medianAt60: number;
  p10At60: number;
  geomMean: number; // 実質複利(中央値) = exp(m)-1
}

export interface StrategyResult {
  label: string;
  aArith: number;
  sigma: number;
  medianAt60: number;
  p10At60: number;
}
