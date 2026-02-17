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
type ScoreFilter = "all" | "feminine" | "neutral" | "masculine";

const nameLength = ref<number | null>(null);
const startingLetter = ref<string | null>(null);
const scoreFilter = ref<ScoreFilter>("all");
const perPage = ref(100);
const page = ref(1);
const highlightName = ref<string | undefined>();
const allNames = shallowRef<NameDataComputed[]>([]);
const rankMap = shallowRef<Map<string, Ranks>>(new Map());

const availableLengths = computed(() => {
  const lengths = new Set(allNames.value.map((n) => n.name.length));
  return [...lengths].sort((a, b) => a - b);
});

const availableLetters = computed(() => {
  const letters = new Set(
    allNames.value.map((n) => n.name.charAt(0).toUpperCase()),
  );
  return [...letters].sort();
});

const sortedNames = computed(() => {
  const criterion = filter.value === "overall" ? "total" : filter.value;
  let names = allNames.value;
  if (filter.value === "girls") {
    names = names.filter((n) => n.girlsTotal > 0);
  } else if (filter.value === "boys") {
    names = names.filter((n) => n.boysTotal > 0);
  }
  let sorted = getTopNames(names, criterion);
  if (nameLength.value !== null) {
    sorted = sorted.filter((n) => n.name.length === nameLength.value);
  }
  if (startingLetter.value !== null) {
    sorted = sorted.filter(
      (n) => n.name.charAt(0).toUpperCase() === startingLetter.value,
    );
  }
  if (scoreFilter.value === "feminine") {
    sorted = sorted.filter((n) => n.genderScore > 0.3);
  } else if (scoreFilter.value === "masculine") {
    sorted = sorted.filter((n) => n.genderScore < -0.3);
  } else if (scoreFilter.value === "neutral") {
    sorted = sorted.filter(
      (n) => n.genderScore >= -0.3 && n.genderScore <= 0.3,
    );
  }
  return sorted;
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
  const base = titles[filter.value];
  const parts: string[] = [];
  if (nameLength.value !== null) {
    parts.push(`${nameLength.value} letters`);
  }
  if (startingLetter.value !== null) {
    parts.push(`starting with ${startingLetter.value}`);
  }
  if (scoreFilter.value !== "all") {
    parts.push(scoreFilter.value);
  }
  return parts.length > 0 ? `${base} (${parts.join(", ")})` : base;
});

function syncQueryParams() {
  router.replace({
    query: {
      f: filter.value === "overall" ? undefined : filter.value,
      len: nameLength.value ?? undefined,
      letter: startingLetter.value ?? undefined,
      page: page.value === 1 ? undefined : page.value,
      score: scoreFilter.value === "all" ? undefined : scoreFilter.value,
      pp: perPage.value === 100 ? undefined : perPage.value,
    },
  });
}

const updateFilter = (newFilter: FilterType) => {
  filter.value = newFilter;
  page.value = 1;
  syncQueryParams();
};

const updateNameLength = (newLength: number | null) => {
  nameLength.value = newLength;
  page.value = 1;
  syncQueryParams();
};

const updateStartingLetter = (newLetter: string | null) => {
  startingLetter.value = newLetter;
  page.value = 1;
  syncQueryParams();
};

const updateScoreFilter = (newScore: ScoreFilter) => {
  scoreFilter.value = newScore;
  page.value = 1;
  syncQueryParams();
};

const updatePerPage = (newPerPage: number) => {
  perPage.value = newPerPage;
  page.value = 1;
  syncQueryParams();
};

const sortSelectClass = computed(() => ({
  "select-girls": filter.value === "girls",
  "select-boys": filter.value === "boys",
}));

const scoreSelectClass = computed(() => ({
  "select-girls": scoreFilter.value === "feminine",
  "select-boys": scoreFilter.value === "masculine",
  "select-neutral": scoreFilter.value === "neutral",
}));

const goToPage = (newPage: number) => {
  page.value = Math.max(1, Math.min(newPage, totalPages.value));
  syncQueryParams();
};

function parseQueryParams() {
  const queryF = route.query.f as string | undefined;
  if (queryF && ["overall", "boys", "girls"].includes(queryF)) {
    filter.value = queryF as FilterType;
  }

  const queryLen = route.query.len as string | undefined;
  if (queryLen) {
    const val = parseInt(queryLen, 10);
    if (!isNaN(val) && val > 0) {
      nameLength.value = val;
    }
  }

  const queryLetter = route.query.letter as string | undefined;
  if (queryLetter && /^[A-Z]$/i.test(queryLetter)) {
    startingLetter.value = queryLetter.toUpperCase();
  }

  const queryScore = route.query.score as string | undefined;
  if (queryScore && ["feminine", "neutral", "masculine"].includes(queryScore)) {
    scoreFilter.value = queryScore as ScoreFilter;
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
}

onMounted(async () => {
  loading.value = true;
  loadError.value = null;

  try {
    allNames.value = await getAllNames();
    rankMap.value = await getRankingMap();
    parseQueryParams();
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
    <h1>Browse Names</h1>

    <div v-if="loading" class="loading">Loading data...</div>
    <div v-else-if="loadError" class="error">Error: {{ loadError }}</div>
    <div v-else>
      <div class="filters">
        <div class="filter-item">
          <label for="sort-by">Sort by</label>
          <select
            id="sort-by"
            :value="filter"
            :class="sortSelectClass"
            @change="
              updateFilter(
                ($event.target as HTMLSelectElement).value as FilterType,
              )
            "
          >
            <option value="overall">Overall</option>
            <option value="girls">Girls</option>
            <option value="boys">Boys</option>
          </select>
        </div>

        <div class="filter-item">
          <label for="score-filter">Score</label>
          <select
            id="score-filter"
            :value="scoreFilter"
            :class="scoreSelectClass"
            @change="
              updateScoreFilter(
                ($event.target as HTMLSelectElement).value as ScoreFilter,
              )
            "
          >
            <option value="all">All</option>
            <option value="feminine">Feminine</option>
            <option value="neutral">Neutral</option>
            <option value="masculine">Masculine</option>
          </select>
        </div>

        <div class="filter-item">
          <label for="name-length">Length</label>
          <select
            id="name-length"
            :value="nameLength ?? ''"
            @change="
              updateNameLength(
                ($event.target as HTMLSelectElement).value === ''
                  ? null
                  : parseInt(($event.target as HTMLSelectElement).value),
              )
            "
          >
            <option value="">All</option>
            <option v-for="len in availableLengths" :key="len" :value="len">
              {{ len }} letters
            </option>
          </select>
        </div>

        <div class="filter-item">
          <label for="starting-letter">Starts with</label>
          <select
            id="starting-letter"
            :value="startingLetter ?? ''"
            @change="
              updateStartingLetter(
                ($event.target as HTMLSelectElement).value === ''
                  ? null
                  : ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option value="">All</option>
            <option
              v-for="letter in availableLetters"
              :key="letter"
              :value="letter"
            >
              {{ letter }}
            </option>
          </select>
        </div>

        <div class="filter-item">
          <label for="per-page">Per page</label>
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

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-item label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
  white-space: nowrap;
}

.filter-item select {
  padding: 0.4rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
  color: #333;
  transition: border-color 0.2s ease;
}

.filter-item select:hover {
  border-color: #999;
}

.filter-item select:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

/* Colour-coded select values */
.filter-item select.select-girls {
  color: #7c3aed;
}

.filter-item select.select-boys {
  color: #059669;
}

.filter-item select.select-neutral {
  color: #b45309;
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
  .pagination {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
