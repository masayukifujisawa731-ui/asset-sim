import type { Assumptions } from './types';
import { createDefaultAssumptions } from './constants';

const KEY = 'asset-sim:assumptions:v1';

/**
 * 保存済みの前提を読み込む。
 * 既定値に対して保存値を上書きマージするため、将来フィールドが増えても
 * 欠けたキーは既定値で補完され壊れない。
 */
export function loadAssumptions(): Assumptions {
  const base = createDefaultAssumptions();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Assumptions>;
    if (!saved || typeof saved !== 'object') return base;
    // 配列・スカラーともにトップレベルの上書きで十分（ネストしたオブジェクトは無い）
    return { ...base, ...saved };
  } catch {
    return base;
  }
}

export function saveAssumptions(a: Assumptions): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // 容量超過・プライベートモード等は黙って無視（試算は継続できる）
  }
}

export function clearAssumptions(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
