import type { Assumptions } from './types';
import { createDefaultAssumptions } from './constants';
import { sanitizeAssumptions } from './sanitize';

const KEY = 'asset-sim:assumptions:v1';

/**
 * 保存済みの前提を読み込む。
 * 保存値は型・範囲・相互制約をサニタイズして返すため、壊れた/古い/手で
 * 書き換えられたデータでも計算が NaN・クラッシュしない。
 */
export function loadAssumptions(): Assumptions {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createDefaultAssumptions();
    return sanitizeAssumptions(JSON.parse(raw));
  } catch {
    return createDefaultAssumptions();
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
