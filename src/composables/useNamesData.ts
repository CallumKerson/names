import { computed, markRaw, ref } from "vue";

import type {
  NameData,
  NameDataComputed,
  NamesDataset,
  NamesYearlyDataset,
  Ranks,
} from "@/models/types";

import { computeNameData, computeRankings } from "@/utils/calculations";

let aggregatePromise: Promise<NamesDataset> | undefined;
let yearlyPromise: Promise<NamesYearlyDataset> | undefined;
let yearlyRanksPromise: Promise<NamesYearlyDataset> | undefined;
let allNamesPromise: Promise<NameDataComputed[]> | undefined;
let computedRankings: Map<string, Ranks> | undefined;
const yearlyLoadedNames = new Map<string, Promise<void>>();

function isNamesDataset(data: unknown): data is NamesDataset {
  if (
    typeof data !== "object" ||
    data === null ||
    !("metadata" in data) ||
    !("names" in data)
  ) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.metadata === "object" &&
    obj.metadata !== null &&
    typeof obj.names === "object" &&
    obj.names !== null
  );
}

function isNamesYearlyDataset(data: unknown): data is NamesYearlyDataset {
  if (
    typeof data !== "object" ||
    data === null ||
    !("metadata" in data) ||
    !("data" in data)
  ) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.metadata === "object" &&
    obj.metadata !== null &&
    typeof obj.data === "object" &&
    obj.data !== null
  );
}

const isLoading = ref(false);
const loadError = ref<string | null>(null);

function loadAggregateData(): Promise<NamesDataset> {
  return (aggregatePromise ??= (async () => {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}data/names-aggregate.json`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as unknown;
      if (!isNamesDataset(data)) {
        throw new Error("Invalid aggregate data structure");
      }
      return markRaw(data);
    } catch (error: unknown) {
      aggregatePromise = undefined;
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load aggregate data";
      loadError.value = message;
      throw new Error(message, { cause: error });
    }
  })());
}

function loadYearlyDataset(): Promise<NamesYearlyDataset> {
  return (yearlyPromise ??= (async () => {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}data/names-yearly.json`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as unknown;
      if (!isNamesYearlyDataset(data)) {
        throw new Error("Invalid yearly data structure");
      }
      return markRaw(data);
    } catch (error: unknown) {
      yearlyPromise = undefined;
      const message =
        error instanceof Error ? error.message : "Failed to load yearly data";
      loadError.value = message;
      throw new Error(message, { cause: error });
    }
  })());
}

async function loadYearlyForName(
  name: string,
  nameData: NameData,
): Promise<void> {
  const yearly = await loadYearlyDataset();
  const yearlyRecord = yearly.data[name];

  if (yearlyRecord) {
    const girlsYearly: { year: number; count: number }[] = [];
    const boysYearly: { year: number; count: number }[] = [];

    for (const [yearStr, count] of Object.entries(yearlyRecord.girls)) {
      girlsYearly.push({ count: count, year: parseInt(yearStr, 10) });
    }

    for (const [yearStr, count] of Object.entries(yearlyRecord.boys)) {
      boysYearly.push({ count: count, year: parseInt(yearStr, 10) });
    }

    nameData.girlsYearly = girlsYearly.sort((a, b) => a.year - b.year);
    nameData.boysYearly = boysYearly.sort((a, b) => a.year - b.year);
  }
}

export async function getName(name: string): Promise<NameDataComputed | null> {
  isLoading.value = true;
  loadError.value = null;

  try {
    const aggregate = await loadAggregateData();
    const nameData = aggregate.names[name];

    if (!nameData) {
      return null;
    }

    // Lazy load yearly data for this name, deduplicating concurrent calls
    if (!yearlyLoadedNames.has(name)) {
      yearlyLoadedNames.set(name, loadYearlyForName(name, nameData));
    }
    await yearlyLoadedNames.get(name);

    return computeNameData(nameData);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Get all names with computed properties.
 */
export function getAllNames(): Promise<NameDataComputed[]> {
  return (allNamesPromise ??= (async () => {
    isLoading.value = true;
    loadError.value = null;

    try {
      const aggregate = await loadAggregateData();
      return markRaw(Object.values(aggregate.names).map(computeNameData));
    } finally {
      isLoading.value = false;
    }
  })());
}

/**
 * Get cached ranking map, computing it if necessary.
 */
async function getRankingMap(): Promise<Map<string, Ranks>> {
  if (computedRankings) {
    return computedRankings;
  }

  const allNames = await getAllNames();
  computedRankings = computeRankings(allNames);
  return computedRankings;
}

/**
 * Get all names ranked by total popularity.
 */
export async function getRankedNames(
  topN: number = 0,
): Promise<[NameDataComputed, any][]> {
  const allNames = await getAllNames();
  const rankMap = await getRankingMap();

  let sorted = [...allNames].sort((a, b) => b.totalCount - a.totalCount);
  if (topN > 0) {
    sorted = sorted.slice(0, topN);
  }

  return sorted.map((name) => [
    name,
    rankMap.get(name.name) ?? { girls: 0, boys: 0, overall: 0 },
  ]);
}

/**
 * Get metadata about the dataset.
 */
export async function getMetadata() {
  const aggregate = await loadAggregateData();
  return aggregate.metadata;
}

function loadYearlyRanks(): Promise<NamesYearlyDataset> {
  return (yearlyRanksPromise ??= (async () => {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}data/names-yearly-ranks.json`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as unknown;
      if (!isNamesYearlyDataset(data)) {
        throw new Error("Invalid yearly ranks data structure");
      }
      return markRaw(data);
    } catch (error: unknown) {
      yearlyRanksPromise = undefined;
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load yearly ranks data";
      loadError.value = message;
      throw new Error(message, { cause: error });
    }
  })());
}

/**
 * Get yearly ranks for a specific name.
 */
export async function getYearlyRanks(
  name: string,
): Promise<Record<number, number>> {
  try {
    const ranks = await loadYearlyRanks();
    return ranks.data[name] ?? {};
  } catch (error) {
    console.error("Failed to load yearly ranks:", error);
    return {};
  }
}

/**
 * Get the full yearly dataset for bulk analysis.
 */
export function getYearlyDataset(): Promise<NamesYearlyDataset> {
  return loadYearlyDataset();
}

/**
 * Preload all data and compute rankings to improve navigation performance.
 */
export async function preloadData(): Promise<void> {
  try {
    await getAllNames();
    await getRankingMap();
  } catch (error) {
    console.error("Failed to preload data:", error);
  }
}

/**
 * Export composable state and methods.
 */
export function useNamesData() {
  const loading = computed(() => isLoading.value);
  const errorMsg = computed(() => loadError.value);

  return {
    errorMsg,
    getAllNames,
    getMetadata,
    getName,
    getRankedNames,
    getRankingMap,
    getYearlyRanks,
    loading,
  };
}
