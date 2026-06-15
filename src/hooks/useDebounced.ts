import { useEffect, useState } from 'react';

/**
 * value の変化が delay ミリ秒落ち着いてから反映する。
 * 初期値は即時に返すため、初回描画は遅延しない。
 * スライダー連射のような高頻度更新で重い再計算を間引くのに使う。
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return settled;
}
