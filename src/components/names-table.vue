<script setup lang="ts">
import type { NameDataComputed, Ranks } from "@/models/types";
import {
  formatGenderScore,
  formatNumber,
  getGenderColor,
} from "@/utils/formatters";
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";

interface NameRow {
  name: NameDataComputed;
  ranks: Ranks;
}

interface Props {
  title: string;
  rows: NameRow[];
  showRanks?: boolean;
  startIndex?: number;
  highlightName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  highlightName: undefined,
  showRanks: true,
  startIndex: 0,
});

const router = useRouter();

const rowsComputed = computed(() =>
  props.rows.map((row: NameRow) => ({
    ...row,
    genderColor: getGenderColor(row.name.genderScore),
  })),
);

const highlightedRow = ref<HTMLTableRowElement | null>(null);

watch(highlightedRow, (el) => {
  if (el) {
    nextTick(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
});

const goToName = (name: string) => {
  router.push({ name: "lookup", params: { name: encodeURIComponent(name) } });
};
</script>

<template>
  <div class="names-table-container">
    <h2>{{ title }}</h2>
    <div class="table-wrapper">
      <table class="names-table">
        <thead>
          <tr>
            <th class="rank-col">Rank</th>
            <th class="name-col">Name</th>
            <th
              class="score-col"
              title="Gender Score (-1 masculine, +1 feminine)"
            >
              Score
            </th>
            <th v-if="showRanks" class="rank-detail-col">Overall Rank</th>
            <th v-if="showRanks" class="rank-detail-col">Girls Rank</th>
            <th v-if="showRanks" class="rank-detail-col">Boys Rank</th>
            <th class="count-col">Girls</th>
            <th class="count-col">Boys</th>
            <th class="total-col">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rowsComputed"
            :ref="
              (el) => {
                if (row.name.name === props.highlightName)
                  highlightedRow = el as HTMLTableRowElement;
              }
            "
            :key="row.name.name"
            :class="{ highlighted: row.name.name === props.highlightName }"
          >
            <td class="rank-col">{{ props.startIndex + idx + 1 }}</td>
            <td class="name-col">
              <a href="#" @click.prevent="goToName(row.name.name)">
                {{ row.name.name }}
              </a>
            </td>
            <td
              class="score-col"
              :class="row.genderColor"
              :title="`${row.genderColor} (${formatGenderScore(row.name.genderScore)})`"
            >
              {{ formatGenderScore(row.name.genderScore) }}
            </td>
            <td v-if="showRanks" class="rank-detail-col">
              {{ row.ranks.overall || "-" }}
            </td>
            <td v-if="showRanks" class="rank-detail-col">
              {{ row.name.girlsTotal > 0 ? row.ranks.girls : "-" }}
            </td>
            <td v-if="showRanks" class="rank-detail-col">
              {{ row.name.boysTotal > 0 ? row.ranks.boys : "-" }}
            </td>
            <td class="count-col">{{ formatNumber(row.name.girlsTotal) }}</td>
            <td class="count-col">{{ formatNumber(row.name.boysTotal) }}</td>
            <td class="total-col">{{ formatNumber(row.name.totalCount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.names-table-container {
  margin: 2rem 0;
}

.names-table-container h2 {
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
  color: #333;
}

.table-wrapper {
  overflow-x: auto;
}

.names-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.names-table th {
  background: #f5f5f5;
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #ddd;
  font-size: 0.9rem;
}

.names-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.names-table tbody tr:hover {
  background: #fafafa;
}

.names-table tbody tr.highlighted {
  background: #fef3c7;
}

.names-table tbody tr.highlighted:hover {
  background: #fde68a;
}

.rank-col {
  width: 60px;
  text-align: right;
  color: #999;
}

.name-col {
  width: 150px;
}

.score-col {
  width: 100px;
  text-align: right;
  font-weight: 500;
  font-family: monospace;
}

.score-col.female {
  color: #7c3aed;
}

.score-col.male {
  color: #059669;
}

.score-col.neutral {
  color: #f59e0b;
}

.rank-detail-col {
  width: 90px;
  text-align: right;
}

.count-col {
  width: 100px;
  text-align: right;
}

.total-col {
  width: 100px;
  text-align: right;
  color: #666;
  font-size: 0.9rem;
}

.name-col a {
  color: #f59e0b;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
}

.name-col a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .names-table th,
  .names-table td {
    padding: 0.5rem;
    font-size: 0.85rem;
  }

  .rank-detail-col {
    display: none;
  }
}
</style>
