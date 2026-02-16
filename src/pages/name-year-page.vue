<script setup lang="ts">
import {
  formatGenderScore,
  formatNumber,
  getGenderCategory,
} from "@/utils/formatters";
import { useRoute, useRouter } from "vue-router";
import { computed, onMounted, ref, watch } from "vue";
import { calculateYearlyGenderScores } from "@/utils/calculations";
import type { NameDataComputed } from "@/models/types";
import { useNamesData } from "@/composables/useNamesData";
import BreadcrumbNav from "@/components/breadcrumb-nav.vue";
import ChartContainer from "@/components/chart-container.vue";

interface YearStats {
  girlsCount: number;
  boysCount: number;
  totalCount: number;
  genderScore: number;
  girlsPercent: number;
  boysPercent: number;
}

interface PreviousYearStats {
  change: number;
  percentChange: number;
}

function getCategoryColor(genderScore: number): string {
  if (genderScore > 0.3) {
    return "#7C3AED";
  }
  if (genderScore < -0.3) {
    return "#059669";
  }
  return "#F59E0B";
}

const route = useRoute();
const router = useRouter();
const { getName, getYearlyRanks } = useNamesData();

const loading = ref(false);
const loadError = ref<string | null>(null);
const nameData = ref<NameDataComputed | null>(null);
const year = ref<number | null>(null);
const yearlyRanksMap = ref<Record<number, number>>({});

const yearStats = computed((): YearStats | null => {
  if (!nameData.value || !year.value) return null;

  const girlsYearly = nameData.value.girlsYearly || [];
  const boysYearly = nameData.value.boysYearly || [];

  const girlsEntry = girlsYearly.find((yc) => yc.year === year.value);
  const boysEntry = boysYearly.find((yc) => yc.year === year.value);

  const girlsCount = girlsEntry?.count || 0;
  const boysCount = boysEntry?.count || 0;
  const totalCount = girlsCount + boysCount;

  if (totalCount === 0) return null;

  const genderScore = (girlsCount - boysCount) / totalCount;
  const girlsPercent = (girlsCount / totalCount) * 100;
  const boysPercent = (boysCount / totalCount) * 100;

  return {
    girlsCount,
    boysCount,
    totalCount,
    genderScore,
    girlsPercent,
    boysPercent,
  };
});

const previousYearStats = computed((): PreviousYearStats | null => {
  if (!yearStats.value || !year.value || year.value === 1996) return null;

  const previousYear = year.value - 1;
  const girlsYearly = nameData.value?.girlsYearly || [];
  const boysYearly = nameData.value?.boysYearly || [];

  const boysEntry = boysYearly.find((yc) => yc.year === previousYear);
  const girlsEntry = girlsYearly.find((yc) => yc.year === previousYear);

  const previousTotal = (boysEntry?.count || 0) + (girlsEntry?.count || 0);

  if (previousTotal === 0) return null;

  const change = yearStats.value.totalCount - previousTotal;
  const percentChange = (change / previousTotal) * 100;

  return {
    change,
    percentChange,
  };
});

const breadcrumbs = computed(() => {
  if (!nameData.value || !year.value) return [];

  return [
    {
      label: nameData.value.name,
      to: `/name/${encodeURIComponent(nameData.value.name)}`,
    },
    {
      label: year.value.toString(),
    },
  ];
});

const popularityData = computed(() => {
  if (!nameData.value?.girlsYearly || !nameData.value?.boysYearly) {
    return [];
  }

  const girlsMap = new Map(
    nameData.value.girlsYearly.map(
      (yc) => [yc.year, yc.count] as [number, number],
    ),
  );
  const boysMap = new Map(
    nameData.value.boysYearly.map(
      (yc) => [yc.year, yc.count] as [number, number],
    ),
  );

  const allYears = new Set([...girlsMap.keys(), ...boysMap.keys()]);
  const sorted = [...allYears].sort((a, b) => a - b);

  return sorted.map(
    (y) =>
      [y, (girlsMap.get(y) || 0) + (boysMap.get(y) || 0)] as [number, number],
  );
});

const genderScoreData = computed(() => {
  if (!nameData.value?.girlsYearly || !nameData.value?.boysYearly) {
    return [];
  }

  const girlsMap = new Map(
    nameData.value.girlsYearly.map(
      (yc) => [yc.year, yc.count] as [number, number],
    ),
  );
  const boysMap = new Map(
    nameData.value.boysYearly.map(
      (yc) => [yc.year, yc.count] as [number, number],
    ),
  );

  return calculateYearlyGenderScores(girlsMap, boysMap);
});

const hasBothGenders = computed(() => {
  if (!nameData.value) return false;
  const girlsYearly = nameData.value.girlsYearly || [];
  const boysYearly = nameData.value.boysYearly || [];
  return girlsYearly.length > 0 && boysYearly.length > 0;
});

const rankDataMap = computed(() => {
  if (!yearlyRanksMap.value || Object.keys(yearlyRanksMap.value).length === 0) {
    return {};
  }
  return yearlyRanksMap.value;
});

function parseRouteParams(): { name: string; year: number } | null {
  const encodedName = route.params.name;
  const yearParam = route.params.year;

  const decodedName = Array.isArray(encodedName)
    ? decodeURIComponent(encodedName[0] || "")
    : decodeURIComponent((encodedName as string) || "");

  const yearValue = Array.isArray(yearParam)
    ? parseInt(yearParam[0] || "0", 10)
    : parseInt((yearParam as string) || "0", 10);

  if (isNaN(yearValue) || yearValue < 1996 || yearValue > 2024) {
    loadError.value =
      "Invalid year. Please select a year between 1996 and 2024.";
    return null;
  }

  return { name: decodedName, year: yearValue };
}

async function loadData() {
  loading.value = true;
  loadError.value = null;

  try {
    const params = parseRouteParams();
    if (!params) return;

    const { name: decodedName, year: yearValue } = params;

    const data = await getName(decodedName);

    if (!data) {
      loadError.value = `Name "${decodedName}" not found in dataset`;
      return;
    }

    nameData.value = data;
    year.value = yearValue;

    yearlyRanksMap.value = await getYearlyRanks(decodedName);

    const girlsYearly = data.girlsYearly || [];
    const boysYearly = data.boysYearly || [];
    const hasYearData =
      girlsYearly.some((yc) => yc.year === yearValue) ||
      boysYearly.some((yc) => yc.year === yearValue);

    if (!hasYearData) {
      loadError.value = `No data available for "${decodedName}" in the year ${yearValue}.`;
    }
  } catch (error: unknown) {
    loadError.value =
      error instanceof Error ? error.message : "Failed to load name data";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

watch(
  () => ({ name: route.params.name, year: route.params.year }),
  (newParams, oldParams) => {
    // Only reload if we're still on a year page and the params changed
    if (
      newParams.name &&
      newParams.year &&
      newParams.year !== oldParams?.year
    ) {
      loadData();
    }
  },
);

function navigateToYear(selectedYear: number) {
  if (nameData.value && selectedYear !== year.value) {
    router.push({
      name: "year",
      params: {
        name: encodeURIComponent(nameData.value.name),
        year: selectedYear.toString(),
      },
    });
  }
}
</script>

<template>
  <div class="year-page">
    <div v-if="loading" class="loading">Loading data...</div>
    <div v-else-if="loadError" class="error">{{ loadError }}</div>
    <div v-else-if="nameData && year && yearStats">
      <BreadcrumbNav :items="breadcrumbs" size="large" />

      <div class="stats-grid">
        <div class="stat-card stat-card-primary">
          <span class="stat-label">Total Count</span>
          <span class="stat-value">{{
            formatNumber(yearStats.totalCount)
          }}</span>
          <div v-if="previousYearStats" class="year-change">
            <span
              class="change-indicator"
              :class="{ positive: previousYearStats.change >= 0 }"
            >
              {{ previousYearStats.change >= 0 ? "↑" : "↓" }}
              {{ Math.abs(previousYearStats.percentChange).toFixed(1) }}%
            </span>
            <span class="change-label">vs {{ year - 1 }}</span>
          </div>
        </div>

        <div class="stat-card">
          <span class="stat-label">Gender Score</span>
          <span class="stat-value colored">
            {{ formatGenderScore(yearStats.genderScore) }}
          </span>
          <span
            class="stat-category"
            :style="{ color: getCategoryColor(yearStats.genderScore) }"
            >{{ getGenderCategory(yearStats.genderScore) }}</span
          >
        </div>

        <div class="stat-card">
          <span class="stat-label girls-label">Girls</span>
          <span class="stat-value">{{
            formatNumber(yearStats.girlsCount)
          }}</span>
          <span
            v-if="yearStats.girlsCount > 0 && yearStats.boysCount > 0"
            class="stat-percent"
          >
            {{ yearStats.girlsPercent.toFixed(1) }}%
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-label boys-label">Boys</span>
          <span class="stat-value">{{
            formatNumber(yearStats.boysCount)
          }}</span>
          <span
            v-if="yearStats.girlsCount > 0 && yearStats.boysCount > 0"
            class="stat-percent"
          >
            {{ yearStats.boysPercent.toFixed(1) }}%
          </span>
        </div>
      </div>

      <div class="charts-section">
        <h2>Historical Context</h2>
        <div class="charts-grid" :class="{ 'full-width': !hasBothGenders }">
          <ChartContainer
            title="Popularity Trend"
            :data="popularityData"
            y-axis-label="Total Count"
            color="#F59E0B"
            :rank-data="rankDataMap"
            @point-click="navigateToYear"
          />
          <ChartContainer
            v-if="hasBothGenders"
            title="Gender Score Evolution"
            :data="genderScoreData"
            y-axis-label="Gender Score"
            color="#059669"
            :gradient-color="true"
            @point-click="navigateToYear"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.year-page {
  padding: 0;
}

h2 {
  margin: 2rem 0 1.5rem 0;
  color: #333;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  font-size: 1.1rem;
}

.error {
  color: #d32f2f;
  background: #ffebee;
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-card-primary {
  background: linear-gradient(135deg, #f59e0b20 0%, #f59e0b10 100%);
  border-color: #f59e0b;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-label.girls-label {
  color: #7c3aed;
}

.stat-label.boys-label {
  color: #059669;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

.stat-value.colored {
  font-family: monospace;
}

.stat-category {
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-percent {
  font-size: 0.9rem;
  color: #999;
}

.year-change {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.change-indicator {
  font-size: 1rem;
  font-weight: bold;
  color: #d32f2f;
}

.change-indicator.positive {
  color: #059669;
}

.change-label {
  font-size: 0.75rem;
  color: #999;
}

.charts-section {
  margin-top: 3rem;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.charts-grid.full-width {
  grid-template-columns: 1fr;
}

@media (max-width: 768px) {
  h1 {
    font-size: 1.5rem;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
