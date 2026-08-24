import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Tooltip, Legend, Filler
);

const INDIGO = '#1B3A5B';
const GOLD = '#C9A24B';
const TERRA = '#B5552F';
const GREEN = '#2F9E6B';
const RED = '#C0392B';

ChartJS.defaults.font.family = 'Tajawal, Cairo, sans-serif';
ChartJS.defaults.color = '#5b6b7d';

const baseOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { font: { family: 'Tajawal' } } } },
};

export function LineChart({ labels, datasets, height = 280 }: {
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
  height?: number;
}) {
  const data = {
    labels,
    datasets: datasets.map((d, i) => ({
      label: d.label,
      data: d.data,
      borderColor: d.color || [INDIGO, GOLD, TERRA][i % 3],
      backgroundColor: (d.color || [INDIGO, GOLD, TERRA][i % 3]) + '22',
      tension: 0.35,
      fill: true,
      pointRadius: 2,
    })),
  };
  return <div style={{ height }}><Line data={data} options={baseOpts} /></div>;
}

export function BarChart({ labels, data, color = INDIGO, label = '', height = 280 }: {
  labels: string[];
  data: number[];
  color?: string;
  label?: string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <Bar
        data={{ labels, datasets: [{ label, data, backgroundColor: color, borderRadius: 8 }] }}
        options={baseOpts}
      />
    </div>
  );
}

export function DoughnutChart({ labels, data, colors, height = 240 }: {
  labels: string[];
  data: number[];
  colors?: string[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <Doughnut
        data={{
          labels,
          datasets: [{ data, backgroundColor: colors || [GREEN, RED, GOLD, INDIGO, TERRA], borderWidth: 0 }],
        }}
        options={{ ...baseOpts, cutout: '62%' }}
      />
    </div>
  );
}

export const CHART_COLORS = { INDIGO, GOLD, TERRA, GREEN, RED };
