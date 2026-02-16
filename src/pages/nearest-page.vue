<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { findClosestToScore, getTopNames } from "@/utils/calculations";
import type { NameDataComputed, Ranks } from "@/models/types";
import { useNamesData } from "@/composables/useNamesData";
import NamesTable from "@/components/names-table.vue";
import ScoreSlider from "@/components/score-slider.vue";

const route = useRoute();
const router = useRouter();
const { getAllNames, getRankingMap } = useNamesData();

const loading = ref(false);
const loadError = ref<string | null>(null);
const targetScore = ref(0.5);
const resultCount = ref(25);
const topN = ref(1000);
const selectedPreset = ref("1000");
const customTopN = ref(1000);
const allNames = shallowRef<NameDataComputed[]>([]);
const rankMap = shallowRef<Map<string, Ranks>>(new Map());

const presetOptions = ["100", "500", "1000", "1500", "2000", "0", "custom"];

const filteredNames = computed(() => {
  if (topN.value === 0) {
    return allNames.value;
  }
  return getTopNames(allNames.value, "total", topN.value);
});

const closestNames = computed(() => {
  const names = findClosestToScore(
    filteredNames.value,
    targetScore.value,
    resultCount.value,
  );
  return names.map((name: NameDataComputed) => ({
    name,
    ranks: rankMap.value.get(name.name) || { girls: 0, boys: 0, overall: 0 },
  }));
});

let queryParamTimer: ReturnType<typeof setTimeout> | undefined;

function syncQueryParams() {
  clearTimeout(queryParamTimer);
  queryParamTimer = setTimeout(() => {
    router.replace({
      query: {
        n: resultCount.value,
        target: targetScore.value.toFixed(2),
        top: topN.value === 0 ? undefined : topN.value,
      },
    });
  }, 200);
}

const updateScore = () => {
  syncQueryParams();
};

const updateResultCount = () => {
  syncQueryParams();
};

const updatePreset = (value: string) => {
  selectedPreset.value = value;
  if (value === "custom") {
    topN.value = customTopN.value;
  } else {
    topN.value = parseInt(value, 10);
  }
  syncQueryParams();
};

const updateCustomTopN = () => {
  if (customTopN.value > 0) {
    topN.value = customTopN.value;
    syncQueryParams();
  }
};

function applyQueryParams() {
  const queryTarget = route.query.target as string | undefined;
  const queryN = route.query.n as string | undefined;
  const queryTop = route.query.top as string | undefined;

  if (queryTarget) {
    const val = parseFloat(
      Array.isArray(queryTarget) ? queryTarget[0] : queryTarget || "0",
    );
    if (!isNaN(val) && val >= -1 && val <= 1) {
      targetScore.value = val;
    }
  }

  if (queryN) {
    const val = parseInt(Array.isArray(queryN) ? queryN[0] : queryN || "0", 10);
    if (!isNaN(val) && val > 0 && val <= 1000) {
      resultCount.value = val;
    }
  }

  if (queryTop) {
    const val = parseInt(
      Array.isArray(queryTop) ? queryTop[0] : queryTop || "0",
      10,
    );
    if (!isNaN(val)) {
      topN.value = val;
      if (presetOptions.includes(val.toString())) {
        selectedPreset.value = val.toString();
      } else if (val > 0) {
        selectedPreset.value = "custom";
        customTopN.value = val;
      }
    }
  }
}

onMounted(async () => {
  loading.value = true;
  loadError.value = null;

  try {
    allNames.value = await getAllNames();
    rankMap.value = await getRankingMap();
    applyQueryParams();
  } catch (error: unknown) {
    loadError.value =
      error instanceof Error ? error.message : "Failed to load data";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="nearest-page">
    <h1>Find Names by Gender Score</h1>

    <div v-if="loading" class="loading">Loading data...</div>
    <div v-else-if="loadError" class="error">Error: {{ loadError }}</div>
    <div v-else>
      <div class="controls-section">
        <ScoreSlider v-model="targetScore" @update:model-value="updateScore" />

        <div class="filter-controls">
          <div class="control-group">
            <label for="result-count">Results to show:</label>
            <input
              id="result-count"
              v-model.number="resultCount"
              type="number"
              min="1"
              max="1000"
              @change="updateResultCount"
            />
          </div>

          <div class="control-group">
            <label for="top-filter">Filter by popularity:</label>
            <select
              id="top-filter"
              :value="selectedPreset"
              @change="updatePreset(($event.target as HTMLSelectElement).value)"
            >
              <option value="0">All Names</option>
              <option value="100">Top 100</option>
              <option value="500">Top 500</option>
              <option value="1000">Top 1000</option>
              <option value="1500">Top 1500</option>
              <option value="2000">Top 2000</option>
              <option value="custom">Custom...</option>
            </select>
          </div>

          <div v-if="selectedPreset === 'custom'" class="control-group">
            <label for="custom-top">Custom limit:</label>
            <input
              id="custom-top"
              v-model.number="customTopN"
              type="number"
              min="1"
              @change="updateCustomTopN"
            />
          </div>
        </div>
      </div>

      <NamesTable
        :title="`Names Closest to ${targetScore.toFixed(2)}`"
        :rows="closestNames"
        show-ranks
      />
    </div>
  </div>
</template>

<style scoped>
.nearest-page {
  padding: 0;
}

h1 {
  margin-bottom: 1.5rem;
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

.controls-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin-bottom: 2rem;
}

.filter-controls {
  display: flex;
  gap: 2rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.control-group label {
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.control-group input,
.control-group select {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
}

.control-group input {
  width: 150px;
}

.control-group input:focus,
.control-group select:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}
</style>
