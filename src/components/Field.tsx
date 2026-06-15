import { NumInput } from './NumInput';

interface FieldProps {
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  stepFine: number;
  stepCoarse?: number;
  min?: number;
  max?: number;
  decimals?: number;
  slider?: boolean;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  compact?: boolean;
  ariaLabel?: string;
}

const lbl = (n: number) => String(n);

/**
 * 数値入力の共通コントロール。
 * −大 −小 [数値入力] +小 +大 のステッパー＋（任意で）スライダー。
 * 直接タイピングは NumInput が途中状態を許容し、確定値は min/max でクランプ。
 */
export function Field({
  value, onChange, unit, stepFine, stepCoarse, min, max,
  decimals, slider, sliderMin = 0, sliderMax = 100, sliderStep, compact, ariaLabel,
}: FieldProps) {
  // value が NaN/undefined だと数値入力が空欄表示になるため安全側に矯正
  const safe = Number.isFinite(value) ? value : (min ?? 0);
  const dec = decimals ?? (stepFine < 1 ? 1 : 0);
  const clamp = (n: number) => {
    let r = Number(n.toFixed(dec));
    if (min != null) r = Math.max(min, r);
    if (max != null) r = Math.min(max, r);
    return r;
  };
  const bump = (d: number) => onChange(clamp(safe + d));

  return (
    <div className={`field-ctl${compact ? ' compact' : ''}`}>
      <div className="stepper">
        {!compact && stepCoarse != null && (
          <button type="button" className="stp coarse" onClick={() => bump(-stepCoarse)}
            aria-label={`${stepCoarse}減らす`}>−{lbl(stepCoarse)}</button>
        )}
        <button type="button" className="stp" onClick={() => bump(-stepFine)}
          aria-label={`${stepFine}減らす`}>{compact ? '−' : `−${lbl(stepFine)}`}</button>
        <div className="num-box">
          <NumInput
            value={Number(safe.toFixed(dec))}
            step={stepFine}
            min={min}
            max={max}
            onChange={(n) => onChange(clamp(n))}
            aria-label={ariaLabel}
          />
          {unit && <span>{unit}</span>}
        </div>
        <button type="button" className="stp" onClick={() => bump(stepFine)}
          aria-label={`${stepFine}増やす`}>{compact ? '＋' : `+${lbl(stepFine)}`}</button>
        {!compact && stepCoarse != null && (
          <button type="button" className="stp coarse" onClick={() => bump(stepCoarse)}
            aria-label={`${stepCoarse}増やす`}>+{lbl(stepCoarse)}</button>
        )}
      </div>
      {slider && (
        <input type="range" className="ctl-slider"
          min={sliderMin} max={sliderMax} step={sliderStep ?? stepFine}
          value={Math.min(sliderMax, Math.max(sliderMin, safe))}
          onChange={(e) => onChange(clamp(Number(e.target.value)))} aria-label={ariaLabel} />
      )}
    </div>
  );
}
