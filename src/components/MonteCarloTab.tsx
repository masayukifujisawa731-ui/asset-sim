import { useState, useMemo } from 'react';
import type { Assumptions, MCParams } from '../lib/types';
import { runMonteCarlo, runStrategyComparison } from '../lib/montecarlo';
import { formatMan, formatPct } from '../lib/format';
import { FanChart } from './Charts/FanChart';
import { Field } from './Field';

interface Props {
  assumptions: Assumptions;
}

function pct(v: number): string {
  return formatPct(v);
}

function man(v: number): string {
  return formatMan(Math.round(v), 0, 2);
}

// スライダー＋ステッパー＋説明の共通コントロール
function Control({
  label, hint, value, onChange, min, max, stepFine, stepCoarse, unit, decimals = 0,
}: {
  label: string; hint?: string; value: number; onChange: (v: number) => void;
  min: number; max: number; stepFine: number; stepCoarse?: number; unit: string; decimals?: number;
}) {
  return (
    <div className="mc-field">
      <label>{label}</label>
      {hint && <div className="field-hint">{hint}</div>}
      <Field value={value} onChange={onChange} unit={unit}
        stepFine={stepFine} stepCoarse={stepCoarse} min={min} max={max} decimals={decimals}
        slider sliderMin={min} sliderMax={max} sliderStep={stepFine} ariaLabel={label} />
    </div>
  );
}

export function MonteCarloTab({ assumptions: a }: Props) {
  const [muArith, setMuArith] = useState(7.5);   // %
  const [sigma, setSigma] = useState(18);        // %
  const [leverage, setLeverage] = useState(1.0);
  const [monthlyMan, setMonthlyMan] = useState(a.baseInvestMonthly / 10000);
  const [idecoReinvest, setIdecoReinvest] = useState(false);

  const params: MCParams = useMemo(() => ({
    muArith: muArith / 100,
    sigma: sigma / 100,
    leverage,
    borrowRate: 0.025,
    monthlyMan,
    idecoReinvest: a.idecoEnabled && idecoReinvest,
    startW: a.startSecurities,
    age0: a.currentAge,
    ageN: a.endAge,
    currentYear: a.currentYear,
    nPaths: 4000,
    taxRate: a.taxRate,
    idecoAnnualFee: a.idecoAnnualFee,
    idecoMonthly2026: a.idecoMonthly2026,
    idecoMonthlyFrom2027: a.idecoMonthlyFrom2027,
    targetA: a.targetA,
    targetB: a.targetB,
  }), [muArith, sigma, leverage, monthlyMan, idecoReinvest, a]);

  const result = useMemo(() => runMonteCarlo(params), [params]);
  const strategies = useMemo(() => runStrategyComparison(params), [params]);

  const reset = () => {
    setMuArith(7.5); setSigma(18); setLeverage(1.0);
    setMonthlyMan(a.baseInvestMonthly / 10000); setIdecoReinvest(false);
  };

  return (
    <div className="mc-layout">
      <div className="intro-card">
        <strong>このタブは何を見る？</strong>
        <p>
          リターンを毎年ランダムに変動させて<b>数千回シミュレーション</b>し、「運が良ければ／悪ければ」の<b>結果のばらつき</b>を見ます。
          資産・年齢・目標金額は「資産推移」タブと共有。下のつまみで前提を調整できます。
        </p>
      </div>

      {/* 「資産推移」タブと共有している前提の確認 */}
      <div className="shared-strip" aria-label="「資産推移」タブと共有している前提">
        <span className="ss-title">「資産推移」タブの前提</span>
        <span className="ss-chip"><i>期間</i>{a.currentAge}→{a.endAge}歳</span>
        <span className="ss-chip"><i>開始証券資産</i>{man(a.startSecurities / 10000)}円</span>
        <span className="ss-chip"><i>目標A</i>{a.targetA.toLocaleString()}万</span>
        <span className="ss-chip"><i>目標B</i>{a.targetB.toLocaleString()}万</span>
        <span className="ss-chip"><i>iDeCo</i>{a.idecoEnabled ? '利用' : '使わない'}</span>
        <span className="ss-note">変更は「資産推移」タブで</span>
      </div>

      {/* Controls */}
      <div className="card">
        <h2>前提を調整</h2>
        <div className="mc-controls">
          <Control label="期待リターン（年・平均）" hint="1年あたり平均で何%増えるか。世界株インデックスで概ね5〜8%。"
            value={muArith} onChange={setMuArith} min={3} max={11} stepFine={0.1} stepCoarse={1} unit="%" decimals={1} />
          <Control label="値動きの荒さ（ボラティリティ）" hint="リターンのブレ幅。大きいほど上下に荒れる。株式で概ね15〜20%。"
            value={sigma} onChange={setSigma} min={8} max={35} stepFine={1} stepCoarse={5} unit="%" decimals={0} />
          <Control label="レバレッジ（借入倍率）" hint="借入で投資額を何倍にするか。1.0＝借入なし。"
            value={leverage} onChange={setLeverage} min={1} max={3} stepFine={0.1} stepCoarse={0.5} unit="倍" decimals={1} />
          <Control label="毎月の積立額" hint="「資産推移」タブの投資額が初期値。ここだけ変えて試せます。"
            value={monthlyMan} onChange={setMonthlyMan} min={0} max={50} stepFine={1} stepCoarse={10} unit="万円" decimals={0} />
          {a.idecoEnabled && (
            <div className="mc-field">
              <label>iDeCo節税還付</label>
              <div className="field-hint">節税で戻る分を投資に回すか。</div>
              <label className="toggle-row">
                <input type="checkbox" checked={idecoReinvest}
                  onChange={(e) => setIdecoReinvest(e.target.checked)} />
                還付を再投資に回す
              </label>
            </div>
          )}
        </div>
        {leverage > 1 && (
          <p className="note" style={{ marginTop: 8 }}>
            ⚠️ 年単位の計算のため、年の途中で起きる強制ロスカット（含み損が膨らんだ際の強制決済）は表現できず、レバレッジの本当のリスクは過小評価されます。
          </p>
        )}
        <button className="btn-reset" style={{ marginTop: 12 }} onClick={reset}>前提をリセット</button>
      </div>

      {/* Hero */}
      <div className="hero-result">
        <div className="hero-label">{a.endAge}歳の典型的な結果（中央値＝ちょうど真ん中の運）</div>
        <div className="hero-value">{man(result.medianAt60)}円</div>
        <div className="hero-range">
          <span className="chip"><i className="dot" style={{ background: 'var(--red)' }} />悪いケース（下位10%） {man(result.p10At60)}</span>
          <span className="chip">複利利回り（中央値） {pct(result.geomMean)}</span>
        </div>
      </div>

      {/* Fan chart */}
      <div className="card">
        <h2>結果のばらつき（ファンチャート）</h2>
        <FanChart result={result} targetA={a.targetA} targetB={a.targetB} />
        <p className="note" style={{ marginTop: 6 }}>
          帯が広いほど結果が不確実。濃い帯＝半数が収まる範囲（p25–p75）、薄い帯＝8割が収まる範囲（p10–p90）、実線＝中央値。
          点線は {a.targetA.toLocaleString()}万 / {a.targetB.toLocaleString()}万 の目標（「資産推移」タブで変更可）。
        </p>
      </div>

      {/* Goal probabilities */}
      <div className="card">
        <h2>目標に届く確率</h2>
        <div className="mc-cards">
          <div className="mc-card">
            <div className="label">{result.probAgeA}歳で {a.targetA.toLocaleString()}万 以上</div>
            <div className="value">{pct(result.probA)}</div>
          </div>
          <div className="mc-card">
            <div className="label">{result.probAgeB1}歳で {a.targetB.toLocaleString()}万 以上</div>
            <div className="value">{pct(result.probB1)}</div>
          </div>
          <div className="mc-card">
            <div className="label">{result.probAgeB2}歳で {a.targetB.toLocaleString()}万 以上</div>
            <div className="value">{pct(result.probB2)}</div>
          </div>
        </div>
        <p className="note" style={{ marginTop: 6 }}>数千回の試算のうち、その年齢で目標額に届いた割合。</p>
      </div>

      {/* Strategy comparison */}
      <div className="card">
        <h2>戦略の比較（{a.endAge}歳・同じ積立で）</h2>
        <p className="panel-intro">
          リターンの「平均」が高い戦略ほど良いとは限りません。値動きが荒いと、ブレによって複利の伸びが目減りし、中央値（典型的な結果）はむしろ下がります。
        </p>
        <div className="strategy-grid">
          {strategies.map((s) => (
            <div key={s.label} className="strategy-col">
              <div className="st-label">{s.label}</div>
              <div className="st-stat">
                <div className="sl">平均リターン</div>
                <div className="sv" style={{ color: 'var(--muted)' }}>{(s.aArith * 100).toFixed(1)}%</div>
              </div>
              <div className="st-stat">
                <div className="sl">中央値</div>
                <div className="sv median">{man(s.medianAt60)}</div>
              </div>
              <div className="st-stat">
                <div className="sl">悪いケース（下位10%）</div>
                <div className="sv p10">{man(s.p10At60)}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="note" style={{ marginTop: 8 }}>
          過剰なレバレッジは中央値が崩れ、下位10%がほぼ壊滅するのが分かります。
        </p>
      </div>
    </div>
  );
}
