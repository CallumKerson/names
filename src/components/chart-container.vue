<script setup lang="ts">
import {
  CategoryScale,
  type ChartData,
  type ChartDataset,
  type ChartType,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  type ScriptableContext,
  Title,
  Tooltip,
  type TooltipModel,
  type TooltipPositionerFunction,
} from "chart.js";
import { computed } from "vue";
import { Line } from "vue-chartjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);


declare module "chart.js" {
  interface TooltipPositionerMap {
    topOfChart: TooltipPositionerFunction<ChartType>;
  }
}


Tooltip.positioners.topOfChart = function (
  this: TooltipModel<ChartType>,
  _elements,
  eventPosition,
) {
  return { x: eventPosition.x, y: this.chart.chartArea.top };
};


interface Props {
  title: string;
  data: [number, number][];
  yAxisLabel: string;
  color?: string;
  rankData?: Record<number, number>;
  gradientColor?: boolean;
}


const emit = defineEmits<{
  pointClick: [year: number];
}>();


const props = withDefaults(defineProps<Props>(), {
  color: "#F59E0B",
});


function handleChartClick(_event: unknown, elements: unknown[]) {
  if (Array.isArray(elements) && elements.length > 0) {
    const element = elements[0] as Record<string, unknown>;
    const index = element.index as number;
    if (typeof index === "number" && index < props.data.length) {
      const year = props.data[index]?.[0];
      if (year !== undefined) {
        emit("pointClick", year);
      }
    }
  }
}


function getTooltipAfterLabel(context: unknown): string {
  const ctx = context as Record<string, unknown>;
  const dataIndex = ctx.dataIndex as number;
  if (props.rankData && typeof dataIndex === "number") {
    const year = props.data[dataIndex]?.[0];
    const rank = year === undefined ? undefined : props.rankData[year];
    if (rank) {
      return `Overall Rank: ${rank}`;
    }
  }
  return "";
}


function getSegmentBorderColor(ctx: ScriptableContext<"line">): string {
  const datapoint = (ctx as unknown as Record<string, number>).p0DataIndex;
  if (datapoint === undefined) return "#999";
  const value = props.data[datapoint]?.[1];
  if (typeof value !== "number") return "#999";
  // Feminine - purple
  if (value > 0.3) return "#7C3AED";
  // Masculine - green
  if (value < -0.3) return "#059669";
  // Neutral - amber
  return "#F59E0B";
}


const chartData = computed<ChartData<"line">>(() => {
  const dataset: ChartDataset<"line"> = {
    backgroundColor: `${props.color}20`,
    borderColor: props.color,
    data: props.data.map(([_, value]: [number, number]) => value),
    fill: true,
    label: props.title,
    pointBackgroundColor: props.color,
    pointHitRadius: 20,
    pointHoverRadius: 6,
    pointRadius: 3,
    tension: 0.4,
  };

  // For gradient color, customize point colors based on values
  if (props.gradientColor) {
    dataset.borderColor = "#999";
    dataset.pointBackgroundColor = (ctx: ScriptableContext<"line">) => {
      const datapoint = ctx.dataIndex;
      const value = props.data[datapoint]?.[1];
      if (typeof value !== "number") return "#999";
      // Feminine - purple
      if (value > 0.3) return "#7C3AED";
      // Masculine - green
      if (value < -0.3) return "#059669";
      // Neutral - amber
      return "#F59E0B";
    };
    dataset.pointBorderColor = "transparent";
    dataset.pointBorderWidth = 0;
  }

  return {
    datasets: [dataset],
    labels: props.data.map(([year]: [number, number]) => year),
  };
});


function buildBaseOptions(
  title: string,
  yAxisLabel: string,
): Record<string, unknown> {
  return {
    interaction: { intersect: false, mode: "nearest" as const },
    maintainAspectRatio: false,
    onClick: handleChartClick,
    plugins: {
      legend: { display: true, position: "top" as const },
      title: {
        display: true,
        font: { size: 14 as number, weight: "bold" as const },
        text: title,
      },
      tooltip: {
        callbacks: { afterLabel: getTooltipAfterLabel },
        position: (window.matchMedia("(pointer: coarse)").matches
          ? "topOfChart"
          : "average") as string,
      },
    },
    responsive: true,
    scales: {
      x: { title: { display: true, text: "Year" } },
      y: { title: { display: true, text: yAxisLabel } },
    },
  };
}


const chartOptions = computed(() => {
  const options = buildBaseOptions(props.title, props.yAxisLabel);
  if (props.gradientColor) {
    options.segment = { borderColor: getSegmentBorderColor };
  }
  return options;
});
</script>

<template>
  <div class="chart-container">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-container {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin: 1.5rem 0;
  cursor: pointer;
  height: 400px;
}

@media (max-width: 768px) and (orientation: portrait) {
  .chart-container {
    height: 300px;
  }
}
</style>
