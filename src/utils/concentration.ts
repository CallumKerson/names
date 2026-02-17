import type { TooltipItem } from "chart.js";

import type { NameDataComputed } from "@/models/types";

function cumulativePercentages(
  sorted: NameDataComputed[],
  points: number[],
  getter: (n: NameDataComputed) => number,
  total: number,
): number[] {
  const result: number[] = [];
  let cumulative = 0;
  let idx = 0;
  for (const n of points) {
    while (idx < n && idx < sorted.length) {
      cumulative += getter(sorted[idx]!);
      idx++;
    }
    result.push(total > 0 ? (cumulative / total) * 100 : 0);
  }
  return result;
}

export function concentrationDataset(
  label: string,
  sorted: NameDataComputed[],
  points: number[],
  getter: (n: NameDataComputed) => number,
  total: number,
  color: string,
) {
  return {
    label,
    data: cumulativePercentages(sorted, points, getter, total),
    borderColor: color,
    backgroundColor: `${color}20`,
    pointRadius: 3,
    pointHoverRadius: 5,
    tension: 0.3,
  };
}

export const concentrationOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    title: {
      display: true,
      text: "Name Concentration by Gender",
      font: { size: 14, weight: "bold" as const },
    },
    legend: {
      display: true,
      position: "top" as const,
    },
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<"line">) =>
          `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
      },
    },
  },
  scales: {
    x: {
      title: { display: true, text: "Number of names (top N)" },
    },
    y: {
      title: { display: true, text: "% of all babies" },
      min: 0,
      max: 100,
    },
  },
};

export const samplePoints = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 350, 400, 450,
  500, 600, 700, 800, 900, 1000, 2000, 5000,
];
