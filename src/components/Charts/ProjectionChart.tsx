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

  const data = {
    labels,
    datasets: [
      {
        label: '楽観',
        data: rows.map((r) => Math.round(r.totalOptimistic)),
        borderColor: '#4fc97a',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: '基準',
        data: rows.map((r) => Math.round(r.totalBase)),
        borderColor: '#4f8ef7',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: '保守',
        data: rows.map((r) => Math.round(r.totalConservative)),
        borderColor: '#f7934f',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
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
            borderDash: [4, 3],
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
        labels: { color: '#7f8599', font: { size: 11 } },
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
        ticks: { color: '#7f8599', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: {
          color: '#7f8599',
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

  return (
    <div className="chart-wrap">
      <Line data={data} options={options} />
    </div>
  );
}
