/**
 * Utility functions for formatting numbers and values.
 */

/**
 * Format a number with thousands separator.
 */
export function formatNumber(num: number): string {
  return Math.round(num).toLocaleString();
}

/**
 * Format gender score to 4 decimal places with sign.
 */
export function formatGenderScore(score: number): string {
  const prefix = score >= 0 ? "+" : "";
  return `${prefix}${score.toFixed(4)}`;
}

/**
 * Format percentage.
 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) {
    return "0%";
  }
  return `${((value / total) * 100).toFixed(1)}%`;
}

/**
 * Get gender score category label.
 */
export function getGenderCategory(
  score: number,
): "Masculine" | "Feminine" | "Neutral" {
  if (score > 0.3) {
    return "Feminine";
  }
  if (score < -0.3) {
    return "Masculine";
  }
  return "Neutral";
}

/**
 * Get color class for gender score visualization.
 */
export function getGenderColor(score: number): "male" | "female" | "neutral" {
  if (score > 0.3) {
    return "female";
  }
  if (score < -0.3) {
    return "male";
  }
  return "neutral";
}
