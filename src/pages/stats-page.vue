<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import type { NameDataComputed } from "@/models/types";
import { getYearlyDataset, useNamesData } from "@/composables/useNamesData";
import {
  computeGenderScoreChanges,
  computePopularityChanges,
  type GenderScoreChange,
  getFeminineNames,
  getMasculineNames,
  getNeutralNames,
  getTopNames,
  findClosestToScore,
  type PopularityChange,
} from "@/utils/calculations";
import {
  concentrationDataset,
  concentrationOptions,
  samplePoints,
} from "@/utils/concentration";
import {
  formatGenderScore,
  formatNumber,
  getGenderColor,
} from "@/utils/formatters";
import {
  CategoryScale,
  type ChartData,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
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

const { getAllNames, getMetadata } = useNamesData();

const loading = ref(false);
const loadError = ref<string | null>(null);
const allNames = shallowRef<NameDataComputed[]>([]);
const yearRange = ref("");

const yearlyLoading = ref(false);
const girlsRisers = shallowRef<PopularityChange[]>([]);
const girlsFallers = shallowRef<PopularityChange[]>([]);
const boysRisers = shallowRef<PopularityChange[]>([]);
const boysFallers = shallowRef<PopularityChange[]>([]);
const towardsFeminine = shallowRef<GenderScoreChange[]>([]);
const towardsMasculine = shallowRef<GenderScoreChange[]>([]);
const towardsNeutral = shallowRef<GenderScoreChange[]>([]);

async function loadYearlyChanges() {
  yearlyLoading.value = true;
  try {
    const yearly = await getYearlyDataset();
    const { startYear, endYear } = yearly.metadata;

    const girls = computePopularityChanges(yearly, startYear, endYear, "girls");
    girlsRisers.value = girls.risers;
    girlsFallers.value = girls.fallers;

    const boys = computePopularityChanges(yearly, startYear, endYear, "boys");
    boysRisers.value = boys.risers;
    boysFallers.value = boys.fallers;

    const scores = computeGenderScoreChanges(yearly, startYear, endYear);
    towardsFeminine.value = scores.towardsFeminine;
    towardsMasculine.value = scores.towardsMasculine;
    towardsNeutral.value = scores.towardsNeutral;
  } catch (error) {
    console.error("Failed to load yearly data for stats:", error);
  } finally {
    yearlyLoading.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  loadError.value = null;

  try {
    allNames.value = await getAllNames();
    const metadata = await getMetadata();
    yearRange.value = `${metadata.startYear}\u2013${metadata.endYear}`;
  } catch (error: unknown) {
    loadError.value =
      error instanceof Error ? error.message : "Failed to load data";
  } finally {
    loading.value = false;
  }

  loadYearlyChanges();
});

// Overview
const totalNames = computed(() => allNames.value.length);
const totalBabies = computed(() =>
  allNames.value.reduce((sum, n) => sum + n.totalCount, 0),
);
const totalGirls = computed(() =>
  allNames.value.reduce((sum, n) => sum + n.girlsTotal, 0),
);
const totalBoys = computed(() =>
  allNames.value.reduce((sum, n) => sum + n.boysTotal, 0),
);

// Gender distribution
const feminineCount = computed(() => getFeminineNames(allNames.value).length);
const masculineCount = computed(() => getMasculineNames(allNames.value).length);
const neutralCount = computed(() => getNeutralNames(allNames.value).length);

function pct(value: number, total: number): string {
  if (total === 0) return "0";
  return ((value / total) * 100).toFixed(1);
}

// Superlatives (among top 1,000 by popularity)
const top1000 = computed(() => getTopNames(allNames.value, "total", 1000));

const mostFeminine = computed(() => {
  const feminine = getFeminineNames(top1000.value);
  return feminine.length > 0
    ? [...feminine].sort((a, b) => b.genderScore - a.genderScore)[0]
    : null;
});

const mostMasculine = computed(() => {
  const masculine = getMasculineNames(top1000.value);
  return masculine.length > 0
    ? [...masculine].sort((a, b) => a.genderScore - b.genderScore)[0]
    : null;
});

const mostNeutral = computed(() => {
  const closest = findClosestToScore(top1000.value, 0, 1);
  return closest.length > 0 ? closest[0] : null;
});

const mostPopular = computed(() => {
  return allNames.value.length > 0
    ? getTopNames(allNames.value, "total", 1)[0]
    : null;
});

const mostPopularGirlsOnly = computed(() => {
  const girlsOnly = allNames.value.filter((n) => n.genderScore === 1);
  return girlsOnly.length > 0 ? getTopNames(girlsOnly, "total", 1)[0] : null;
});

const mostPopularBoysOnly = computed(() => {
  const boysOnly = allNames.value.filter((n) => n.genderScore === -1);
  return boysOnly.length > 0 ? getTopNames(boysOnly, "total", 1)[0] : null;
});

// Name length stats (among top 1,000)
const avgNameLength = computed(() => {
  if (top1000.value.length === 0) return 0;
  const total = top1000.value.reduce((sum, n) => sum + n.name.length, 0);
  return total / top1000.value.length;
});

const longestNames = computed(() =>
  [...top1000.value].sort((a, b) => b.name.length - a.name.length).slice(0, 5),
);

const shortestNames = computed(() =>
  [...top1000.value].sort((a, b) => a.name.length - b.name.length).slice(0, 5),
);

const lengthDistribution = computed(() => {
  const dist = new Map<number, number>();
  for (const n of top1000.value) {
    dist.set(n.name.length, (dist.get(n.name.length) ?? 0) + 1);
  }
  return [...dist.entries()].sort((a, b) => a[0] - b[0]);
});

const modeLength = computed(() => {
  if (lengthDistribution.value.length === 0) return 0;
  return lengthDistribution.value.reduce((best, curr) =>
    curr[1] > best[1] ? curr : best,
  )[0];
});

// Starting letter distribution (among top 1,000)
const letterDistribution = computed(() => {
  const dist = new Map<string, number>();
  for (const n of top1000.value) {
    const letter = n.name.charAt(0).toUpperCase();
    dist.set(letter, (dist.get(letter) ?? 0) + 1);
  }
  return [...dist.entries()].sort((a, b) => b[1] - a[1]);
});

const topLetters = computed(() => letterDistribution.value.slice(0, 5));
const rarestLetters = computed(() =>
  [...letterDistribution.value].sort((a, b) => a[1] - b[1]).slice(0, 5),
);

// Girls vs boys diversity
const uniqueGirlNames = computed(
  () => allNames.value.filter((n) => n.girlsTotal > 0).length,
);
const uniqueBoyNames = computed(
  () => allNames.value.filter((n) => n.boysTotal > 0).length,
);
const bothGenderNames = computed(
  () =>
    allNames.value.filter((n) => n.girlsTotal > 0 && n.boysTotal > 0).length,
);
const exclusiveNames = computed(
  () => allNames.value.length - bothGenderNames.value,
);

const concentrationData = computed<ChartData<"line">>(() => {
  if (allNames.value.length === 0) {
    return { labels: [], datasets: [] };
  }

  const byGirls = [...allNames.value].sort(
    (a, b) => b.girlsTotal - a.girlsTotal,
  );
  const byBoys = [...allNames.value].sort((a, b) => b.boysTotal - a.boysTotal);

  const points = samplePoints.filter((n) => n <= allNames.value.length);
  if (
    allNames.value.length > points[points.length - 1]! &&
    !points.includes(allNames.value.length)
  ) {
    points.push(allNames.value.length);
  }

  return {
    labels: points.map((n) => n.toLocaleString()),
    datasets: [
      concentrationDataset(
        "Girls",
        byGirls,
        points,
        (n) => n.girlsTotal,
        totalGirls.value,
        "#7c3aed",
      ),
      concentrationDataset(
        "Boys",
        byBoys,
        points,
        (n) => n.boysTotal,
        totalBoys.value,
        "#059669",
      ),
    ],
  };
});
</script>

<template>
  <div class="stats-page">
    <h1>Dataset Statistics</h1>

    <div v-if="loading" class="loading">Loading data...</div>
    <div v-else-if="loadError" class="error">Error: {{ loadError }}</div>
    <template v-else>
      <!-- Overview -->
      <section class="section">
        <h2>Overview</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Unique Names</span>
            <span class="stat-value">{{ formatNumber(totalNames) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total Babies Named</span>
            <span class="stat-value">{{ formatNumber(totalBabies) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label girls-label">Total Girls</span>
            <span class="stat-value">{{ formatNumber(totalGirls) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label boys-label">Total Boys</span>
            <span class="stat-value">{{ formatNumber(totalBoys) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Year Range</span>
            <span class="stat-value">{{ yearRange }}</span>
          </div>
        </div>
      </section>

      <!-- Gender Distribution -->
      <section class="section">
        <h2>Gender Distribution</h2>
        <div class="distribution-bar">
          <RouterLink
            to="/?score=feminine"
            class="bar-segment feminine"
            :style="{ width: pct(feminineCount, totalNames) + '%' }"
            :title="`Feminine: ${feminineCount}`"
          />
          <RouterLink
            to="/?score=neutral"
            class="bar-segment neutral"
            :style="{ width: pct(neutralCount, totalNames) + '%' }"
            :title="`Neutral: ${neutralCount}`"
          />
          <RouterLink
            to="/?score=masculine"
            class="bar-segment masculine"
            :style="{ width: pct(masculineCount, totalNames) + '%' }"
            :title="`Masculine: ${masculineCount}`"
          />
        </div>
        <div class="distribution-legend">
          <RouterLink to="/?score=feminine" class="legend-item">
            <span class="legend-dot feminine" />
            Feminine: {{ formatNumber(feminineCount) }} ({{
              pct(feminineCount, totalNames)
            }}%)
          </RouterLink>
          <RouterLink to="/?score=neutral" class="legend-item">
            <span class="legend-dot neutral" />
            Neutral: {{ formatNumber(neutralCount) }} ({{
              pct(neutralCount, totalNames)
            }}%)
          </RouterLink>
          <RouterLink to="/?score=masculine" class="legend-item">
            <span class="legend-dot masculine" />
            Masculine: {{ formatNumber(masculineCount) }} ({{
              pct(masculineCount, totalNames)
            }}%)
          </RouterLink>
        </div>
      </section>

      <!-- Popularity Changes -->
      <section class="section">
        <h2>Popularity Changes (1996 vs 2024)</h2>
        <p class="section-note">
          Among names with at least 100 uses in both years
        </p>
        <div v-if="yearlyLoading" class="loading">Loading yearly data...</div>
        <template v-else>
          <div class="stats-grid">
            <div v-if="girlsRisers[0]" class="stat-card">
              <span class="stat-label girls-label">Biggest Rise (Girls)</span>
              <RouterLink
                :to="`/name/${girlsRisers[0].name}`"
                class="stat-value name-link female"
              >
                {{ girlsRisers[0].name }}
              </RouterLink>
              <span class="stat-detail">
                Up {{ formatNumber(girlsRisers[0].change) }} places (#{{
                  girlsRisers[0].rankStart
                }}
                → #{{ girlsRisers[0].rankEnd }})
              </span>
            </div>
            <div v-if="girlsFallers[0]" class="stat-card">
              <span class="stat-label girls-label">Biggest Drop (Girls)</span>
              <RouterLink
                :to="`/name/${girlsFallers[0].name}`"
                class="stat-value name-link female"
              >
                {{ girlsFallers[0].name }}
              </RouterLink>
              <span class="stat-detail">
                Down {{ formatNumber(Math.abs(girlsFallers[0].change)) }} places
                (#{{ girlsFallers[0].rankStart }} → #{{
                  girlsFallers[0].rankEnd
                }})
              </span>
            </div>
            <div v-if="boysRisers[0]" class="stat-card">
              <span class="stat-label boys-label">Biggest Rise (Boys)</span>
              <RouterLink
                :to="`/name/${boysRisers[0].name}`"
                class="stat-value name-link male"
              >
                {{ boysRisers[0].name }}
              </RouterLink>
              <span class="stat-detail">
                Up {{ formatNumber(boysRisers[0].change) }} places (#{{
                  boysRisers[0].rankStart
                }}
                → #{{ boysRisers[0].rankEnd }})
              </span>
            </div>
            <div v-if="boysFallers[0]" class="stat-card">
              <span class="stat-label boys-label">Biggest Drop (Boys)</span>
              <RouterLink
                :to="`/name/${boysFallers[0].name}`"
                class="stat-value name-link male"
              >
                {{ boysFallers[0].name }}
              </RouterLink>
              <span class="stat-detail">
                Down {{ formatNumber(Math.abs(boysFallers[0].change)) }} places
                (#{{ boysFallers[0].rankStart }} → #{{
                  boysFallers[0].rankEnd
                }})
              </span>
            </div>
          </div>
        </template>
      </section>

      <!-- Gender Score Changes -->
      <section class="section">
        <h2>Gender Score Changes (1996 vs 2024)</h2>
        <p class="section-note">
          Among names used for both genders with at least 50 total uses in both
          years
        </p>
        <div v-if="yearlyLoading" class="loading">Loading yearly data...</div>
        <template v-else>
          <div class="stats-grid">
            <div v-if="towardsFeminine[0]" class="stat-card">
              <span class="stat-label girls-label"
                >Biggest Shift Towards Feminine</span
              >
              <RouterLink
                :to="`/name/${towardsFeminine[0].name}`"
                class="stat-value name-link"
                :class="getGenderColor(towardsFeminine[0].scoreEnd)"
              >
                {{ towardsFeminine[0].name }}
              </RouterLink>
              <span class="stat-detail">
                {{ formatGenderScore(towardsFeminine[0].scoreStart) }} →
                {{ formatGenderScore(towardsFeminine[0].scoreEnd) }}
              </span>
            </div>
            <div v-if="towardsMasculine[0]" class="stat-card">
              <span class="stat-label boys-label"
                >Biggest Shift Towards Masculine</span
              >
              <RouterLink
                :to="`/name/${towardsMasculine[0].name}`"
                class="stat-value name-link"
                :class="getGenderColor(towardsMasculine[0].scoreEnd)"
              >
                {{ towardsMasculine[0].name }}
              </RouterLink>
              <span class="stat-detail">
                {{ formatGenderScore(towardsMasculine[0].scoreStart) }} →
                {{ formatGenderScore(towardsMasculine[0].scoreEnd) }}
              </span>
            </div>
            <div v-if="towardsNeutral[0]" class="stat-card">
              <span class="stat-label">Biggest Shift Towards Neutral</span>
              <RouterLink
                :to="`/name/${towardsNeutral[0].name}`"
                class="stat-value name-link"
                :class="getGenderColor(towardsNeutral[0].scoreEnd)"
              >
                {{ towardsNeutral[0].name }}
              </RouterLink>
              <span class="stat-detail">
                {{ formatGenderScore(towardsNeutral[0].scoreStart) }} →
                {{ formatGenderScore(towardsNeutral[0].scoreEnd) }}
              </span>
            </div>
          </div>
        </template>
      </section>

      <!-- Superlatives -->
      <section class="section">
        <h2>Superlatives</h2>
        <p class="section-note">Among the top 1,000 most popular names</p>
        <div class="stats-grid">
          <div v-if="mostFeminine" class="stat-card">
            <span class="stat-label">Most Feminine</span>
            <RouterLink
              :to="`/name/${mostFeminine.name}`"
              class="stat-value name-link"
              :class="getGenderColor(mostFeminine.genderScore)"
            >
              {{ mostFeminine.name }}
            </RouterLink>
            <span class="stat-detail">{{
              formatGenderScore(mostFeminine.genderScore)
            }}</span>
          </div>
          <div v-if="mostMasculine" class="stat-card">
            <span class="stat-label">Most Masculine</span>
            <RouterLink
              :to="`/name/${mostMasculine.name}`"
              class="stat-value name-link"
              :class="getGenderColor(mostMasculine.genderScore)"
            >
              {{ mostMasculine.name }}
            </RouterLink>
            <span class="stat-detail">{{
              formatGenderScore(mostMasculine.genderScore)
            }}</span>
          </div>
          <div v-if="mostNeutral" class="stat-card">
            <span class="stat-label">Most Neutral</span>
            <RouterLink
              :to="`/name/${mostNeutral.name}`"
              class="stat-value name-link"
              :class="getGenderColor(mostNeutral.genderScore)"
            >
              {{ mostNeutral.name }}
            </RouterLink>
            <span class="stat-detail">{{
              formatGenderScore(mostNeutral.genderScore)
            }}</span>
          </div>
          <div v-if="mostPopular" class="stat-card">
            <span class="stat-label">Most Popular Overall</span>
            <RouterLink
              :to="`/name/${mostPopular.name}`"
              class="stat-value name-link"
              :class="getGenderColor(mostPopular.genderScore)"
            >
              {{ mostPopular.name }}
            </RouterLink>
            <span class="stat-detail">{{
              formatNumber(mostPopular.totalCount)
            }}</span>
          </div>
          <div v-if="mostPopularGirlsOnly" class="stat-card">
            <span class="stat-label">Most Popular Girls-Only</span>
            <RouterLink
              :to="`/name/${mostPopularGirlsOnly.name}`"
              class="stat-value name-link female"
            >
              {{ mostPopularGirlsOnly.name }}
            </RouterLink>
            <span class="stat-detail">{{
              formatNumber(mostPopularGirlsOnly.totalCount)
            }}</span>
          </div>
          <div v-if="mostPopularBoysOnly" class="stat-card">
            <span class="stat-label">Most Popular Boys-Only</span>
            <RouterLink
              :to="`/name/${mostPopularBoysOnly.name}`"
              class="stat-value name-link male"
            >
              {{ mostPopularBoysOnly.name }}
            </RouterLink>
            <span class="stat-detail">{{
              formatNumber(mostPopularBoysOnly.totalCount)
            }}</span>
          </div>
        </div>
      </section>

      <!-- Name Length -->
      <section class="section">
        <h2>Name Lengths</h2>
        <p class="section-note">Among top 1,000 names</p>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Average Length</span>
            <span class="stat-value">{{ avgNameLength.toFixed(1) }}</span>
            <span class="stat-detail">characters</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Most Common Length</span>
            <span class="stat-value">{{ modeLength }}</span>
            <span class="stat-detail">characters</span>
          </div>
        </div>

        <div class="name-lists">
          <div class="name-list">
            <h3>Longest Names</h3>
            <ul>
              <li v-for="n in longestNames" :key="n.name">
                <RouterLink
                  :to="`/name/${n.name}`"
                  class="name-link"
                  :class="getGenderColor(n.genderScore)"
                >
                  {{ n.name }}
                </RouterLink>
                <span class="detail">({{ n.name.length }} chars)</span>
              </li>
            </ul>
          </div>
          <div class="name-list">
            <h3>Shortest Names</h3>
            <ul>
              <li v-for="n in shortestNames" :key="n.name">
                <RouterLink
                  :to="`/name/${n.name}`"
                  class="name-link"
                  :class="getGenderColor(n.genderScore)"
                >
                  {{ n.name }}
                </RouterLink>
                <span class="detail">({{ n.name.length }} chars)</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="length-chart">
          <h3>Length Distribution</h3>
          <div class="bar-chart">
            <RouterLink
              v-for="[length, count] in lengthDistribution"
              :key="length"
              :to="`/?len=${length}`"
              class="chart-bar-wrapper"
            >
              <div
                class="chart-bar"
                :style="{
                  height:
                    (count / Math.max(...lengthDistribution.map((d) => d[1]))) *
                      100 +
                    '%',
                }"
                :title="`${length} chars: ${count} names`"
              />
              <span class="chart-label">{{ length }}</span>
            </RouterLink>
          </div>
        </div>
      </section>

      <!-- Starting Letters -->
      <section class="section">
        <h2>Starting Letters</h2>
        <p class="section-note">Among top 1,000 names</p>
        <div class="name-lists">
          <div class="name-list">
            <h3>Most Common</h3>
            <ul>
              <li v-for="[letter, count] in topLetters" :key="letter">
                <RouterLink :to="`/?letter=${letter}`" class="letter-link">
                  <span class="letter">{{ letter }}</span>
                  <span class="detail"
                    >{{ formatNumber(count) }} names ({{
                      pct(count, top1000.length)
                    }}%)</span
                  >
                </RouterLink>
              </li>
            </ul>
          </div>
          <div class="name-list">
            <h3>Rarest</h3>
            <ul>
              <li v-for="[letter, count] in rarestLetters" :key="letter">
                <RouterLink :to="`/?letter=${letter}`" class="letter-link">
                  <span class="letter">{{ letter }}</span>
                  <span class="detail"
                    >{{ formatNumber(count) }} names ({{
                      pct(count, top1000.length)
                    }}%)</span
                  >
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Girls vs Boys Diversity -->
      <section class="section">
        <h2>Name Diversity</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label girls-label">Unique Girl Names</span>
            <span class="stat-value">{{ formatNumber(uniqueGirlNames) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label boys-label">Unique Boy Names</span>
            <span class="stat-value">{{ formatNumber(uniqueBoyNames) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Used for Both</span>
            <span class="stat-value">{{ formatNumber(bothGenderNames) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Exclusive to One</span>
            <span class="stat-value">{{ formatNumber(exclusiveNames) }}</span>
          </div>
        </div>
      </section>

      <!-- Name Concentration -->
      <section class="section">
        <h2>Name Concentration</h2>
        <p class="section-note">
          How many of the top names account for what percentage of all babies
        </p>
        <div class="concentration-chart">
          <Line :data="concentrationData" :options="concentrationOptions" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.stats-page {
  padding: 0;
}

h1 {
  margin-bottom: 1.5rem;
  color: #333;
}

.section {
  margin-bottom: 2.5rem;
}

.section h2 {
  color: #333;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f59e0b;
}

.section-note {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
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

/* Stat cards grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.8rem;
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
  font-size: 1.4rem;
  font-weight: bold;
  color: #333;
}

.stat-detail {
  font-size: 0.85rem;
  color: #888;
}

/* Name links */
.name-link {
  text-decoration: none;
  font-weight: bold;
}

.name-link:hover {
  text-decoration: underline;
}

.name-link.female {
  color: #7c3aed;
}

.name-link.male {
  color: #059669;
}

.name-link.neutral {
  color: #f59e0b;
}

/* Gender distribution bar */
.distribution-bar {
  display: flex;
  height: 2rem;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.bar-segment {
  transition: all 0.3s ease;
  cursor: pointer;
}

.bar-segment:hover {
  opacity: 0.8;
}

.bar-segment.feminine {
  background: #7c3aed;
}

.bar-segment.neutral {
  background: #f59e0b;
}

.bar-segment.masculine {
  background: #059669;
}

.distribution-legend {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: #555;
  text-decoration: none;
}

.legend-item:hover {
  color: #333;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-dot.feminine {
  background: #7c3aed;
}

.legend-dot.neutral {
  background: #f59e0b;
}

.legend-dot.masculine {
  background: #059669;
}

/* Name lists */
.name-lists {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.name-list h3 {
  color: #555;
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.name-list ul {
  list-style: none;
  padding: 0;
}

.name-list li {
  padding: 0.4rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail {
  color: #888;
  font-size: 0.85rem;
}

.letter {
  font-weight: bold;
  font-size: 1.1rem;
  width: 1.5rem;
  color: #333;
}

.letter-link {
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.letter-link:hover .letter {
  color: #f59e0b;
}

.letter-link:hover .detail {
  color: #555;
}

/* Length distribution chart */
.length-chart {
  margin-top: 1.5rem;
}

.length-chart h3 {
  color: #555;
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  padding: 0 0.5rem;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  text-decoration: none;
}

.chart-bar-wrapper:hover .chart-bar {
  background: #d97706;
}

.chart-bar {
  width: 100%;
  max-width: 40px;
  background: #f59e0b;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: background 0.2s ease;
  cursor: pointer;
}

.chart-label {
  font-size: 0.75rem;
  color: #888;
  margin-top: 4px;
}

/* Concentration chart */
.concentration-chart {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .distribution-legend {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
