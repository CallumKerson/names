/**
 * Utility functions for gender score calculations and rankings.
 */

import type {
  NameData,
  NameDataComputed,
  NamesYearlyDataset,
  Ranks,
} from "@/models/types";

/**
 * Calculate gender score for a name.
 * Formula: (girls_total - boys_total) / total_count
 * Range: -1.0 (masculine) to +1.0 (feminine)
 */
export function calculateGenderScore(name: NameData): number {
  const total = name.boysTotal + name.girlsTotal;
  if (total === 0) {
    return 0;
  }
  return (name.girlsTotal - name.boysTotal) / total;
}

/**
 * Convert NameData to NameDataComputed with calculated properties.
 */
export function computeNameData(name: NameData): NameDataComputed {
  return {
    ...name,
    genderScore: calculateGenderScore(name),
    totalCount: name.girlsTotal + name.boysTotal,
  };
}

/**
 * Compute rankings for all names.
 */
export function computeRankings(names: NameDataComputed[]): Map<string, Ranks> {
  const rankMap = new Map<string, Ranks>();

  // Sort by total count
  const byTotal = [...names].sort((a, b) => b.totalCount - a.totalCount);
  byTotal.forEach((name, index) => {
    const ranks = rankMap.get(name.name) ?? { girls: 0, boys: 0, overall: 0 };
    ranks.overall = index + 1;
    rankMap.set(name.name, ranks);
  });

  // Sort by girls count
  const byGirls = [...names].sort((a, b) => b.girlsTotal - a.girlsTotal);
  byGirls.forEach((name, index) => {
    const ranks = rankMap.get(name.name) ?? { girls: 0, boys: 0, overall: 0 };
    ranks.girls = index + 1;
    rankMap.set(name.name, ranks);
  });

  // Sort by boys count
  const byBoys = [...names].sort((a, b) => b.boysTotal - a.boysTotal);
  byBoys.forEach((name, index) => {
    const ranks = rankMap.get(name.name) ?? { girls: 0, boys: 0, overall: 0 };
    ranks.boys = index + 1;
    rankMap.set(name.name, ranks);
  });

  return rankMap;
}

/**
 * Get top N names by a specific criterion.
 */
export function getTopNames(
  names: NameDataComputed[],
  criterion: "total" | "boys" | "girls",
  limit: number = 0,
): NameDataComputed[] {
  const sorted = [...names].sort((a, b) => {
    if (criterion === "total") {
      return b.totalCount - a.totalCount;
    }
    if (criterion === "girls") {
      return b.girlsTotal - a.girlsTotal;
    }
    return b.boysTotal - a.boysTotal;
  });

  return limit > 0 ? sorted.slice(0, limit) : sorted;
}

/**
 * Filter names by gender score range.
 */
export function filterByScoreRange(
  names: NameDataComputed[],
  minScore: number,
  maxScore: number,
): NameDataComputed[] {
  return names.filter(
    (name) => name.genderScore >= minScore && name.genderScore <= maxScore,
  );
}

/**
 * Find names closest to a target gender score.
 */
export function findClosestToScore(
  names: NameDataComputed[],
  target: number,
  limit: number,
): NameDataComputed[] {
  const scored = names.map((name) => ({
    distance: Math.abs(name.genderScore - target),
    name,
  }));

  scored.sort((a, b) => a.distance - b.distance);

  return scored.slice(0, limit).map((item) => item.name);
}

/**
 * Get feminine names (score > 0.3).
 */
export function getFeminineNames(
  names: NameDataComputed[],
): NameDataComputed[] {
  return filterByScoreRange(names, 0.3, 1);
}

/**
 * Get masculine names (score < -0.3).
 */
export function getMasculineNames(
  names: NameDataComputed[],
): NameDataComputed[] {
  return filterByScoreRange(names, -1, -0.3);
}

/**
 * Get neutral names (-0.3 <= score <= 0.3).
 */
export function getNeutralNames(names: NameDataComputed[]): NameDataComputed[] {
  return filterByScoreRange(names, -0.3, 0.3);
}

export interface PopularityChange {
  name: string;
  rankStart: number;
  rankEnd: number;
  change: number;
}

function buildRankMap(counts: [string, number][]): Map<string, number> {
  counts.sort((a, b) => b[1] - a[1]);
  const ranks = new Map<string, number>();
  for (let i = 0; i < counts.length; i++) {
    ranks.set(counts[i]![0], i + 1);
  }
  return ranks;
}

/**
 * Compute biggest popularity risers and fallers for a given gender between two years.
 */
export function computePopularityChanges(
  yearlyData: NamesYearlyDataset,
  startYear: number,
  endYear: number,
  gender: "girls" | "boys",
  minCount: number = 100,
): { risers: PopularityChange[]; fallers: PopularityChange[] } {
  const startCounts: [string, number][] = [];
  const endCounts: [string, number][] = [];

  for (const [name, record] of Object.entries(yearlyData.data)) {
    const startCount = record[gender][startYear] ?? 0;
    const endCount = record[gender][endYear] ?? 0;
    if (startCount >= minCount) startCounts.push([name, startCount]);
    if (endCount >= minCount) endCounts.push([name, endCount]);
  }

  const startRanks = buildRankMap(startCounts);
  const endRanks = buildRankMap(endCounts);

  const changes: PopularityChange[] = [];
  for (const [name, rankStart] of startRanks) {
    const rankEnd = endRanks.get(name);
    if (rankEnd !== undefined) {
      // Positive change = rose in rank
      changes.push({ name, rankStart, rankEnd, change: rankStart - rankEnd });
    }
  }

  const sorted = [...changes].sort((a, b) => b.change - a.change);
  return {
    risers: sorted.slice(0, 5),
    fallers: sorted.slice(-5).reverse(),
  };
}

export interface GenderScoreChange {
  name: string;
  scoreStart: number;
  scoreEnd: number;
  change: number;
}

function collectGenderScoreChanges(
  yearlyData: NamesYearlyDataset,
  startYear: number,
  endYear: number,
  minCount: number,
): GenderScoreChange[] {
  const changes: GenderScoreChange[] = [];

  for (const [name, record] of Object.entries(yearlyData.data)) {
    const girlsStart = record.girls[startYear] ?? 0;
    const boysStart = record.boys[startYear] ?? 0;
    const girlsEnd = record.girls[endYear] ?? 0;
    const boysEnd = record.boys[endYear] ?? 0;
    const totalStart = girlsStart + boysStart;
    const totalEnd = girlsEnd + boysEnd;

    if (totalStart < minCount || totalEnd < minCount) continue;
    // Must be used for both genders in at least one of the years
    const bothStart = girlsStart > 0 && boysStart > 0;
    const bothEnd = girlsEnd > 0 && boysEnd > 0;
    if (!bothStart && !bothEnd) continue;

    const scoreStart = (girlsStart - boysStart) / totalStart;
    const scoreEnd = (girlsEnd - boysEnd) / totalEnd;
    changes.push({ name, scoreStart, scoreEnd, change: scoreEnd - scoreStart });
  }

  return changes;
}

/**
 * Compute biggest gender score shifts between two years.
 */
export function computeGenderScoreChanges(
  yearlyData: NamesYearlyDataset,
  startYear: number,
  endYear: number,
  minCount: number = 50,
): {
  towardsFeminine: GenderScoreChange[];
  towardsMasculine: GenderScoreChange[];
  towardsNeutral: GenderScoreChange[];
} {
  const changes = collectGenderScoreChanges(
    yearlyData,
    startYear,
    endYear,
    minCount,
  );
  const byChange = [...changes].sort((a, b) => b.change - a.change);

  const towardsNeutral = [...changes]
    .filter((c) => Math.abs(c.scoreEnd) < Math.abs(c.scoreStart))
    .sort(
      (a, b) =>
        Math.abs(a.scoreEnd) -
        Math.abs(a.scoreStart) -
        (Math.abs(b.scoreEnd) - Math.abs(b.scoreStart)),
    )
    .slice(0, 5);

  return {
    towardsFeminine: byChange.slice(0, 5),
    towardsMasculine: byChange.slice(-5).reverse(),
    towardsNeutral,
  };
}

/**
 * Calculate yearly gender score for a name.
 */
export function calculateYearlyGenderScores(
  girlsYearly: Map<number, number>,
  boysYearly: Map<number, number>,
): [number, number][] {
  const allYears = new Set([...girlsYearly.keys(), ...boysYearly.keys()]);
  const scores: [number, number][] = [];

  const sortedYears = [...allYears].sort((a, b) => a - b);
  for (const year of sortedYears) {
    const girls = girlsYearly.get(year) ?? 0;
    const boys = boysYearly.get(year) ?? 0;
    const total = girls + boys;

    if (total > 0) {
      const score = (girls - boys) / total;
      scores.push([year, score]);
    }
  }

  return scores;
}
