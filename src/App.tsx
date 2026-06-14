import { useState, useEffect } from 'react';
import type { Assumptions } from './lib/types';
import { loadAssumptions, saveAssumptions } from './lib/storage';
import { runProjection } from './lib/projection';
import { exportToExcel } from './lib/excelExport';
import { AssumptionsForm } from './components/AssumptionsForm';
import { ProjectionTab } from './components/ProjectionTab';
import { MonteCarloTab } from './components/MonteCarloTab';
import './index.css';

type Tab = 'projection' | 'montecarlo';

export default function App() {
  const [tab, setTab] = useState<Tab>('projection');
  const [assumptions, setAssumptions] = useState<Assumptions>(loadAssumptions);
  const [exporting, setExporting] = useState(false);

  // 入力が変わるたびにブラウザへ自動保存（次回起動時に復元）
  useEffect(() => {
    saveAssumptions(assumptions);
  }, [assumptions]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportToExcel(assumptions, runProjection(assumptions));
    } catch (e) {
      console.error('Excel出力に失敗しました', e);
      alert('Excelの出力に失敗しました。');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app">
      <div className="disclaimer">
        ⚠️ 本ツールは一般的な試算であり、投資助言ではありません。利回りは名目値でインフレ控除なし。出口課税（譲渡益・退職所得）は未計上。実際の運用成果を保証しません。
      </div>
      <header>
        <h1>資産形成シミュレーター</h1>
        <span>iDeCo / NISA 対応・個人用ローカルツール</span>
        <button className="btn-export" onClick={handleExport} disabled={exporting}
          title="現在の前提と試算結果をExcel（.xlsx）でダウンロード">
          {exporting ? '出力中…' : '⬇ Excelで保存'}
        </button>
      </header>

      <div className="tabs" role="tablist" aria-label="表示の切り替え">
        <button
          role="tab"
          id="tab-projection"
          aria-selected={tab === 'projection'}
          aria-controls="panel-projection"
          className={`tab-btn${tab === 'projection' ? ' active' : ''}`}
          onClick={() => setTab('projection')}
        >
          資産推移<span className="tab-sub">決まった利回りで試算</span>
        </button>
        <button
          role="tab"
          id="tab-montecarlo"
          aria-selected={tab === 'montecarlo'}
          aria-controls="panel-montecarlo"
          className={`tab-btn${tab === 'montecarlo' ? ' active' : ''}`}
          onClick={() => setTab('montecarlo')}
        >
          ふれ幅シミュレーション<span className="tab-sub">運の良し悪しを試算</span>
        </button>
      </div>

      {tab === 'projection' ? (
        <div className="layout" role="tabpanel" id="panel-projection" aria-labelledby="tab-projection">
          <AssumptionsForm value={assumptions} onChange={setAssumptions} />
          <ProjectionTab assumptions={assumptions} onChange={setAssumptions} />
        </div>
      ) : (
        <div className="tab-fill" role="tabpanel" id="panel-montecarlo" aria-labelledby="tab-montecarlo">
          <MonteCarloTab assumptions={assumptions} />
        </div>
      )}
    </div>
  );
}
