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
let allNamesPromise: Promise<NameDataComputed[]> | undefined;
let computedRankings: Map<string, Ranks> | undefined;
const yearlyLetterCache = new Map<string, Promise<NamesYearlyDataset>>();
const yearlyRanksLetterCache = new Map<string, Promise<NamesYearlyDataset>>();
const yearlyLoadedNames = new Map<string, Promise<void>>();

function isObjectWithKeys(data: unknown, keys: string[]): boolean {
  if (typeof data !== "object" || data === null) return false;
  return keys.every((k) => {
    if (!(k in data)) return false;
    const val: unknown = Reflect.get(data, k);
    return typeof val === "object" && val !== null;
  });
}

function isNamesDataset(data: unknown): data is NamesDataset {
  return isObjectWithKeys(data, ["metadata", "names"]);
}

function isNamesYearlyDataset(data: unknown): data is NamesYearlyDataset {
  return isObjectWithKeys(data, ["metadata", "data"]);
}

const isLoading = ref(false);
const loadError = ref<string | null>(null);

function getLetterKey(name: string): string {
  const first = name.charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first.toLowerCase() : "_";
}

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

function loadLetterFile(
  subdir: string,
  letter: string,
  cache: Map<string, Promise<NamesYearlyDataset>>,
): Promise<NamesYearlyDataset> {
  let promise = cache.get(letter);
  if (promise) return promise;

  promise = (async () => {
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}data/${subdir}/${letter}.json`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as unknown;
      if (!isNamesYearlyDataset(data)) {
        throw new Error(`Invalid ${subdir} data structure`);
      }
      return markRaw(data);
    } catch (error: unknown) {
      cache.delete(letter);
      const message =
        error instanceof Error
          ? error.message
          : `Failed to load ${subdir} data`;
      loadError.value = message;
      throw new Error(message, { cause: error });
    }
  })();

  cache.set(letter, promise);
  return promise;
}

async function loadYearlyForName(
  name: string,
  nameData: NameData,
): Promise<void> {
  const letter = getLetterKey(name);
  const yearly = await loadLetterFile("yearly", letter, yearlyLetterCache);
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

/**
 * Get yearly ranks for a specific name.
 */
export async function getYearlyRanks(
  name: string,
): Promise<Record<number, number>> {
  try {
    const letter = getLetterKey(name);
    const ranks = await loadLetterFile(
      "yearly-ranks",
      letter,
      yearlyRanksLetterCache,
    );
    return ranks.data[name] ?? {};
  } catch (error) {
    console.error("Failed to load yearly ranks:", error);
    return {};
  }
}

/**
 * Get the full yearly dataset by loading and merging all per-letter files.
 */
export async function getYearlyDataset(): Promise<NamesYearlyDataset> {
  const indexResponse = await fetch(
    `${import.meta.env.BASE_URL}data/yearly/index.json`,
  );
  const letters: unknown = await indexResponse.json();
  if (!Array.isArray(letters)) {
    throw new Error("Invalid yearly index data");
  }

  const letterDatasets = await Promise.all(
    letters.map((letter: string) =>
      loadLetterFile("yearly", letter, yearlyLetterCache),
    ),
  );

  const metadata = await getMetadata();
  const merged: NamesYearlyDataset = {
    data: {},
    metadata,
  };

  for (const dataset of letterDatasets) {
    Object.assign(merged.data, dataset.data);
  }

  return merged;
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
