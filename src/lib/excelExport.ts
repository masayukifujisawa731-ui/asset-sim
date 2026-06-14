import type ExcelJS from 'exceljs';
import type { Assumptions, ProjectionResult, GoalAge } from './types';

const TITLE_COLOR = 'FF4F8EF7';
const HEAD_FILL = 'FF1A1D27';
const HEAD_FONT = 'FFFFFFFF';

const man = (yen: number) => Math.round(yen / 10000);
const ageStr = (v: number | null) => (v !== null ? v : '—');

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEAD_FONT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF888888' } } };
  });
}

function sectionTitle(ws: ExcelJS.Worksheet, text: string) {
  const row = ws.addRow([text]);
  row.getCell(1).font = { bold: true, size: 12, color: { argb: TITLE_COLOR } };
  return row;
}

/** サマリーシート */
function buildSummary(wb: ExcelJS.Workbook, a: Assumptions, result: ProjectionResult) {
  const ws = wb.addWorksheet('サマリー');
  ws.columns = [{ width: 26 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];

  const titleRow = ws.addRow([`資産形成シミュレーション ｜ ${a.currentAge}歳・${a.currentYear}年起点`]);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: TITLE_COLOR } };
  ws.addRow([]);

  const last = result.rows[result.rows.length - 1];

  sectionTitle(ws, '■ 現状スナップショット（万円）');
  ws.addRow(['証券口座資産', man(a.startSecurities)]);
  ws.addRow(['現金・預金', man(a.startCash)]);
  ws.addRow(['合計（金融資産）', man(a.startSecurities + a.startCash)]).getCell(1).font = { bold: true };
  ws.addRow([]);

  sectionTitle(ws, '■ 目標到達年齢（前提の利回り・積立で自動計算）');
  const cols = a.idecoEnabled
    ? ['目標金額', '保守', '基準', '楽観', 'iDeCo併用']
    : ['目標金額', '保守', '基準', '楽観'];
  styleHeaderRow(ws.addRow(cols));
  const goalRow = (label: string, g: GoalAge) => {
    const base = [label, ageStr(g.conservative), ageStr(g.base), ageStr(g.optimistic)];
    ws.addRow(a.idecoEnabled ? [...base, ageStr(g.withIdeco)] : base);
  };
  goalRow(`${a.targetA.toLocaleString()}万 到達`, result.goalA);
  goalRow(`${a.targetB.toLocaleString()}万 到達`, result.goalB);
  ws.addRow([]);

  sectionTitle(ws, '■ 主要年齢の総資産（基準・万円）');
  styleHeaderRow(ws.addRow(['年齢', '総資産(基準)', 'うち投資', '現金']));
  [45, 50, 55, 60].forEach((age) => {
    const r = result.rows.find((x) => x.age === age);
    if (r) ws.addRow([`${age}歳`, Math.round(r.totalBase), man(r.invBase), man(r.cash)]);
  });
  ws.addRow([]);

  sectionTitle(ws, `■ NISA生涯枠（1,800万）の使い切り`);
  ws.addRow(['全額NISA', ageStr(result.nisaFullAge) === '—' ? '60歳超' : `${result.nisaFullAge}歳`]);
  if (a.idecoEnabled) {
    ws.addRow(['iDeCo併用', result.nisaWithIdecoAge !== null ? `${result.nisaWithIdecoAge}歳` : '60歳超']);
  }
  ws.addRow([]);

  ws.addRow([`${a.endAge}歳時点の予想総資産（基準）: ${Math.round(last.totalBase).toLocaleString()}万円`])
    .getCell(1).font = { bold: true, size: 12 };
  ws.addRow([]);
  const disc = ws.addRow(['※ 本シートは一般的な試算であり投資助言ではありません。利回りは名目値（インフレ控除なし）、出口課税は未計上。']);
  disc.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF999999' } };
}

/** 前提条件シート */
function buildAssumptions(wb: ExcelJS.Workbook, a: Assumptions) {
  const ws = wb.addWorksheet('前提条件');
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 10 }];

  const titleRow = ws.addRow(['資産形成シミュレーション ｜ 前提条件']);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: TITLE_COLOR } };
  ws.addRow([]);

  const kv = (label: string, value: number | string, unit = '') => ws.addRow([label, value, unit]);

  sectionTitle(ws, '■ 基本情報');
  kv('現在の年齢', a.currentAge, '歳');
  kv('現在の西暦', a.currentYear, '年');
  kv('シミュレーション終了年齢', a.endAge, '歳');
  ws.addRow([]);

  sectionTitle(ws, '■ 今ある資産（万円）');
  kv('証券口座（NISA含む合計）', man(a.startSecurities), '万円');
  kv('現金・預金', man(a.startCash), '万円');
  kv('生活防衛ライン', man(a.cashFloor), '万円');
  ws.addRow([]);

  sectionTitle(ws, '■ 毎月の収支（万円）');
  kv('手取り月収（ボーナス除く）', man(a.takeHomeMonthly), '万円');
  kv('年間ボーナス（手取り）', man(a.annualBonus), '万円');
  kv('毎月の支出', man(a.expenseMonthly), '万円');
  kv('毎月の投資額', man(a.baseInvestMonthly), '万円');
  ws.addRow([]);

  sectionTitle(ws, '■ 目標金額（万円）');
  kv('目標A', a.targetA, '万円');
  kv('目標B', a.targetB, '万円');
  ws.addRow([]);

  sectionTitle(ws, '■ 利回り（年率・名目）');
  kv('保守シナリオ', (a.rConservative * 100).toFixed(1), '%');
  kv('基準シナリオ', (a.rBase * 100).toFixed(1), '%');
  kv('楽観シナリオ', (a.rOptimistic * 100).toFixed(1), '%');
  ws.addRow([]);

  sectionTitle(ws, '■ iDeCo');
  kv('利用', a.idecoEnabled ? '利用する' : '使わない');
  if (a.idecoEnabled) {
    kv('月額（〜2026年）', man(a.idecoMonthly2026), '万円');
    kv('月額（2027年〜）', man(a.idecoMonthlyFrom2027), '万円');
    kv('限界税率（還付計算用）', (a.taxRate * 100).toFixed(0), '%');
    kv('iDeCo口座手数料', a.idecoAnnualFee, '円/年');
  }
  ws.addRow([]);

  if (a.lifeEvents.length > 0) {
    sectionTitle(ws, '■ ライフステージの変化');
    styleHeaderRow(ws.addRow(['イベント名', '年齢', '月支出の変化(万円)', '月投資の変化(万円)']));
    a.lifeEvents.forEach((e) =>
      ws.addRow([e.label, `${e.age}歳〜`, man(e.expenseDeltaMonthly), man(e.investDeltaMonthly)]));
    ws.addRow([]);
  }

  if (a.bigExpenses.length > 0) {
    sectionTitle(ws, '■ 大型イベント出費');
    styleHeaderRow(ws.addRow(['出費名', '年齢', '金額(万円)']));
    a.bigExpenses.forEach((e) => ws.addRow([e.label, `${e.age}歳`, man(e.amount)]));
  }
}

/** 資産推移シート */
function buildProjection(wb: ExcelJS.Workbook, a: Assumptions, result: ProjectionResult) {
  const ws = wb.addWorksheet('資産推移');
  const headers = ['年齢', '西暦', '年間投資', '現金', '投資(基準)', '総資産(保守)', '総資産(基準)', '総資産(楽観)'];
  if (a.idecoEnabled) headers.push('iDeCo込み');

  const widths = headers.map(() => ({ width: 13 }));
  widths[0] = { width: 8 };
  ws.columns = widths;

  styleHeaderRow(ws.addRow(headers));

  result.rows.forEach((r) => {
    const base = [
      `${r.age}歳`, r.year, man(r.annualInv), man(r.cash), man(r.invBase),
      Math.round(r.totalConservative), Math.round(r.totalBase), Math.round(r.totalOptimistic),
    ];
    const row = ws.addRow(a.idecoEnabled ? [...base, Math.round(r.totalWithIdeco)] : base);
    // 現在の行と目標到達の年齢を強調
    if (r.age === a.currentAge) {
      row.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FF' } }));
    }
    // 現金が防衛ラインを下回る場合は赤字
    if (r.cash < a.cashFloor) {
      row.getCell(4).font = { color: { argb: 'FFD83A3A' } };
    }
  });

  ws.addRow([]);
  const note = ws.addRow(['単位：万円。各行はその年齢の年末時点。初年度は通年拠出で簡略化。']);
  note.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF999999' } };
}

/** iDeCo分析シート（iDeCo利用時のみ） */
function buildIdeco(wb: ExcelJS.Workbook, a: Assumptions, result: ProjectionResult) {
  const ws = wb.addWorksheet('iDeCo分析');
  ws.columns = [{ width: 8 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }];

  const titleRow = ws.addRow(['iDeCo分析（基準シナリオ・万円）']);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: TITLE_COLOR } };
  ws.addRow([]);

  styleHeaderRow(ws.addRow(['年齢', '西暦', 'ロック額', '節税還付プール', 'iDeCo込み総資産']));
  result.rows.forEach((r) => {
    ws.addRow([`${r.age}歳`, r.year, man(r.lockedIdeco), man(r.refundPool), Math.round(r.totalWithIdeco)]);
  });

  ws.addRow([]);
  const last = result.rows[result.rows.length - 1];
  const display = result.rows.find((x) => x.age === 60) ?? last;
  ws.addRow([`${a.endAge}歳時点 節税還付プール（純増）`, '', man(display.refundPool)]).getCell(1).font = { bold: true };
  ws.addRow([`${a.endAge}歳時点 ロック額`, '', man(display.lockedIdeco)]).getCell(1).font = { bold: true };
  ws.addRow([]);
  const note = ws.addRow(['※ iDeCo拠出は毎月の投資額の内数。ロック額は総資産に含まれます（二重計上なし）。出口課税は未計上。']);
  note.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF999999' } };
}

/** 試算結果から4シートのワークブックを生成する（DOM非依存・テスト可能） */
export async function buildWorkbook(a: Assumptions, result: ProjectionResult): Promise<ExcelJS.Workbook> {
  // exceljs は大きいため、エクスポート時にのみ動的ロード（初期表示を軽く保つ）
  const ExcelJSModule = (await import('exceljs')).default;
  const wb = new ExcelJSModule.Workbook();
  wb.creator = '資産形成シミュレーター';
  wb.created = new Date();

  buildSummary(wb, a, result);
  buildAssumptions(wb, a);
  buildProjection(wb, a, result);
  if (a.idecoEnabled) buildIdeco(wb, a, result);

  return wb;
}

/** ワークブックを生成してダウンロードする */
export async function exportToExcel(a: Assumptions, result: ProjectionResult): Promise<void> {
  const wb = await buildWorkbook(a, result);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const ymd = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `資産形成シミュレーション_${ymd}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
