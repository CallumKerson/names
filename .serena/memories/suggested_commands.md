# Suggested Commands

## Development

- `mise run dev` — Start Vite development server
- `mise run build` — Full production build (process data + type check + vite build)
- `mise run process-data` — Process Excel/CSV files into JSON format
- `pnpm install` or `mise run install` — Install dependencies

## Code Quality (run before committing)

- `mise run fmt` — Format code with oxfmt
- `mise run lint` — Lint with oxlint (type-aware, auto-fix disabled)
- `mise run lint-fix` — Lint with oxlint and auto-fix
- `mise run types` — Run Vue type checking only (vue-tsc)

## Git / System Utilities

- `git` — Version control (standard macOS git)
- `ls`, `cd`, `find`, `grep` — Standard macOS/Darwin commands

## Notes

- mise is used as the task runner; all main tasks are defined in `mise.toml`
- pnpm is the package manager (not npm or yarn)
- There are no test commands configured — the project has no test suite
