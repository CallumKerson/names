# Baby Name Gender Score Analysis

Vue 3 + TypeScript web application for exploring UK baby name data (1996–2024) and calculating
gender scores.

## Overview

This project analyzes ONS baby name statistics to calculate a **gender score** for each name,
ranging from:

- **-1.0**: 100% masculine (only used for boys)
- **+1.0**: 100% feminine (only used for girls)
- **0.0**: Perfectly balanced (equal usage across genders)

## Gender Score Formula

```text
gender_score = (girls_total - boys_total) / (girls_total + boys_total)
```

Scores are calculated by summing counts across all years (1996–2024) for robustness, reducing the
impact of single-year anomalies.

## Features

- **Browse** — Filter and sort names by popularity, gender score, length, and starting letter
- **Score** — View top feminine, masculine, and neutral names
- **Nearest** — Find names closest to a target gender score
- **Stats** — Dataset analytics, superlatives, popularity/gender score changes over time, and name
  concentration charts
- **Name detail** — Individual name pages with popularity and gender score trend charts (1996–2024)

## Setup

This project uses [mise](https://mise.jdx.dev/) for task management and [pnpm](https://pnpm.io/) as
the package manager.

```bash
mise run install
```

## Development

```bash
mise run dev
```

## Build

```bash
mise run build
```

This runs the full pipeline: data processing → type checking → Vite build.

## Code Quality

```bash
mise run fmt     # Format with oxfmt
mise run lint    # Lint with oxlint (type-aware)
```

## Data

The source data is an ONS XLSX file at `data/babynames1996to2024.xlsx`. The `mise run process-data`
command converts it into optimised JSON files in `public/data/` for the web app.

### Data Quality

- Privacy redactions ('S' for counts ≤ 2) are converted to null
- Names appearing in both girls and boys tables are combined to calculate true gender distribution
- Rankings break ties by frequency (higher count wins)
