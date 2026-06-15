import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MCResult } from '../../lib/types';
import { formatMan } from '../../lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Props {
  result: MCResult;
  targetA: number;
  targetB: number;
}

export function FanChart({ result, targetA, targetB }: Props) {
  const { ages, percentiles } = result;
  const labels = ages.map((a) => `${a}歳`);

  const maxY = Math.ceil((percentiles.p90[percentiles.p90.length - 1] ?? 10000) * 1.08 / 1000) * 1000;

  const data = {
    labels,
    datasets: [
      // p10–p90 band (thin)
      {
        label: 'p90',
        data: percentiles.p90,
        borderColor: 'transparent',
        backgroundColor: 'rgba(79,142,247,0.10)',
        fill: '+1',
        pointRadius: 0,
        tension: 0.3,
        order: 5,
      },
      {
        label: 'p10',
        data: percentiles.p10,
        borderColor: 'transparent',
        backgroundColor: 'rgba(79,142,247,0.10)',
        fill: false,
        pointRadius: 0,
        tension: 0.3,
        order: 5,
      },
      // p25–p75 band (thick)
      {
        label: 'p75',
        data: percentiles.p75,
        borderColor: 'transparent',
        backgroundColor: 'rgba(79,142,247,0.20)',
        fill: '+1',
        pointRadius: 0,
        tension: 0.3,
        order: 4,
      },
      {
        label: 'p25',
        data: percentiles.p25,
        borderColor: 'transparent',
        backgroundColor: 'rgba(79,142,247,0.20)',
        fill: false,
        pointRadius: 0,
        tension: 0.3,
        order: 4,
      },
      // median
      {
        label: '中央値（p50）',
        data: percentiles.p50,
        borderColor: '#4f8ef7',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        order: 1,
      },
      // 目標線A
      {
        label: `${targetA.toLocaleString()}万目標`,
        data: Array(ages.length).fill(targetA),
        borderColor: '#f7c84f',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [6, 3],
        pointRadius: 0,
        order: 2,
      },
      // 目標線B（Aと線種を変え、色覚に依存せず区別できるようにする）
      {
        label: `${targetB.toLocaleString()}万目標`,
        data: Array(ages.length).fill(targetB),
        borderColor: '#f75f5f',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [2, 2],
        pointRadius: 0,
        order: 3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#7f8599', font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => {
            const v = Number(ctx.parsed.y);
            return `${ctx.dataset.label}: ${formatMan(Math.round(v), 0, 2)}`;
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
        min: 0,
        max: maxY,
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

  const lastAge = ages[ages.length - 1];
  const li = percentiles.p50.length - 1;
  const summary =
    `${ages[0]}歳から${lastAge}歳までの資産のばらつきを示すファンチャート。`
    + `${lastAge}歳時点で、中央値 約${formatMan(Math.round(percentiles.p50[li]), 0, 2)}円、`
    + `下位10% 約${formatMan(Math.round(percentiles.p10[li]), 0, 2)}円、`
    + `上位10% 約${formatMan(Math.round(percentiles.p90[li]), 0, 2)}円。`
    + `目標は ${targetA.toLocaleString()}万・${targetB.toLocaleString()}万。`;

  return (
    <div className="chart-wrap" role="img" aria-label={summary}>
      <Line data={data} options={options} aria-hidden="true" />
    </div>
  );
}
