<script setup lang="ts">
import type { NameDataComputed, Ranks } from "@/models/types";
import {
  formatGenderScore,
  formatNumber,
  getGenderCategory,
} from "@/utils/formatters";
import { useRouter } from "vue-router";

interface Props {
  name: NameDataComputed;
  ranks: Ranks;
}

const props = defineProps<Props>();
const router = useRouter();

function getCategoryColor(genderScore: number): string {
  if (genderScore > 0.3) {
    return "#7C3AED";
  }
  if (genderScore < -0.3) {
    return "#059669";
  }
  return "#F59E0B";
}

function goToPopularPage(rank: number, filter?: "girls" | "boys") {
  const page = Math.ceil(rank / 100);
  router.push({
    name: "popular",
    query: {
      f: filter,
      highlight: props.name.name,
      page: page === 1 ? undefined : page,
    },
  });
}
</script>

<template>
  <div class="stats-container">
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Gender Score</span>
        <span class="stat-value" :class="{ colored: true }">
          {{ formatGenderScore(name.genderScore) }}
        </span>
        <span
          class="stat-category"
          :style="{ color: getCategoryColor(name.genderScore) }"
          >{{ getGenderCategory(name.genderScore) }}</span
        >
      </div>

      <div class="stat-item">
        <span class="stat-label">Total Count</span>
        <span class="stat-value">{{ formatNumber(name.totalCount) }}</span>
      </div>

      <div class="stat-item">
        <span class="stat-label girls-label">Girls</span>
        <span class="stat-value">{{ formatNumber(name.girlsTotal) }}</span>
      </div>

      <div class="stat-item">
        <span class="stat-label boys-label">Boys</span>
        <span class="stat-value">{{ formatNumber(name.boysTotal) }}</span>
      </div>

      <a
        class="stat-item stat-link"
        href="#"
        @click.prevent="goToPopularPage(ranks.overall)"
      >
        <span class="stat-label">Overall Rank</span>
        <span class="stat-value">{{ ranks.overall }}</span>
      </a>

      <a
        v-if="name.girlsTotal > 0"
        class="stat-item stat-link"
        href="#"
        @click.prevent="goToPopularPage(ranks.girls, 'girls')"
      >
        <span class="stat-label">Girls Rank</span>
        <span class="stat-value">{{ ranks.girls }}</span>
      </a>

      <a
        v-if="name.boysTotal > 0"
        class="stat-item stat-link"
        href="#"
        @click.prevent="goToPopularPage(ranks.boys, 'boys')"
      >
        <span class="stat-label">Boys Rank</span>
        <span class="stat-value">{{ ranks.boys }}</span>
      </a>

      <div v-if="name.girlsTotal > 0 && name.boysTotal > 0" class="stat-item">
        <span class="stat-label">Girl % of Total</span>
        <span class="stat-value">
          {{ ((name.girlsTotal / name.totalCount) * 100).toFixed(1) }}%
        </span>
      </div>

      <div v-if="name.girlsTotal > 0 && name.boysTotal > 0" class="stat-item">
        <span class="stat-label">Boy % of Total</span>
        <span class="stat-value">
          {{ ((name.boysTotal / name.totalCount) * 100).toFixed(1) }}%
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-container {
  margin: 2rem 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-link {
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.stat-link:hover {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
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

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
