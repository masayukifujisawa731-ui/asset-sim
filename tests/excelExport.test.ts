import { describe, it, expect } from 'vitest';
import { buildWorkbook } from '../src/lib/excelExport';
import { runProjection } from '../src/lib/projection';
import { DEFAULTS } from '../src/lib/constants';

describe('excelExport — ワークブック生成', () => {
  it('iDeCo無効時は3シート（サマリー/前提条件/資産推移）', async () => {
    const a = { ...DEFAULTS, idecoEnabled: false };
    const wb = await buildWorkbook(a, runProjection(a));
    const names = wb.worksheets.map((w) => w.name);
    expect(names).toEqual(['サマリー', '前提条件', '資産推移']);
  });

  it('iDeCo有効時はiDeCo分析シートが加わり4シート', async () => {
    const a = { ...DEFAULTS, idecoEnabled: true };
    const wb = await buildWorkbook(a, runProjection(a));
    const names = wb.worksheets.map((w) => w.name);
    expect(names).toContain('iDeCo分析');
    expect(names).toHaveLength(4);
  });

  it('資産推移シートに全年齢分の行がある（ヘッダー＋31行）', async () => {
    const a = { ...DEFAULTS, idecoEnabled: false }; // 30→60歳 = 31行
    const result = runProjection(a);
    const wb = await buildWorkbook(a, result);
    const ws = wb.getWorksheet('資産推移')!;
    // ヘッダー1行 + データ31行（末尾に空行+注記が続く）
    const ageCells = ws.getColumn(1).values.filter((v) => typeof v === 'string' && /歳$/.test(v as string));
    expect(ageCells).toHaveLength(result.rows.length);
  });

  it('writeBuffer が有効なxlsxバイナリを返す（ZIPシグネチャPK）', async () => {
    const a = { ...DEFAULTS, idecoEnabled: true };
    const wb = await buildWorkbook(a, runProjection(a));
    const buf = await wb.xlsx.writeBuffer();
    const bytes = new Uint8Array(buf as ArrayBuffer);
    // xlsx は ZIP コンテナ：先頭が 'PK' (0x50 0x4B)
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
