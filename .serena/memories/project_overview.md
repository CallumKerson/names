# Project Overview

**Names** is a Vue 3 + TypeScript web application that analyzes UK baby name data (1996–2024) and
calculates gender scores. Hosted on GitHub Pages at `/names/`.

## Purpose

- Visualize and explore UK ONS baby name statistics
- Calculate gender scores ranging from -1.0 (100% masculine) to +1.0 (100% feminine)
- Formula: `(girls_total - boys_total) / total_count`

## Tech Stack

- **Framework**: Vue 3 (Composition API) with TypeScript 5.9
- **Build tool**: Vite 8 (beta), base path `/names/`
- **Router**: Vue Router 4
- **Charts**: Chart.js with vue-chartjs
- **Package manager**: pnpm
- **Task runner**: mise
- **Linting**: oxlint (with TypeScript plugin, eslint-plugin-perfectionist)
- **Formatting**: oxfmt (printWidth: 80, auto-sort imports)
- **Type checking**: vue-tsc
- **Data processing**: tsx (for build-time XLSX→JSON conversion)

## Data Architecture

Two-stage pipeline:

1. **Build-time**: XLSX file `data/babynames1996to2024.xlsx` → `scripts/process-names-data.ts` →
   JSON in `public/data/`
   - `names-aggregate.json` (~300KB): aggregate totals for fast initial loads
   - `names-yearly.json` (~8MB): year-by-year breakdowns, loaded on-demand
   - `names-yearly-ranks.json`: pre-computed per-year rankings by total count
2. **Runtime**: Three-tier caching in `src/composables/useNamesData.ts` (module-level promise cache
   → aggregate-first → lazy yearly)

## Routes

- `/` — Browse top names by total count (default page, name: "browse")
- `/popular` — Redirects to `/`
- `/score` — Filter names by gender score range
- `/nearest` — Names closest to a target score
- `/stats` — Dataset analytics, superlatives, concentration charts
- `/name/:name` — Individual name detail with charts
- `/name/:name/year/:year` — Specific year breakdown

## Deployment

- GitHub Pages via `.github/workflows/deploy.yaml`
- Triggered on push to main (+ manual dispatch)
- SPA fallback: copies `dist/index.html` to `dist/404.html`
- Uses mise-action@v3 in CI
