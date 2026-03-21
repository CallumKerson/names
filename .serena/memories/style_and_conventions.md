# Code Style and Conventions

## General

- **Language**: TypeScript (strict), Vue 3 Single File Components (Composition API)
- **Style**: Clean, simple code; prefer direct functions over classes
- **Classes**: Only used when the alternative would be much more complicated, or as data stores
- **Path alias**: `@` maps to `src/` (configured in vite.config.ts and tsconfig.app.json)

## Naming

- Vue files: kebab-case (e.g. `name-search.vue`)
- TS functions: camelCase
- Names in data stored with original capitalisation (e.g. "Oliver", "A'isha") — always use
  case-insensitive comparison
- Girls-first convention: girls/feminine properties and UI elements ordered before boys/masculine
  throughout the codebase

## Formatting

- **Tool**: oxfmt
- **Print width**: 80 characters
- **Import sorting**: Enabled (experimentalSortImports)

## Linting

- **Tool**: oxlint with TypeScript plugin
- **Categories**: correctness=error, suspicious=error, pedantic=warn, perf=error, style=off
- **Plugins**: eslint-plugin-perfectionist
- **sort-imports rule**: off (handled by oxfmt)

## Data Handling

- Missing/redacted data uses `null` (never 0)
- Privacy redactions ('S' and '[x]' for counts ≤2) converted to null during processing
- Rankings break ties by frequency (higher count wins)

## Performance Patterns

- Module-level Promise caching (single fetch per resource)
- markRaw() on large data objects to avoid Vue reactivity overhead
- Lazy loading: yearly data only loaded when needed
- Preload on app mount: getAllNames + getRankingMap warm cache
- Debounced query params (200ms) to reduce router calls

## UI Patterns

- Query params for state persistence (bookmarkable URLs)
- Chart points are clickable for year-to-year navigation
- Responsive grids: repeat(auto-fit, minmax(...))
- Gender score always color-coded: purple/green/amber

## Colour Scheme

- Feminine (score > 0.3): `#7c3aed` (purple)
- Masculine (score < -0.3): `#059669` (green)
- Neutral / Primary accent: `#f59e0b` (amber)
- Error: `#d32f2f` (red)

## Commits

- Use conventional commit format for both commits and PRs
- Do NOT list Claude as co-author (breaks commit verification)
- Use .yaml not .yml for YAML file extensions
