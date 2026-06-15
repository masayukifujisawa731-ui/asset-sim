import type { Assumptions } from '../lib/types';
import { createDefaultAssumptions } from '../lib/constants';
import { clearAssumptions } from '../lib/storage';
import { IntField, MoneyField, PlainNumField, RateField } from './AssumptionFields';
import { BigExpenseEditor, LifeEventEditor } from './EventEditors';

interface Props {
  value: Assumptions;
  onChange: (a: Assumptions) => void;
}

export function AssumptionsForm({ value, onChange }: Props) {
  const set = <K extends keyof Assumptions>(key: K, v: Assumptions[K]) => onChange({ ...value, [key]: v });

  // 即時フィードバック：毎月の現金増減（基準時）
  const monthlySurplus = value.takeHomeMonthly + value.annualBonus / 12 - value.expenseMonthly - value.baseInvestMonthly;

  return (
    <div className="form-panel">
      <div className="intro-card">
        <strong>使い方</strong>
        <p>今の資産・毎月の収支・利回りの前提を入力すると、右側に <b>{value.endAge}歳までの資産推移</b> が「保守／基準／楽観」の3シナリオで表示されます。値を動かすとグラフと表がその場で更新されます。</p>
      </div>

      <div className="form-section">
        <h3>基本情報</h3>
        <IntField label="現在の年齢" value={value.currentAge} onChange={(v) => set('currentAge', v)} min={20} max={Math.min(70, value.endAge - 1)} unit="歳" />
        <IntField label="シミュレーション終了年齢" value={value.endAge} onChange={(v) => set('endAge', v)} min={value.currentAge + 1} max={90} unit="歳" />
        <PlainNumField label="現在の西暦" value={value.currentYear} onChange={(v) => set('currentYear', v)} unit="年" />
      </div>

      <div className="form-section">
        <h3>今ある資産</h3>
        <MoneyField label="証券口座（NISA含む合計）" valueYen={value.startSecurities}
          onChange={(v) => set('startSecurities', v)} sliderMax={10000} stepFine={10} stepCoarse={100} />
        <MoneyField label="現金・預金" valueYen={value.startCash} onChange={(v) => set('startCash', v)}
          sliderMax={3000} stepFine={10} stepCoarse={100} />
        <MoneyField label="生活防衛ライン（下限の目安）" hint="現金がこの額を下回ると表で赤く表示します。"
          valueYen={value.cashFloor} onChange={(v) => set('cashFloor', v)} sliderMax={1000} stepFine={10} stepCoarse={100} />
        <MoneyField label="NISAで既に使った枠" hint="開始時点までに使ったNISA生涯枠（1,800万のうち）。新規スタートなら0。「NISA使い切り年齢」の計算に使います。"
          valueYen={value.nisaUsedAtStart} onChange={(v) => set('nisaUsedAtStart', v)} sliderMax={1800} stepFine={10} stepCoarse={100} />
      </div>

      <div className="form-section">
        <h3>毎月の収支</h3>
        <MoneyField label="手取り月収（ボーナス除く）" valueYen={value.takeHomeMonthly}
          onChange={(v) => set('takeHomeMonthly', v)} sliderMax={150} stepFine={1} stepCoarse={10} />
        <MoneyField label="年間ボーナス（手取り）" hint="年1回ぶんの手取り合計。現金として積み上がります（投資に回す場合は月投資額を増やしてください）。"
          valueYen={value.annualBonus} onChange={(v) => set('annualBonus', v)} sliderMax={500} stepFine={5} stepCoarse={50} />
        <MoneyField label="毎月の支出" valueYen={value.expenseMonthly}
          onChange={(v) => set('expenseMonthly', v)} sliderMax={100} stepFine={1} stepCoarse={10} />
        <MoneyField label="毎月の投資額" valueYen={value.baseInvestMonthly}
          onChange={(v) => set('baseInvestMonthly', v)} sliderMax={100} stepFine={1} stepCoarse={10} />
        <div className={`cashflow-box ${monthlySurplus >= 0 ? 'pos' : 'neg'}`}>
          毎月の現金増減（基準時）: <b>{monthlySurplus >= 0 ? '+' : ''}{(monthlySurplus / 10000).toFixed(1)}万円</b>
          <div className="cf-note">＝ 手取り＋ボーナス按分 − 支出 − 投資</div>
        </div>
      </div>

      <div className="form-section">
        <h3>ライフステージの変化</h3>
        <div className="field-hint" style={{ marginBottom: 8 }}>
          結婚・出産・昇給・子の独立など、ある年齢から毎月の支出や投資額が変わるイベント。複数登録でき、設定年齢以降ずっと反映されます。
        </div>
        <LifeEventEditor events={value.lifeEvents} onChange={(e) => set('lifeEvents', e)} />
      </div>

      <div className="form-section">
        <h3>大型イベント出費</h3>
        <div className="field-hint" style={{ marginBottom: 8 }}>
          結婚・住宅購入・車・教育費など、一度きりの大きな支出。指定年齢の年に現金から引かれます。
        </div>
        <BigExpenseEditor items={value.bigExpenses} onChange={(e) => set('bigExpenses', e)} />
      </div>

      <div className={`opt-section ${value.idecoEnabled ? 'is-on' : 'is-off'}`}>
        <div className="opt-head">
          <h3>iDeCo（任意）</h3>
          <label className="switch">
            <input type="checkbox" checked={value.idecoEnabled}
              aria-label="iDeCoを試算に含める"
              onChange={(e) => set('idecoEnabled', e.target.checked)} />
            <span className="track" />
            <span className="switch-label">{value.idecoEnabled ? '利用する' : '使わない'}</span>
          </label>
        </div>
        {value.idecoEnabled ? (
          <>
            <div className="field-hint" style={{ marginBottom: 8, marginTop: 10 }}>
              毎月の投資額の「内数」として積み立てます。2027年から上限が月6.2万に引き上げ（2025年改正）。試算には「iDeCo込み」の列と節税効果が加わります。
            </div>
            <MoneyField label="月額（〜2026年・現行上限）" valueYen={value.idecoMonthly2026}
              onChange={(v) => set('idecoMonthly2026', v)} sliderMax={10} stepFine={0.1} stepCoarse={1} />
            <MoneyField label="月額（2027年〜・改正後上限）" valueYen={value.idecoMonthlyFrom2027}
              onChange={(v) => set('idecoMonthlyFrom2027', v)} sliderMax={10} stepFine={0.1} stepCoarse={1} />
          </>
        ) : (
          <p className="opt-off-note">
            現在 iDeCo は試算に含めていません。スイッチをオンにすると、毎月の積立額と節税効果が計算に加わり、結果に「iDeCo込み」が表示されます。
          </p>
        )}
      </div>

      <div className="form-section">
        <h3>利回り（年率・名目）</h3>
        <RateField label="保守シナリオ" value={value.rConservative} onChange={(v) => set('rConservative', v)} />
        <RateField label="基準シナリオ" value={value.rBase} onChange={(v) => set('rBase', v)} />
        <RateField label="楽観シナリオ" value={value.rOptimistic} onChange={(v) => set('rOptimistic', v)} />
        <p className="note">※ 名目利回り。インフレは控除していません。</p>
      </div>

      <div className="form-section">
        <h3>インフレ率（実質値の換算用）</h3>
        <div className="field-hint" style={{ marginBottom: 8 }}>
          結果タブの「実質値で表示」をオンにすると、将来の金額をこの率で今の物価に割り戻します。利回り自体は変えません。
        </div>
        <RateField label="想定インフレ率（年）" value={value.inflationRate} onChange={(v) => set('inflationRate', v)} />
      </div>

      <details className="collapsible">
        <summary>詳細設定（税・手数料）</summary>
        <div className="form-section" style={{ marginTop: 10 }}>
          <RateField label="限界税率（iDeCo還付の計算用）" value={value.taxRate} onChange={(v) => set('taxRate', v)} />
          <PlainNumField label="iDeCo口座手数料（円/年）" value={value.idecoAnnualFee}
            onChange={(v) => set('idecoAnnualFee', v)} stepFine={100} stepCoarse={1000} unit="円" />
        </div>
      </details>

      <div className="form-actions">
        <button className="btn-reset" onClick={() => onChange(createDefaultAssumptions())}>
          既定値にリセット
        </button>
        <button
          className="btn-reset btn-danger"
          onClick={() => {
            if (confirm('このブラウザに保存した入力データを消去し、既定値に戻します。よろしいですか？')) {
              clearAssumptions();
              onChange(createDefaultAssumptions());
            }
          }}
        >
          保存データを消去
        </button>
      </div>
      <p className="note" style={{ textAlign: 'center', marginTop: 6 }}>
        入力内容は<b>このブラウザにのみ</b>自動保存され、外部に送信されません。次回開くと復元されます。
      </p>
    </div>
  );
}
