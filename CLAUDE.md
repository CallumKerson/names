# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vue 3 + TypeScript web application that analyzes UK baby name data (1996-2024) and calculates gender scores. The gender score ranges from -1.0 (100% masculine) to +1.0 (100% feminine), calculated as `(girls_total - boys_total) / total_count`.

## Development Commands

This project uses [mise](https://mise.jdx.dev/) for task management:

- `mise run dev` - Start Vite development server
- `mise run build` - Build for production (includes data processing and type checking)
- `mise run process-data` - Process CSV files into JSON format
- `mise run fmt` - Format code with oxfmt
- `mise run lint` - Lint with oxlint (type-aware, auto-fix enabled)
- `mise run types` - Run Vue type checking only
- `pnpm install` - Install dependencies (or `mise run install`)

**Before committing**: Run `mise run fmt` and `mise run lint` to ensure code quality.

## Data Pipeline Architecture

The project has a two-stage data architecture optimized for performance:

### 1. Data Processing (Build-time)

CSV files in `babynames1996to2024/` → `scripts/process-names-data.ts` → JSON files in `public/data/`:

- **`names-aggregate.json`** (~300KB): Contains aggregate totals for all names (used for initial page loads)
- **`names-yearly.json`** (~8MB): Contains year-by-year breakdowns (loaded on-demand for charts)

The processing script:

- Converts ONS CSV data into optimized JSON
- Stores names with original capitalisation (e.g. "Oliver", "Aadam") — not lowercased
- Handles privacy redactions ('S' for counts ≤2) by converting to null
- Merges boys and girls data into unified records

### 2. Data Access Pattern (Runtime)

`src/composables/useNamesData.ts` implements a three-tier caching strategy:

1. **Module-level cache**: Data loaded once and shared across all component instances
2. **Aggregate-first loading**: Small aggregate file loads immediately
3. **Lazy yearly data**: Large yearly file only loaded when charts are needed, then cached

This pattern keeps initial page loads fast (<1s) while still providing detailed historical charts when requested.

## Code Architecture

### Router Structure

Five main routes (defined in `src/router/index.ts`):

- `/score` - Filter names by gender score range (default page)
- `/popular` - Top names by total count
- `/nearest` - Names closest to a target score
- `/name/:name` - Individual name detail with charts
- `/name/:name/year/:year` - Specific year breakdown

### Key Utilities

- **`src/utils/calculations.ts`**: Pure functions for gender score calculations, rankings, and filtering
  - `calculateGenderScore()` - Core formula implementation
  - `computeRankings()` - Three-dimensional ranking (overall, girls, boys)
  - Filter helpers for feminine/masculine/neutral name categorization

- **`src/utils/formatters.ts`**: Display formatting functions

### Component Organization

- **Pages** (`src/pages/`): Route-level components
- **Components** (`src/components/`): Reusable UI components
  - `app-layout.vue` - Main layout wrapper
  - `chart-container.vue` - Chart.js integration
  - `names-table.vue` - Sortable name list display
  - `score-slider.vue` - Interactive gender score filter

### Path Alias

`@` maps to `src/` directory (configured in `vite.config.ts`)

## Data Model

See `src/models/types.ts` for complete type definitions. Key interfaces:

- **NameData**: Raw name with totals (girls-first) and optional yearly breakdowns
- **NameDataComputed**: Extends NameData with calculated `genderScore` and `totalCount`
- **Ranks**: Three-dimensional ranking (overall, girls, boys)

## Tooling

- **Build**: Vite 8 (beta)
- **Linting**: oxlint with TypeScript plugin and eslint-plugin-perfectionist
- **Formatting**: oxfmt
- **Type checking**: vue-tsc with TypeScript 5.9
- **Package manager**: pnpm

## Colour Scheme

Gender score colours used throughout the app:

- **Feminine (score > 0.3)**: `#7c3aed` (purple)
- **Masculine (score < -0.3)**: `#059669` (green)
- **Neutral**: `#f59e0b` (amber — also the app's primary/accent colour)

## Important Notes

- Names are stored with original capitalisation in the JSON data (e.g. "Oliver", "A'isha") — always use case-insensitive comparison when searching/filtering
- Missing/redacted data is handled with null values (never 0)
- Rankings break ties by frequency (higher count wins)
- The `process-data` script must be run before building if CSV files change
- Girls-first convention: throughout the codebase, girls/feminine properties and UI elements are ordered before boys/masculine
