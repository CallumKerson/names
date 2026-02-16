<script setup lang="ts">
import {
  getFeminineNames,
  getMasculineNames,
  getNeutralNames,
  getTopNames,
} from "@/utils/calculations";
import { computed, onMounted, ref, shallowRef } from "vue";
import type { NameDataComputed, Ranks } from "@/models/types";
import { useNamesData } from "@/composables/useNamesData";
import NamesTable from "@/components/names-table.vue";

const { getAllNames, getRankingMap } = useNamesData();

const loading = ref(false);
const loadError = ref<string | null>(null);
const allNames = shallowRef<NameDataComputed[]>([]);
const rankMap = shallowRef<Map<string, Ranks>>(new Map());

const topNames = computed(() => getTopNames(allNames.value, "total", 1000));

const feminineNames = computed(() => {
  const names = getFeminineNames(topNames.value);
  return getTopNames(names, "total", 10).map((name: NameDataComputed) => ({
    name,
    ranks: rankMap.value.get(name.name) || { girls: 0, boys: 0, overall: 0 },
  }));
});

const masculineNames = computed(() => {
  const names = getMasculineNames(topNames.value);
  return getTopNames(names, "total", 10).map((name: NameDataComputed) => ({
    name,
    ranks: rankMap.value.get(name.name) || { girls: 0, boys: 0, overall: 0 },
  }));
});

const neutralNames = computed(() => {
  const names = getNeutralNames(topNames.value);
  return getTopNames(names, "total", 10).map((name: NameDataComputed) => ({
    name,
    ranks: rankMap.value.get(name.name) || { girls: 0, boys: 0, overall: 0 },
  }));
});

onMounted(async () => {
  loading.value = true;
  loadError.value = null;

  try {
    allNames.value = await getAllNames();
    rankMap.value = await getRankingMap();
  } catch (error: unknown) {
    loadError.value =
      error instanceof Error ? error.message : "Failed to load data";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="score-page">
    <h1>Gender Score Analysis</h1>

    <div v-if="loading" class="loading">Loading data...</div>
    <div v-else-if="loadError" class="error">Error: {{ loadError }}</div>
    <div v-else>
      <NamesTable title="Top Feminine Names" :rows="feminineNames" show-ranks />

      <NamesTable
        title="Top Masculine Names"
        :rows="masculineNames"
        show-ranks
      />

      <NamesTable
        title="Most Gender-Neutral Names"
        :rows="neutralNames"
        show-ranks
      />
    </div>
  </div>
</template>

<style scoped>
.score-page {
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
</style>
