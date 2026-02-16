/**
 * Utility functions for gender score calculations and rankings.
 */

import type { NameData, NameDataComputed, Ranks } from "@/models/types";

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
