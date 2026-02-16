<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { NameDataComputed, Ranks } from "@/models/types";
import { calculateYearlyGenderScores } from "@/utils/calculations";
import { useRoute, useRouter } from "vue-router";
import { useNamesData } from "@/composables/useNamesData";
import ChartContainer from "@/components/chart-container.vue";
import NameStatsTable from "@/components/name-stats-table.vue";

const route = useRoute();
const router = useRouter();
const { getName, getRankingMap, getYearlyRanks } = useNamesData();

const loading = ref(false);
const loadError = ref<string | null>(null);
const nameData = ref<NameDataComputed | null>(null);
const ranks = ref<Ranks | null>(null);
const yearlyRanksMap = ref<Record<number, number>>({});

function navigateToYear(year: number) {
  if (nameData.value) {
    router.push({
      name: "year",
      params: {
        name: encodeURIComponent(nameData.value.name),
        year: year.toString(),
      },
    });
  }
}

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
    (year) =>
      [year, (girlsMap.get(year) || 0) + (boysMap.get(year) || 0)] as [
        number,
        number,
      ],
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

const hasYearlyData = computed(() => popularityData.value.length > 0);

const hasBothGenders = computed(() => {
  if (!nameData.value) return false;
  return nameData.value.boysTotal > 0 && nameData.value.girlsTotal > 0;
});

const rankDataMap = computed(() => {
  if (!yearlyRanksMap.value || Object.keys(yearlyRanksMap.value).length === 0) {
    return {};
  }
  return yearlyRanksMap.value;
});

async function loadNameData() {
  loading.value = true;
  loadError.value = null;

  try {
    const encodedName = route.params.name;
    const decodedName = Array.isArray(encodedName)
      ? decodeURIComponent(encodedName[0] || "")
      : decodeURIComponent((encodedName as string) || "");

    const data = await getName(decodedName);

    if (!data) {
      loadError.value = `Name "${decodedName}" not found in dataset`;
      return;
    }

    nameData.value = data;

    // Get aggregate ranks from cached ranking map
    const rankingMap = await getRankingMap();
    ranks.value = rankingMap.get(data.name) ?? {
      girls: 0,
      boys: 0,
      overall: 0,
    };

    // Get yearly ranks for the chart tooltip
    yearlyRanksMap.value = await getYearlyRanks(decodedName);
  } catch (error: unknown) {
    loadError.value =
      error instanceof Error ? error.message : "Failed to load name data";
  } finally {
    loading.value = false;
  }
}

onMounted(loadNameData);
watch(() => route.params.name, loadNameData);
</script>

<template>
  <div class="lookup-page">
    <div v-if="loading" class="loading">Loading data...</div>
    <div v-else-if="loadError" class="error">{{ loadError }}</div>
    <div v-else-if="nameData && ranks">
      <h1>{{ nameData.name }}</h1>

      <NameStatsTable :name="nameData" :ranks="ranks" />

      <div v-if="hasYearlyData" class="charts-section">
        <h2>Historical Trends (1996-2024)</h2>
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
      <div v-else class="no-data">
        <p>No historical data available for this name.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lookup-page {
  padding: 0;
}

h1 {
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 2rem;
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
  padding: 2rem;
}

.no-data {
  text-align: center;
  padding: 2rem;
  background: #f5f5f5;
  border-radius: 8px;
  color: #666;
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

  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
