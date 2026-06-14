import { Field } from './Field';

interface FieldShellProps {
  label: string;
  hint?: string;
}

interface MoneyFieldProps extends FieldShellProps {
  valueYen: number;
  onChange: (yen: number) => void;
  sliderMax?: number;
  stepFine?: number;
  stepCoarse?: number;
  unit?: string;
}

export function MoneyField({
  label,
  hint,
  valueYen,
  onChange,
  sliderMax = 100,
  stepFine = 1,
  stepCoarse = 10,
  unit = '万円',
}: MoneyFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      {hint && <div className="field-hint">{hint}</div>}
      <Field
        value={valueYen / 10000}
        onChange={(m) => onChange(Math.round(m * 10000))}
        unit={unit}
        stepFine={stepFine}
        stepCoarse={stepCoarse}
        min={0}
        slider
        sliderMin={0}
        sliderMax={sliderMax}
        sliderStep={stepFine}
        ariaLabel={label}
      />
    </div>
  );
}

interface IntFieldProps extends FieldShellProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  stepCoarse?: number;
  unit?: string;
}

export function IntField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  stepCoarse = 5,
  unit = '',
}: IntFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      {hint && <div className="field-hint">{hint}</div>}
      <Field
        value={value}
        onChange={onChange}
        unit={unit}
        stepFine={1}
        stepCoarse={stepCoarse}
        min={min}
        max={max}
        decimals={0}
        slider
        sliderMin={min}
        sliderMax={max}
        ariaLabel={label}
      />
    </div>
  );
}

interface PlainNumFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  stepFine?: number;
  stepCoarse?: number;
  unit?: string;
}

export function PlainNumField({
  label,
  value,
  onChange,
  stepFine = 1,
  stepCoarse = 10,
  unit = '',
}: PlainNumFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <Field
        value={value}
        onChange={onChange}
        unit={unit}
        stepFine={stepFine}
        stepCoarse={stepCoarse}
        min={0}
        decimals={0}
        ariaLabel={label}
      />
    </div>
  );
}

interface RateFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

export function RateField({ label, value, onChange }: RateFieldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <Field
        value={value * 100}
        onChange={(p) => onChange(Number((p / 100).toFixed(4)))}
        unit="%"
        stepFine={0.1}
        stepCoarse={1}
        min={0}
        decimals={1}
        slider
        sliderMin={0}
        sliderMax={12}
        sliderStep={0.5}
        ariaLabel={label}
      />
    </div>
  );
}
