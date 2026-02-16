<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { getAllNames } from "@/composables/useNamesData";
import { formatGenderScore, getGenderColor } from "@/utils/formatters";
import type { NameDataComputed } from "@/models/types";

const router = useRouter();
const query = ref("");
const results = ref<NameDataComputed[]>([]);
const isOpen = ref(false);
const activeIndex = ref(-1);
const inputRef = ref<HTMLInputElement | null>(null);

let allNames: NameDataComputed[] = [];
let loaded = false;

async function ensureLoaded() {
  if (!loaded) {
    allNames = await getAllNames();
    loaded = true;
  }
}

watch(query, async (value) => {
  if (value.length === 0) {
    results.value = [];
    isOpen.value = false;
    activeIndex.value = -1;
    return;
  }

  await ensureLoaded();
  const search = value.toLowerCase();
  results.value = allNames
    .filter((n) => n.name.toLowerCase().startsWith(search))
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 10);
  isOpen.value = results.value.length > 0;
  activeIndex.value = -1;
});

function selectName(name: string) {
  query.value = "";
  isOpen.value = false;
  router.push(`/name/${name}`);
}

function onKeydown(event: KeyboardEvent) {
  if (!isOpen.value) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex.value = Math.min(
      activeIndex.value + 1,
      results.value.length - 1,
    );
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, -1);
  } else if (event.key === "Enter" && activeIndex.value >= 0) {
    event.preventDefault();
    const selected = results.value[activeIndex.value];
    if (selected) selectName(selected.name);
  } else if (event.key === "Escape") {
    isOpen.value = false;
    activeIndex.value = -1;
  }
}

function onBlur() {
  // Delay to allow click on dropdown item
  setTimeout(() => {
    isOpen.value = false;
    activeIndex.value = -1;
  }, 150);
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
</script>

<template>
  <div class="name-search">
    <input
      ref="inputRef"
      v-model="query"
      type="text"
      placeholder="Search names..."
      class="search-input"
      @keydown="onKeydown"
      @blur="onBlur"
      @focus="ensureLoaded"
    />
    <div v-if="isOpen" class="search-dropdown">
      <button
        v-for="(item, index) in results"
        :key="item.name"
        class="search-result"
        :class="{ active: index === activeIndex }"
        @mousedown.prevent="selectName(item.name)"
      >
        <span class="result-name">{{ capitalize(item.name) }}</span>
        <span class="result-score" :class="getGenderColor(item.genderScore)">
          {{ formatGenderScore(item.genderScore) }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.name-search {
  position: relative;
}

.search-input {
  padding: 0.35rem 0.75rem;
  border: 1px solid rgba(51, 51, 51, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 0.9rem;
  width: 200px;
}

.search-input::placeholder {
  color: rgba(51, 51, 51, 0.5);
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  max-height: 300px;
  overflow-y: auto;
}

.search-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 0;
  background: none;
  cursor: pointer;
  font-size: 0.9rem;
  text-align: left;
  color: #333;
}

.search-result:hover,
.search-result.active {
  background: #fef3c7;
}

.result-score {
  font-family: monospace;
  font-size: 0.85rem;
}

.result-score.female {
  color: #7c3aed;
}

.result-score.male {
  color: #059669;
}

.result-score.neutral {
  color: #f59e0b;
}
</style>
