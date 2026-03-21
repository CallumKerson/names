# Task Completion Checklist

Before committing or considering a task complete, run:

1. `mise run fmt` — Format all code with oxfmt
2. `mise run lint` — Lint with oxlint (type-aware)

If data files (CSV/Excel) were changed:

3. `mise run process-data` — Regenerate JSON data files

For a full build verification:

4. `mise run build` — Full production build (includes process-data, types, and vite build)

Note: There is no test suite in this project.
