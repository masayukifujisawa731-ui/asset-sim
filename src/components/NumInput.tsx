import { useState } from 'react';

interface Props {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * タイピングと喧嘩しない数値入力。
 * 編集中は文字列ドラフトを保持し「2.」「空」などの途中状態を許容。
 * 値が確定した瞬間だけ onChange を呼ぶ。非編集中は外部値（スライダー・リセット）を即反映。
 */
export function NumInput({ value, onChange, step, min, max, className, ...rest }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft !== null ? draft : String(value);

  return (
    <input
      type="number"
      inputMode="decimal"
      className={className}
      step={step}
      min={min}
      max={max}
      value={shown}
      aria-label={rest['aria-label']}
      onFocus={(e) => {
        setDraft(String(value));
        e.target.select();
      }}
      onChange={(e) => {
        const s = e.target.value;
        setDraft(s);
        // 途中状態（空・"-"・末尾ドット）は確定しない
        if (s !== '' && s !== '-' && !s.endsWith('.')) {
          const n = Number(s);
          if (!Number.isNaN(n)) onChange(n);
        }
      }}
      onBlur={() => {
        if (draft !== null) {
          const n = Number(draft);
          if (draft !== '' && !Number.isNaN(n)) onChange(n);
          setDraft(null); // 外部値の表示へ戻す
        }
      }}
    />
  );
}
