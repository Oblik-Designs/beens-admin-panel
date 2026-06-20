# Dead Code & Unused Resource Audit — beens-admin-panel

Branch: `chore/dead-code-audit`

This document records every item removed (with proof of zero references) and every
candidate considered-but-retained (with rationale), for the dead-code cleanup of the
Vite + React + TanStack Router + TypeScript admin panel.

## Summary

| Category                                   | Removed |
| ------------------------------------------ | ------: |
| Unused source files                        |      17 |
| Unused dependencies (`dependencies`)       |      15 |
| Unused devDependencies                     |       4 |
| Dead app-level exports (functions/values)  |       1 |
| Dead app-level exported types              |       2 |
| Redundant `export` keywords removed        |       4 |
| **Total source/dep items changed**         |  **43** |

Net effect: 17 files deleted, 19 packages removed from `package.json` (lockfile shows
`Removed: 19`), and 7 in-file export cleanups.

### Verification status

| Check                | Baseline (before)            | After changes                |
| -------------------- | ---------------------------- | ---------------------------- |
| `bunx tsc --noEmit`  | FAIL — 12 pre-existing errors | FAIL — same 12 errors (0 new) |
| `bun run build`      | PASS                         | PASS                         |
| `bun run lint`       | PASS                         | PASS                         |

The 12 `tsc` errors are **pre-existing** (present on a clean checkout of the branch base,
verified via `git stash` below) and are unrelated to this cleanup. They all live in
`src/constants/planDataColumns.tsx`, `src/constants/userDataColumns.tsx`, and
`src/routes/(app)/plans.tsx` and concern TanStack Router search-param typing — untouched
by this work.

## Detection method (tools + versions)

- `knip` 6.16.1 — `bunx knip --no-progress` (primary candidate detector)
- `depcheck` 1.4.7 — `bunx depcheck` (dependency cross-check)
- `ripgrep` 14.1.1 — manual proof of zero references for every candidate
- `typescript` (tsc) 5.9.3
- `bun` 1.3.5

`depcheck` produced several false positives (e.g. `typescript`, `tailwindcss`, `shadcn`,
`@fontsource-variable/inter`, `tw-animate-css`, `@types/react-dom`) because it does not
parse `src/styles.css` CSS `@import`s nor `eslint.config.js`. Those were **not** removed.
All dependency removals below were confirmed against `knip` + manual ripgrep across `src/`
and every config file.

---

## 1. Removed unused source files (17)

All 17 files form a closed, self-referencing dead cluster: the only imports of any of
them come from other files in this same list. None are reachable from the route tree
(`src/routeTree.gen.ts`), `src/router.tsx`, `src/routes/__root.tsx`, `vite.config.ts`,
`index.html`, or any live component.

Proof that the cluster has no external importer (ran per file; representative output):

```
$ rg -n "(['\"`/]|@/)([a-zA-Z0-9_/-]*/)?<basename>['\"`]" src | grep -iE "import|from|lazy|require"
# 0 external hits for each (the only hits were within the cluster itself)
```

| File | What it was | External importers |
| ---- | ----------- | ------------------ |
| `src/components/chart-area-interactive.tsx` | Dashboard chart widget | 0 |
| `src/components/data-table.tsx` | Generic data-table demo component | 0 |
| `src/components/Empty.tsx` | Wrapper around `ui/empty` | 0 |
| `src/components/nav-documents.tsx` | Sidebar nav section | 0 |
| `src/components/nav-secondary.tsx` | Sidebar nav section | 0 |
| `src/components/section-cards.tsx` | Dashboard cards | 0 |
| `src/components/ui/breadcrumb.tsx` | shadcn primitive (whole file unused) | 0 |
| `src/components/ui/calendar.tsx` | shadcn primitive (sole user of `react-day-picker`) | 0 |
| `src/components/ui/chart.tsx` | shadcn primitive | only `chart-area-interactive.tsx` (also dead) |
| `src/components/ui/drawer.tsx` | shadcn primitive (sole user of `vaul`) | 0 |
| `src/components/ui/empty.tsx` | shadcn primitive | only `Empty.tsx` (also dead) |
| `src/components/ui/sonner.tsx` | Toaster (sole user of `sonner` + `next-themes`) | 0 |
| `src/components/ui/spinner.tsx` | shadcn primitive (whole file unused) | 0 |
| `src/components/ui/toggle-group.tsx` | shadcn primitive | only `chart-area-interactive.tsx` (also dead) |
| `src/components/ui/toggle.tsx` | shadcn primitive | only `toggle-group.tsx` (also dead) |
| `src/hooks/useDebounce.ts` | Debounce hook | 0 |
| `src/types/index.tsx` | Auto-generated openapi-typescript `paths` types | 0 (`rg "@/types" src` → none) |

Confirmation of intra-cluster-only references:

```
$ rg -n "ui/chart" src --glob '!src/components/ui/chart.tsx'
src/components/chart-area-interactive.tsx:4:import type { ChartConfig } from '@/components/ui/chart'
src/components/chart-area-interactive.tsx:18:} from '@/components/ui/chart'

$ rg -n "ui/empty" src --glob '!src/components/ui/empty.tsx'
src/components/Empty.tsx:8:} from '@/components/ui/empty'

$ rg -n "toggle-group" src --glob '!src/components/ui/toggle-group.tsx'
src/components/chart-area-interactive.tsx:26:import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

$ rg -n "@/types" src   # zero hits
```

Note: deleting whole unused `ui/*` files is explicitly permitted by the removal policy
(only stripping *sub-exports* from a *used* `ui/*` file is disallowed).

Build & typecheck stayed green after deletion (see Final Verification).

---

## 2. Removed unused dependencies (15)

Each proven with `rg -n -F "<dep>" --glob '!node_modules' --glob '!.output' --glob '!.git'
--glob '!bun.lock' --glob '!package.json' .` → zero matches (or matches only inside files
that were themselves deleted in section 1).

| Dependency | Proof |
| ---------- | ----- |
| `@dnd-kit/core` | 0 references anywhere |
| `@dnd-kit/modifiers` | 0 references anywhere |
| `@dnd-kit/sortable` | 0 references anywhere |
| `@dnd-kit/utilities` | 0 references anywhere |
| `@tanstack/react-devtools` | only a commented-out import in `src/routes/__root.tsx:7` |
| `@tanstack/react-query-devtools` | 0 references anywhere |
| `@tanstack/react-router-devtools` | only a commented-out import in `src/routes/__root.tsx:6` |
| `@tanstack/router-plugin` | 0 references (not used in `vite.config.ts`) |
| `axios` | 0 references (server API client uses its own `src/server/client.ts`) |
| `js-cookie` | 0 references anywhere |
| `next-themes` | only used by the deleted `src/components/ui/sonner.tsx` |
| `react-day-picker` | only used by the deleted `src/components/ui/calendar.tsx` |
| `sonner` | only used by the deleted `src/components/ui/sonner.tsx` |
| `vaul` | only used by the deleted `src/components/ui/drawer.tsx` |
| `zustand` | 0 references anywhere |

Representative proof (zero-reference group):

```
$ rg -n -F "@dnd-kit" --glob '!node_modules' --glob '!.output' --glob '!bun.lock' --glob '!package.json' .
$ rg -n -F "axios" ...   # (all exited 1 = no matches)
```

Proof that the four "consumed-only-by-deleted-file" deps have no remaining references
*after* the section-1 deletions:

```
$ rg -n -F "next-themes" src      # (none)
$ rg -n -F "react-day-picker" src # (none)
$ rg -n -F "sonner" src           # (none)
$ rg -n -F "vaul" src             # (none)
$ rg -n -F "@tanstack/react-devtools" src
src/routes/__root.tsx:7:// import { TanStackDevtools } from '@tanstack/react-devtools'   (commented out)
```

---

## 3. Removed unused devDependencies (4)

| devDependency | Proof |
| ------------- | ----- |
| `@testing-library/dom` | 0 references; no test files exist (`rg --files src \| rg -i 'test\|spec'` → none) |
| `@testing-library/react` | 0 references; no test files exist |
| `@types/js-cookie` | types for `js-cookie`, which was removed |
| `web-vitals` | only appeared in `package.json` itself; 0 code references |

```
$ rg -n -F "@testing-library/react" --glob '!node_modules' --glob '!.output' --glob '!bun.lock' --glob '!package.json' .   # (none)
$ rg -n -F "web-vitals" --glob '!node_modules' --glob '!.output' --glob '!bun.lock' .
./package.json:...   # only self-reference
```

`bun install` after editing `package.json` reported `Removed: 19` (15 deps + 4 devDeps).

---

## 4. Removed dead app-level exports / types (3) + redundant `export` (4)

### Fully removed (definition deleted — provably dead everywhere)

| Symbol | Location | Proof |
| ------ | -------- | ----- |
| `multiSearchParamSchema` (function) | `src/lib/multi-search-param.ts` | The file IS used by `plans.tsx:62`, but only `parseMultiSearchParam` / `serializeMultiSearchParam` are imported; `rg -n "multiSearchParamSchema" src` showed the only hit was its own definition. App-level (not a vendored ui primitive), so removed. |
| `TableWithPaginationMeta` (type) | `src/components/table-with-pagination.tsx` | `rg -n "TableWithPaginationMeta" src` → only the definition line. Never referenced (file uses TanStack's `TableMeta` instead). |
| `UserTableFilters` (type) | `src/components/user-table.tsx` | `rg -n "UserTableFilters" src` → only the definition line. |

### `export` keyword removed (symbol used locally, never imported externally)

These symbols are used inside their own file but exported needlessly; removing only the
`export` keyword clears the "unused export" report without changing behaviour.

| Symbol | Location | Proof of no external importer |
| ------ | -------- | ----------------------------- |
| `planSearchSchema` | `src/routes/(app)/plans.tsx:106` | used at lines 178 & 407 locally; `rg` across all other files → 0 external imports |
| `userSearchSchema` | `src/routes/(app)/users.tsx:42` | used at lines 54 & 131 locally; 0 external imports |
| `PlanTableMeta` | `src/constants/planDataColumns.tsx:19` | used at lines 55–314 locally; 0 external imports |
| `SessionUser` | `src/server/session.ts:6` | used at line 21 locally; 0 external imports |

```
$ rg -n "planSearchSchema|userSearchSchema" src --glob '!src/routes/(app)/plans.tsx' --glob '!src/routes/(app)/users.tsx'
# (no external hits)
```

---

## Considered but retained (with rationale)

### `eslint.config.js` (flagged "unused file" by knip) — RETAINED
It is the ESLint flat-config consumed by the `lint`/`check` scripts (`eslint`). Knip lists
it because it is not reachable from the app entry graph. Removing it would break linting.

### `@tanstack/eslint-config` (flagged "unused devDependency") — RETAINED
Imported in `eslint.config.js:3` (`import { tanstackConfig } from '@tanstack/eslint-config'`).
Knip misses it because it does not analyse the eslint config as an entry. Used → kept.

### `recharts`, `@tanstack/devtools-vite` — RETAINED
Not flagged as unused. `recharts` is still imported by `src/routes/(app)/index.tsx:11`;
`@tanstack/devtools-vite` is used in `vite.config.ts:2`.

### `vitest`, `jsdom` — RETAINED
`vitest` is referenced by the `test` script (`"test": "vitest run"`); `jsdom` is its DOM
environment. No test files exist today, but the test toolchain is intentionally kept.

### CSS-imported packages — RETAINED
`tailwindcss`, `shadcn`, `tw-animate-css`, `@fontsource-variable/inter` are imported via
`@import` in `src/styles.css` (depcheck false-positives). Kept.

### `ticketDetailOptions` (`src/queries/tickets.tsx:25`) — RETAINED
A `queryOptions` wrapper over the `getTicketById` server function. It is the sole consumer
of `getTicketById`, which in turn defines/uses the `TicketDetailResponse` type. Removing it
would cascade into the `src/server/api/*` API-client surface. Per the conservative
"correctness over completeness" policy, the server API client layer (and the thin query
wrappers mirroring it) is treated as an intentionally-complete API surface and left intact.

### Vendored shadcn/ui primitive sub-exports (63 unused exports) — RETAINED
Knip reports 63 unused *sub-exports* from `src/components/ui/*` files whose containing file
**is** used (e.g. `AlertDialogOverlay`, `DropdownMenuSub*`, `Sidebar*`, `Field*`,
`Combobox*`, `Select*`, `buttonVariants`, `TooltipProvider`, etc.). Per the removal policy,
individual unused sub-exports are **not** stripped from vendored shadcn primitives — these
files are intentionally-complete vendored primitives. (Whole `ui/*` files that were entirely
unused were still deleted — see section 1.)

### Server-API exported types (e.g. `TicketDetail`, `PlanLocation`, `UserPreferencesUpdate`, …) — RETAINED
The `src/server/api/*.ts` files model the backend HTTP API (request/response shapes). Many
interface exports are currently unreferenced but form a deliberate, complete typing surface
for the API client. Treated like the vendored surface and left intact for correctness.

---

## Final verification

Pre-existing baseline confirmed on a clean tree (`git stash` → run → `git stash pop`):

```
$ git stash && bunx tsc --noEmit | grep -c 'error TS'
12
```

After all changes:

```
$ bunx tsc --noEmit ; echo $?
# 12 errors — IDENTICAL set to baseline (diff = empty), 0 new errors
2

$ bun run build ; echo $?
✓ built in ~3.3s
ℹ Generated .output/nitro.json
[nitro] ✔ You can preview this build using node .output/server/index.mjs
0

$ bun run lint ; echo $?
$ eslint
0
```

```
$ bun install
Saved lockfile
7 packages installed
Removed: 19
```

Post-cleanup `knip` now reports only: `eslint.config.js` (config, retained),
`@tanstack/eslint-config` (used by that config, retained), and the 63 vendored ui
sub-exports + server-api types intentionally retained above. No app-level dead code remains.
