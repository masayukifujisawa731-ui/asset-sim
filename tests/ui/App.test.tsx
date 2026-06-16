// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// canvas を使うチャートはモック（jsdomに canvas が無いため）
vi.mock('../../src/components/Charts/ProjectionChart', () => ({
  ProjectionChart: () => <div data-testid="proj-chart" />,
}));
vi.mock('../../src/components/Charts/FanChart', () => ({
  FanChart: () => <div data-testid="fan-chart" />,
}));
// Excel生成は重い＆DOM API依存なので、呼び出しだけ検証
const { exportMock } = vi.hoisted(() => ({ exportMock: vi.fn(() => Promise.resolve()) }));
vi.mock('../../src/lib/excelExport', () => ({ exportToExcel: exportMock }));

import App from '../../src/App';

const KEY = 'asset-sim:assumptions:v1';

beforeEach(() => {
  localStorage.clear();
  exportMock.mockClear();
});

describe('App 結合テスト', () => {
  it('既定で資産推移タブ（ヒーロー）を表示する', () => {
    render(<App />);
    expect(screen.getByText(/歳時点の予想総資産/)).toBeInTheDocument();
  });

  it('タブ切替でモンテカルロの説明が表示される', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: /ふれ幅シミュレーション/ }));
    expect(screen.getByText(/数千回シミュレーション/)).toBeInTheDocument();
  });

  it('「Excelで保存」が exportToExcel を呼ぶ', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Excelで保存/ }));
    expect(exportMock).toHaveBeenCalledTimes(1);
  });

  it('localStorage の保存値を復元する', () => {
    localStorage.setItem(KEY, JSON.stringify({ endAge: 55 }));
    render(<App />);
    expect(screen.getByText(/55歳時点の予想総資産/)).toBeInTheDocument();
  });

  it('「保存データを消去」で既定値（終了60歳）に戻る', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem(KEY, JSON.stringify({ endAge: 55 }));
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/55歳時点/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存データを消去' }));
    expect(screen.getByText(/60歳時点/)).toBeInTheDocument();
  });

  it('実質表示トグルでヒーローに「実質・今の物価」バッジが出る', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByText('実質・今の物価')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('実質値（今の物価に換算）で表示'));
    expect(screen.getByText('実質・今の物価')).toBeInTheDocument();
  });

  it('iDeCoを有効にすると iDeCoパネルが現れる', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByText(/iDeCoの効果/)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('iDeCoを試算に含める'));
    expect(screen.getByText(/iDeCoの効果/)).toBeInTheDocument();
  });
});
