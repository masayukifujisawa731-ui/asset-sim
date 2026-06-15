import { useMemo, useState } from 'react';
import type { Assumptions, ProjectionResult, ProjectionRow } from '../lib/types';
import { runProjection } from '../lib/projection';
import { formatMan } from '../lib/format';
import { ProjectionChart } from './Charts/ProjectionChart';

interface Props {
  assumptions: Assumptions;
  onChange: (a: Assumptions) => void;
}

function man(v: number): string {
  return formatMan(Math.round(v), 0, 2);
}

function ageStr(v: number | null): string {
  return v !== null ? `${v}歳` : '—';
}

/** 各行の金額を「今の物価」に割り戻した結果を返す（名目→実質） */
function toRealResult(result: ProjectionResult, currentAge: number, inflation: number): ProjectionResult {
  const scale = (r: ProjectionRow): ProjectionRow => {
    const f = Math.pow(1 + inflation, r.age - currentAge);
    if (f === 0 || !Number.isFinite(f)) return r;
    return {
      ...r,
      cash: r.cash / f,
      invConservative: r.invConservative / f,
      invBase: r.invBase / f,
      invOptimistic: r.invOptimistic / f,
      totalConservative: r.totalConservative / f,
      totalBase: r.totalBase / f,
      totalOptimistic: r.totalOptimistic / f,
      lockedIdeco: r.lockedIdeco / f,
      refundPool: r.refundPool / f,
      totalWithIdeco: r.totalWithIdeco / f,
      liquid: r.liquid / f,
    };
  };
  return { ...result, rows: result.rows.map(scale) };
}

/* ---- 結論: ヒーロー ---- */
function Hero({ result, a, real }: { result: ProjectionResult; a: Assumptions; real: boolean }) {
  const last = result.rows[result.rows.length - 1];
  return (
    <div className="hero-result">
      <div className="hero-label">
        {a.endAge}歳時点の予想総資産（基準シナリオ）
        {real && <span className="real-badge">実質・今の物価</span>}
      </div>
      <div className="hero-value">{man(last.totalBase)}円</div>
      <div className="hero-range">
        <span className="chip cons"><i className="dot cons" />保守 {man(last.totalConservative)}</span>
        <span className="chip opt"><i className="dot opt" />楽観 {man(last.totalOptimistic)}</span>
        {a.idecoEnabled && <span className="chip ideco"><i className="dot ideco" />iDeCo込み {man(last.totalWithIdeco)}</span>}
      </div>
    </div>
  );
}

/* ---- マイルストン: 目標到達年齢（目標金額は編集可能） ---- */
function TargetInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="target-input">
      <input type="number" min={0} step={100} value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))} />
      <span>万円</span>
    </span>
  );
}

function Milestones({ result, a, onChange }: { result: ProjectionResult; a: Assumptions; onChange: (a: Assumptions) => void }) {
  const { goalA, goalB, nisaFullAge, nisaWithIdecoAge } = result;
  return (
    <div className="card">
      <h2>いつ目標に届く？（到達年齢）</h2>
      <div className="table-wrap">
        <table className="milestone-table">
          <thead>
            <tr>
              <th>目標金額（変更可）</th>
              <th><i className="dot cons" />保守</th>
              <th><i className="dot base" />基準</th>
              <th><i className="dot opt" />楽観</th>
              {a.idecoEnabled && <th><i className="dot ideco" />iDeCo込み</th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th><TargetInput value={a.targetA} onChange={(v) => onChange({ ...a, targetA: v })} /></th>
              <td>{ageStr(goalA.conservative)}</td>
              <td className="emph">{ageStr(goalA.base)}</td>
              <td>{ageStr(goalA.optimistic)}</td>
              {a.idecoEnabled && <td>{ageStr(goalA.withIdeco)}</td>}
            </tr>
            <tr>
              <th><TargetInput value={a.targetB} onChange={(v) => onChange({ ...a, targetB: v })} /></th>
              <td>{ageStr(goalB.conservative)}</td>
              <td className="emph">{ageStr(goalB.base)}</td>
              <td>{ageStr(goalB.optimistic)}</td>
              {a.idecoEnabled && <td>{ageStr(goalB.withIdeco)}</td>}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        目標金額の数字は直接編集できます。各シナリオでその金額に初めて届く年齢を表示（「—」は{a.endAge}歳までに未到達）。
        NISA生涯枠（1,800万）を使い切る年齢 — 全額NISA: <b>{ageStr(nisaFullAge)}</b>
        {a.idecoEnabled && <> ／ iDeCo併用: <b>{ageStr(nisaWithIdecoAge)}</b></>}
      </p>
    </div>
  );
}

/* ---- iDeCoパネル ---- */
function IdecoPanel({ result, a, real }: { result: ProjectionResult; a: Assumptions; real: boolean }) {
  const last = result.rows[result.rows.length - 1];
  const display = result.rows.find((r) => r.age === 60) ?? last;
  const lockedMan = display.lockedIdeco / 10000;
  const liquidMan = display.liquid;
  const lockedPct = Math.max(0, Math.min(100, (lockedMan / (lockedMan + liquidMan)) * 100));

  return (
    <div className="card">
      <h2>iDeCoの効果（{a.endAge}歳時点・基準{real ? '・実質' : ''}）</h2>
      <p className="panel-intro">
        iDeCoは60歳まで引き出せない代わりに、掛金が所得控除になり節税できます。資産は「いつでも使える流動分」と「60歳までロックされる分」に分かれます。
      </p>
      <div className="split-bar" title="流動資産とロック資産の割合">
        <div className="split-liquid" style={{ width: `${100 - lockedPct}%` }}>流動 {man(liquidMan)}</div>
        <div className="split-locked" style={{ width: `${lockedPct}%` }}>ロック {man(lockedMan)}</div>
      </div>
      <div className="metric-grid">
        <div className="metric">
          <div className="m-label">節税還付プール <span className="m-tag plus">節税分</span></div>
          <div className="m-value">{man(display.refundPool / 10000)}円</div>
          <div className="m-sub">掛金控除で戻った税を再投資した累積（運用とは別の上乗せ）。ただし下記の出口課税で一部目減りします。</div>
        </div>
        <div className="metric">
          <div className="m-label">iDeCo込み総資産</div>
          <div className="m-value">{man(display.totalWithIdeco)}円</div>
          <div className="m-sub">基準の総資産＋還付プール（出口課税前）。</div>
        </div>
      </div>
      <p className="note">
        ※ iDeCo拠出は毎月の投資額の「内数」。ロック額は総資産に含まれます（二重計上なし）。<b>受取時には課税</b>され（退職所得控除・公的年金等控除で軽減）、ここでは未計上のため節税メリットは上限値です。実際の手取りはこれより小さくなります。
      </p>
    </div>
  );
}

/* ---- 詳細: 年次テーブル ---- */
function ProjectionTable({ result, a, real }: { result: ProjectionResult; a: Assumptions; real: boolean }) {
  const { rows, goalA, goalB } = result;

  const goalAges = new Set([
    goalA.conservative, goalA.base, goalA.optimistic, goalA.withIdeco,
    goalB.conservative, goalB.base, goalB.optimistic, goalB.withIdeco,
  ]);

  return (
    <div className="card">
      <h2>年ごとの詳細（単位：万円{real ? '・実質' : ''}）</h2>
      <p className="panel-intro">
        各行は<b>その年齢の年末時点</b>。<span className="lg lg-now">この色</span>＝現在 ／ <span className="lg lg-goal">この色</span>＝3,000万・5,000万の到達年。
        グレーの2列は「総資産の内訳」、右の3色が<b>総資産</b>です。
      </p>
      <div className="table-wrap">
        <table className="year-table">
          <thead>
            <tr>
              <th rowSpan={2}>年齢</th>
              <th colSpan={2} className="grp">内訳</th>
              <th colSpan={3} className="grp grp-total">総資産</th>
              {a.idecoEnabled && <th rowSpan={2}><i className="dot ideco" />iDeCo込み</th>}
            </tr>
            <tr>
              <th className="muted">現金</th>
              <th className="muted">投資</th>
              <th className="col-cons"><i className="dot cons" />保守</th>
              <th className="col-base"><i className="dot base" />基準</th>
              <th className="col-opt"><i className="dot opt" />楽観</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cls = [
                r.age === a.currentAge ? 'current-row' : '',
                goalAges.has(r.age) ? 'goal-row' : '',
              ].join(' ').trim();
              return (
                <tr key={r.age} className={cls}>
                  <td className="age-cell">
                    {r.age}歳{r.age === a.currentAge && <span className="now-tag">今</span>}
                    <span className="year-sub">{r.year}</span>
                  </td>
                  <td className="muted" style={{ color: r.cash < a.cashFloor ? 'var(--red)' : undefined }}>
                    {Math.round(r.cash / 10000).toLocaleString()}
                  </td>
                  <td className="muted">{Math.round(r.invBase / 10000).toLocaleString()}</td>
                  <td>{Math.round(r.totalConservative).toLocaleString()}</td>
                  <td className="emph">{Math.round(r.totalBase).toLocaleString()}</td>
                  <td>{Math.round(r.totalOptimistic).toLocaleString()}</td>
                  {a.idecoEnabled && <td>{Math.round(r.totalWithIdeco).toLocaleString()}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        ※ 初年度は通年拠出で簡略化のため、実際の到達は半年〜1年ほど後ろ倒しになり得ます。現金が生活防衛ライン（{Math.round(a.cashFloor / 10000)}万）を下回ると赤字表示。
      </p>
    </div>
  );
}

export function ProjectionTab({ assumptions, onChange }: Props) {
  const [real, setReal] = useState(false);
  const nominal = useMemo(() => runProjection(assumptions), [assumptions]);
  // 実質表示時は名目結果を「今の物価」に割り戻す（目標到達年齢は名目のまま）
  const display = useMemo(
    () => (real ? toRealResult(nominal, assumptions.currentAge, assumptions.inflationRate) : nominal),
    [real, nominal, assumptions.currentAge, assumptions.inflationRate],
  );

  return (
    <div className="content-panel">
      <div className="view-toggle">
        <label className="switch">
          <input type="checkbox" checked={real} onChange={(e) => setReal(e.target.checked)}
            aria-label="実質値（今の物価に換算）で表示" />
          <span className="track" />
          <span className="switch-label">
            実質値で表示（今の物価・年{(assumptions.inflationRate * 100).toFixed(1)}%インフレ前提）
          </span>
        </label>
        <span className="view-toggle-hint">
          {real ? '将来の金額を今日の購買力に換算中' : '名目値（将来の額面）を表示中'}
        </span>
      </div>
      <Hero result={display} a={assumptions} real={real} />
      <Milestones result={nominal} a={assumptions} onChange={onChange} />
      <div className="card">
        <h2>資産はどう増える？（年齢ごとの総資産{real ? '・実質' : ''}）</h2>
        <ProjectionChart rows={display.rows} idecoEnabled={assumptions.idecoEnabled} />
      </div>
      {assumptions.idecoEnabled && <IdecoPanel result={display} a={assumptions} real={real} />}
      <ProjectionTable result={display} a={assumptions} real={real} />
    </div>
  );
}
