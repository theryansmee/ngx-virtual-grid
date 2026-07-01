# Large Screen Fix + Demo/Docs Update Plan

## Overview
Fix the "loadMore never fires when items fit on screen" bug starting from v14 and migrating through each version. Also update each branch's demo app and docs to match the v22 style (adjusted for that branch's feature set).

## Bug Fix
In `#updateVisibleRange`, after computing range and updating spacers, call `#checkLoadMore` (and pagination equivalents on branches that have pagination). This ensures load triggers run on layout recalculation, not only on scroll.

## Testing Strategy
- Set initial item count to ~10 so first load only fills half the screen
- Verify that `loadMore` fires automatically until screen is full
- Verify scrolling still works normally after that

## Version Migration Order

### v14 (angular/14) - No pagination, NgModule, npm
- [x] Read and understand component code
- [ ] Apply bug fix: add `#checkLoadMore(scrollIntoComponent, viewportHeight)` at end of `#updateVisibleRange`
- [ ] Update demo app to v22 style:
  - Header with title, description, GitHub/npm links
  - Mode toggle (grid/list) + item counter
  - Code snippet section (using NgModule import syntax)
  - Colors via data-attribute + CSS vars (like v22)
  - Remove trackBy from template (v22 doesn't expose it)
- [ ] Update root README to match v22 (but NgModule example, npm not pnpm, Node 16+)
- [ ] Update library README to match v22 (but NgModule example)
- [ ] Test with 10 initial items → verify loadMore auto-fires
- [ ] Reset demo items to 200
- [ ] Bump version to 14.0.2
- [ ] Commit

### v15-v22: Repeat pattern, adapting for each version's features
- v15: Same as v14 (NgModule still)
- v16: Standalone components available
- v17: @for syntax, standalone default
- v18: Same as v17
- v19+: Check for pagination mode, add pagination load checks if present
- v20-v22: Same pattern

## Key differences across versions
- v14-v15: NgModule, `*ngFor`, no standalone
- v16: Standalone available but optional
- v17+: `@for` syntax, standalone default
- v19+: May have pagination mode (need to check each branch)
- v22: pnpm, zoneless, signals, SSR prerendering
