<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getTopNames } from "@/utils/calculations";
import type { NameDataComputed, Ranks } from "@/models/types";
import { useNamesData } from "@/composables/useNamesData";
import NamesTable from "@/components/names-table.vue";

type FilterType = "overall" | "boys" | "girls";

const route = useRoute();
const router = useRouter();
const { getAllNames, getRankingMap } = useNamesData();

const loading = ref(false);
const loadError = ref<string | null>(null);
const filter = ref<FilterType>("overall");
const perPage = ref(100);
const page = ref(1);
const highlightName = ref<string | undefined>();
const allNames = shallowRef<NameDataComputed[]>([]);
const rankMap = shallowRef<Map<string, Ranks>>(new Map());

const sortedNames = computed(() => {
  const criterion = filter.value === "overall" ? "total" : filter.value;
  let names = allNames.value;
  if (filter.value === "girls") {
    names = names.filter((n) => n.girlsTotal > 0);
  } else if (filter.value === "boys") {
    names = names.filter((n) => n.boysTotal > 0);
  }
  return getTopNames(names, criterion);
});

const totalPages = computed(() =>
  Math.ceil(sortedNames.value.length / perPage.value),
);

const displayedNames = computed(() => {
  const start = (page.value - 1) * perPage.value;
  const end = start + perPage.value;
  return sortedNames.value.slice(start, end).map((name: NameDataComputed) => ({
    name,
    ranks: rankMap.value.get(name.name) || { girls: 0, boys: 0, overall: 0 },
  }));
});

const startIndex = computed(() => (page.value - 1) * perPage.value);

const tableTitle = computed(() => {
  const titles = {
    overall: "Top Names Overall",
    boys: "Top Boys Names",
    girls: "Top Girls Names",
  };
  return titles[filter.value];
});

function syncQueryParams() {
  router.replace({
    query: {
      f: filter.value === "overall" ? undefined : filter.value,
      page: page.value === 1 ? undefined : page.value,
      pp: perPage.value === 100 ? undefined : perPage.value,
    },
  });
}

const updateFilter = (newFilter: FilterType) => {
  filter.value = newFilter;
  page.value = 1;
  syncQueryParams();
};

const updatePerPage = (newPerPage: number) => {
  perPage.value = newPerPage;
  page.value = 1;
  syncQueryParams();
};

const goToPage = (newPage: number) => {
  page.value = Math.max(1, Math.min(newPage, totalPages.value));
  syncQueryParams();
};

onMounted(async () => {
  loading.value = true;
  loadError.value = null;

  try {
    allNames.value = await getAllNames();
    rankMap.value = await getRankingMap();

    const queryF = route.query.f as string | undefined;
    if (queryF && ["overall", "boys", "girls"].includes(queryF)) {
      filter.value = queryF as FilterType;
    }

    const queryPp = route.query.pp as string | undefined;
    if (queryPp) {
      const val = parseInt(queryPp, 10);
      if (val === 100 || val === 1000) {
        perPage.value = val;
      }
    }

    const queryPage = route.query.page as string | undefined;
    if (queryPage) {
      const val = parseInt(queryPage, 10);
      if (!isNaN(val) && val >= 1) {
        page.value = Math.min(val, totalPages.value);
      }
    }

    const queryHighlight = route.query.highlight as string | undefined;
    if (queryHighlight) {
      highlightName.value = queryHighlight;
    }
  } catch (error: unknown) {
    loadError.value =
      error instanceof Error ? error.message : "Failed to load data";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="popular-page">
    <h1>Popular Names</h1>

    <div v-if="loading" class="loading">Loading data...</div>
    <div v-else-if="loadError" class="error">Error: {{ loadError }}</div>
    <div v-else>
      <div class="controls">
        <div class="control-group">
          <label>Filter by:</label>
          <div class="filter-buttons">
            <button
              :class="{ active: filter === 'overall' }"
              class="filter-overall"
              @click="updateFilter('overall')"
            >
              Overall
            </button>
            <button
              :class="{ active: filter === 'girls' }"
              class="filter-girls"
              @click="updateFilter('girls')"
            >
              Girls
            </button>
            <button
              :class="{ active: filter === 'boys' }"
              class="filter-boys"
              @click="updateFilter('boys')"
            >
              Boys
            </button>
          </div>
        </div>
        <div class="control-group">
          <label for="per-page">Per page:</label>
          <select
            id="per-page"
            :value="perPage"
            @change="
              updatePerPage(
                parseInt(($event.target as HTMLSelectElement).value),
              )
            "
          >
            <option :value="100">100</option>
            <option :value="1000">1000</option>
          </select>
        </div>
      </div>

      <NamesTable
        :title="tableTitle"
        :rows="displayedNames"
        :show-ranks="true"
        :start-index="startIndex"
        :highlight-name="highlightName"
      />

      <div v-if="totalPages > 1" class="pagination">
        <button :disabled="page <= 1" @click="goToPage(1)">First</button>
        <button :disabled="page <= 1" @click="goToPage(page - 1)">Prev</button>
        <span class="page-info">
          Page {{ page }} of {{ totalPages }}
          <span class="total-count">
            ({{ sortedNames.length.toLocaleString() }} names)
          </span>
        </span>
        <button :disabled="page >= totalPages" @click="goToPage(page + 1)">
          Next
        </button>
        <button :disabled="page >= totalPages" @click="goToPage(totalPages)">
          Last
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.popular-page {
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

.controls {
  margin-bottom: 2rem;
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.control-group label {
  font-weight: 600;
  color: #333;
}

.control-group select {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
}

.control-group select:hover {
  border-color: #999;
}

.control-group select:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
}

.filter-buttons button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Overall button - orange */
.filter-buttons button.filter-overall:hover:not(.active) {
  border-color: #f59e0b;
  color: #f59e0b;
}

.filter-buttons button.filter-overall.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
}

/* Girls button - purple */
.filter-buttons button.filter-girls:hover:not(.active) {
  border-color: #7c3aed;
  color: #7c3aed;
}

.filter-buttons button.filter-girls.active {
  background: #7c3aed;
  border-color: #7c3aed;
  color: white;
}

/* Boys button - green */
.filter-buttons button.filter-boys:hover:not(.active) {
  border-color: #059669;
  color: #059669;
}

.filter-buttons button.filter-boys.active {
  background: #059669;
  border-color: #059669;
  color: white;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding: 1rem 0;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination button:hover:not(:disabled) {
  border-color: #f59e0b;
  color: #f59e0b;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: default;
}

.page-info {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
}

.total-count {
  color: #999;
  font-weight: 400;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    gap: 1rem;
  }

  .pagination {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
