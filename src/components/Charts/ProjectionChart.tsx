import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ProjectionRow } from '../../lib/types';
import { formatMan } from '../../lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  rows: ProjectionRow[];
  idecoEnabled?: boolean;
}

export function ProjectionChart({ rows, idecoEnabled = false }: Props) {
  const labels = rows.map((r) => `${r.age}歳`);

  // 色だけに依存しないよう、シナリオごとに線種（実線/破線/点線）も変える
  const data = {
    labels,
    datasets: [
      {
        label: '楽観',
        data: rows.map((r) => Math.round(r.totalOptimistic)),
        borderColor: '#4fc97a',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [] as number[],
        pointStyle: 'triangle',
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: '基準',
        data: rows.map((r) => Math.round(r.totalBase)),
        borderColor: '#4f8ef7',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        borderDash: [] as number[],
        pointStyle: 'circle',
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: '保守',
        data: rows.map((r) => Math.round(r.totalConservative)),
        borderColor: '#f7934f',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [7, 4],
        pointStyle: 'rect',
        pointRadius: 0,
        tension: 0.3,
      },
      ...(idecoEnabled
        ? [{
            label: 'iDeCo込み（基準）',
            data: rows.map((r) => Math.round(r.totalWithIdeco)),
            borderColor: '#c44ff7',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [2, 3],
            pointStyle: 'rectRot',
            pointRadius: 0,
            tension: 0.3,
          }]
        : []),
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#8d94a8', font: { size: 11 }, usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => {
            const v = Number(ctx.parsed.y);
            const label = ctx.dataset.label ?? '';
            return `${label}: ${formatMan(v, 0, 2)}円`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#8d94a8', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: {
          color: '#8d94a8',
          font: { size: 10 },
          callback: (v: number | string) => {
            const n = Number(v);
            return formatMan(n);
          },
        },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  };

  const first = rows[0];
  const last = rows[rows.length - 1];
  const summary =
    `${first?.age ?? ''}歳から${last?.age ?? ''}歳までの総資産推移グラフ（保守・基準・楽観の3シナリオ`
    + `${idecoEnabled ? '＋iDeCo込み' : ''}）。`
    + `基準シナリオは${first?.age ?? ''}歳で約${formatMan(Math.round(first?.totalBase ?? 0), 0, 2)}円から`
    + `${last?.age ?? ''}歳で約${formatMan(Math.round(last?.totalBase ?? 0), 0, 2)}円へ。`
    + '正確な数値は下の年次テーブルを参照してください。';

  return (
    <div className="chart-wrap" role="img" aria-label={summary}>
      <Line data={data} options={options} aria-hidden="true" />
    </div>
  );
}
