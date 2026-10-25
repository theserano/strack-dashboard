'use client';

import React from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatMoney, fromKobo } from '@/lib/utils/money';
import type { RevenuePoint } from '@/lib/data/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const INK = '#020C14';
const GRID = '#E1E4EA';
const MUTED = '#525866';

const RevenueChart = ({ series }: { series: RevenuePoint[] }) => (
  <div className="h-[250px]" role="img" aria-label="Revenue chart">
    <Line
      data={{
        labels: series.map((p) => p.label),
        datasets: [
          {
            label: 'Revenue',
            data: series.map((p) => fromKobo(p.amount)),
            borderColor: INK,
            backgroundColor: 'rgba(2, 12, 20, 0.08)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: series.length > 45 ? 0 : 3,
            pointHoverRadius: 5,
            pointBackgroundColor: INK,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (c) => formatMoney(series[c.dataIndex]?.amount ?? 0) },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: MUTED, maxTicksLimit: 8, maxRotation: 0 } },
          y: {
            beginAtZero: true,
            grid: { color: GRID },
            border: { display: false },
            ticks: {
              color: MUTED,
              callback: (v) => `₦${Intl.NumberFormat('en-NG', { notation: 'compact' }).format(Number(v))}`,
            },
          },
        },
      }}
    />
  </div>
);

export default RevenueChart;
