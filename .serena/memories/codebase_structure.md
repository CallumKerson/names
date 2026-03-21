# Codebase Structure

```text
names/
├── index.html                   # HTML entry point (mounts #app)
├── src/
│   ├── main.ts                  # App bootstrap (router + mount)
│   ├── App.vue                  # Root component (preloads data on mount)
│   ├── style.css                # Global styles (amber accent, system fonts)
│   ├── env.d.ts                 # Vue module type declarations
│   ├── router/index.ts          # Vue Router config (7 routes)
│   ├── models/types.ts          # TypeScript interfaces (NameData, Ranks, etc.)
│   ├── composables/
│   │   └── useNamesData.ts      # Data loading with module-level promise caching
│   ├── utils/
│   │   ├── calculations.ts      # Gender score, rankings, filtering, changes
│   │   ├── concentration.ts     # Name concentration analysis (Lorenz curve)
│   │   └── formatters.ts        # Display formatting + gender category helpers
│   ├── components/
│   │   ├── app-layout.vue       # Main layout (navbar, search, footer)
│   │   ├── chart-container.vue  # Chart.js line chart (clickable points)
│   │   ├── names-table.vue      # Sortable name list with highlight/scroll
│   │   ├── name-stats-table.vue # Individual name statistics grid
│   │   ├── name-search.vue      # Autocomplete search with keyboard nav
│   │   ├── breadcrumb-nav.vue   # Breadcrumb navigation (small/large)
│   │   └── score-slider.vue     # Gender score slider with gradient
│   └── pages/
│       ├── popular-page.vue     # / (default, browse with 6 filters)
│       ├── score-page.vue       # /score (top feminine/masculine/neutral)
│       ├── nearest-page.vue     # /nearest (find by target score)
│       ├── name-lookup-page.vue # /name/:name (detail + charts)
│       ├── name-year-page.vue   # /name/:name/year/:year (year breakdown)
│       └── stats-page.vue       # /stats (analytics, superlatives, concentration)
├── scripts/
│   └── process-names-data.ts    # XLSX→JSON data processor
├── data/                        # Source data (babynames1996to2024.xlsx)
├── public/data/                 # Generated JSON (build artifact)
├── .github/workflows/
│   └── deploy.yaml              # GitHub Pages deployment
├── mise.toml                    # Task definitions
├── package.json                 # Dependencies (pnpm)
├── vite.config.ts               # Vite config (base: /names/, @ alias)
├── tsconfig.json                # Root TS config (references app + node)
├── tsconfig.app.json            # App TS config (ES2023, strict, DOM)
├── tsconfig.node.json           # Node TS config (bundler resolution)
├── .oxlintrc.json               # Linter config
└── .oxfmtrc.json                # Formatter config (width: 80)
```
