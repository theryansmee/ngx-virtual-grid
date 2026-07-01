# Paginated Scrolling — v19 Implementation Guide

This documents all changes made on the `v19-pagination` branch (from `angular/19`) to add pagination support to ngx-virtual-grid. This is a complete guide to reproduce the work from scratch.

## Overview

Pagination mode lets consumers specify a `totalItems` count and an `itemOffset` to define where loaded data sits within a larger virtual list. The library creates virtual space for all items, renders only the intersection of the visible range with loaded data, and emits `loadMore`/`loadPrevious` when the user scrolls beyond loaded boundaries.

## Branch Setup

```bash
git checkout angular/19
git checkout -b v19-pagination
```

Node 22+ required for Angular 19 CLI. Use `source ~/.nvm/nvm.sh && nvm use 22` if needed.

---

## Files Changed

### 1. Library Component — `projects/ngx-virtual-grid/src/lib/virtual-scroll.component.ts`

This is the core file. All pagination logic lives here.

#### New inputs

```typescript
public readonly totalItems: InputSignal<number> = input<number>(0);
public readonly itemOffset: InputSignal<number> = input<number>(0);
public readonly initialIndex: InputSignal<number> = input<number>(-1);
```

- `totalItems` — Total item count across all pages. Enables pagination mode when > 0.
- `itemOffset` — Global index of the first item in the `items` array.
- `initialIndex` — Scroll to this global index on init. Defaults to `itemOffset` when not set. Useful when pre-loading the page before the target page.

#### New output

```typescript
public readonly loadPrevious: OutputEmitterRef<void> = output<void>();
```

Emits when the visible range reaches the start of loaded items and `itemOffset > 0`.

#### New private fields

```typescript
#loadPreviousFired: boolean = false;
#paginatedLoadMoreFired: boolean = false;
#previousLoadedStart: number = 0;
#previousLoadedEnd: number = 0;
#initialScrollApplied: boolean = false;
```

#### New private getters

```typescript
get #effectiveTotalItems(): number {
    const total: number = this.totalItems();
    return total > 0 ? total : this.items().length;
}

get #isPaginationMode(): boolean {
    return this.totalItems() > 0;
}
```

#### New public getters

```typescript
public get ariaSetSize(): number {
    return this.#effectiveTotalItems;
}

public get firstItemColumn(): number | null {
    if (this.renderedItems.length === 0 || this.#layout.columnCount <= 1) {
        return null;
    }

    const col: number = this.renderedItems[0].index % this.#layout.columnCount;
    return col > 0 ? col + 1 : null;
}
```

- `ariaSetSize` — Used in the template for `aria-setsize`. Returns `totalItems` in pagination mode, `items.length` otherwise.
- `firstItemColumn` — Returns the CSS `grid-column-start` value (1-based) for the first rendered item, or `null` if it starts at column 0. **This fixes the column alignment bug**: when the first rendered item's global index isn't at a row boundary (e.g., index 10 with 6 columns = column 4), CSS Grid would auto-place it at column 0. This getter ensures it lands in the correct column, and auto-flow handles the rest.

#### Modified constructor effect

The effect now also reads `this.itemOffset()` and `this.totalItems()` to create signal dependencies so it re-runs when pagination inputs change:

```typescript
effect(() => {
    const newItems: unknown[] = this.items();
    const directive: VirtualGridItemDirective | undefined = this.itemDirective();
    this.itemOffset();
    this.totalItems();
    this.#handleItemsChange(newItems, directive);
});
```

#### Modified `#handleItemsChange`

Re-arms pagination load triggers when the loaded range changes (offset decreased or end increased):

```typescript
#handleItemsChange(newItems: unknown[], directive: VirtualGridItemDirective | undefined): void {
    const offset: number = this.itemOffset();
    const loadedEnd: number = offset + newItems.length;

    if (offset < this.#previousLoadedStart) {
        this.#loadPreviousFired = false;
    }

    if (loadedEnd > this.#previousLoadedEnd) {
        this.#paginatedLoadMoreFired = false;
    }

    this.#previousLoadedStart = offset;
    this.#previousLoadedEnd = loadedEnd;

    if (!this.#measured && newItems.length > 0 && directive) {
        this.#measureAndInit();
        return;
    }

    if (this.#measured) {
        this.#recalculateLayout();
    }
}
```

#### Modified `#measureAndInit`

- Uses `itemOffset()` when building measurement items so indices are correct.
- Uses `#effectiveTotalItems` for layout calculation.
- Handles initial scroll via `#applyInitialScroll` when `initialIndex >= 0` or `itemOffset > 0`.

```typescript
// Measurement items use offset for correct indices
const offset: number = this.itemOffset();
this.renderedItems = [];
for (let i: number = 0; i < measureBatchSize; i++) {
    this.renderedItems.push({ data: items[i], index: offset + i });
}

// Layout uses effectiveTotalItems
this.#layout = calculateGridLayout(
    this.#columnCount, this.#rowHeight, this.#itemHeight, this.#effectiveTotalItems,
);

// Initial scroll handling
const scrollTarget: number = this.#getInitialScrollTarget();
if (scrollTarget > 0 && !this.#initialScrollApplied) {
    this.#initialScrollApplied = true;
    this.#applyInitialScroll(scrollTarget);
} else {
    this.#updateVisibleRange();
}
```

#### New methods: `#getInitialScrollTarget` and `#applyInitialScroll`

```typescript
#getInitialScrollTarget(): number {
    const explicit: number = this.initialIndex();
    if (explicit >= 0) {
        return explicit;
    }
    return this.itemOffset();
}

#applyInitialScroll(scrollTarget: number): void {
    this.topSpacerHeight = 0;
    this.bottomSpacerHeight = Math.max(0, this.#layout.totalContentHeight);
    this.renderedItems = [];
    this.#cdr.detectChanges();

    // Defer scroll until Angular CD has updated the DOM with spacer heights
    requestAnimationFrame(() => {
        this.scrollToIndex(scrollTarget);
        this.#ngZone.run(() => {
            this.#updateVisibleRange();
        });
    });
}
```

The `requestAnimationFrame` is critical — without it, the page isn't tall enough to scroll to the target position because Angular hasn't rendered the spacer heights yet.

#### Modified `#recalculateLayout`

Uses `#effectiveTotalItems` instead of `items().length`:

```typescript
this.#layout = calculateGridLayout(
    this.#columnCount, this.#rowHeight, this.#itemHeight, this.#effectiveTotalItems,
);
```

#### Modified `#updateVisibleRange`

- Uses `#effectiveTotalItems` in `calculateVisibleRange`.
- After updating spacers, checks load triggers so that `loadMore`/`loadPrevious` fire even without scrolling (e.g., when all items fit on screen).

```typescript
this.#currentRange = calculateVisibleRange(
    scrollIntoComponent, viewportHeight, this.#layout.rowHeight,
    this.#layout.totalRows, this.bufferSize(), this.#layout.columnCount,
    this.#effectiveTotalItems,
);

this.#updateRenderedItems();
this.#updateSpacers();
this.#cdr.markForCheck();

// Check load triggers so that if all items fit on screen without
// scrolling, loadMore / loadPrevious still fire.
if (this.#isPaginationMode) {
    this.#checkPaginatedLoadMore(this.#currentRange);
    this.#checkLoadPrevious(this.#currentRange);
} else {
    this.#checkLoadMore(scrollIntoComponent, viewportHeight);
}
```

#### Modified `#updateRenderedItems`

Renders the **intersection** of the visible range with the loaded range:

```typescript
#updateRenderedItems(): void {
    const { startIndex, endIndex } = this.#currentRange;
    const items: unknown[] = this.items();
    const offset: number = this.itemOffset();
    const loadedEnd: number = offset + items.length;

    const renderStart: number = Math.max(startIndex, offset);
    const renderEnd: number = Math.min(endIndex, loadedEnd);

    this.renderedItems = [];

    for (let i: number = renderStart; i < renderEnd; i++) {
        this.renderedItems.push({ data: items[i - offset], index: i });
    }
}
```

Note: `index` is the **global** index, and data is accessed via `items[i - offset]`.

#### Modified `#updateSpacers`

- When items exist: spacers based on rendered item positions (handles gaps from unloaded buffer items).
- When items are empty: spacers split the **total content height** between them to keep page height stable and prevent scroll jumps.

```typescript
#updateSpacers(): void {
    if (this.renderedItems.length > 0) {
        const firstRenderedRow: number = Math.floor(this.renderedItems[0].index / this.#layout.columnCount);
        const lastRenderedRow: number = Math.floor(this.renderedItems[this.renderedItems.length - 1].index / this.#layout.columnCount);
        this.topSpacerHeight = firstRenderedRow * this.#layout.rowHeight;
        this.bottomSpacerHeight = Math.max(0, (this.#layout.totalRows - lastRenderedRow - 1) * this.#layout.rowHeight);
    } else {
        const { startRow } = this.#currentRange;
        this.topSpacerHeight = startRow * this.#layout.rowHeight;
        this.bottomSpacerHeight = Math.max(0, this.#layout.totalContentHeight - this.topSpacerHeight);
    }
}
```

The empty branch is critical: without it, the two spacers leave a viewport-sized gap between them, causing the total page height to fluctuate and the browser to adjust scroll position (the main source of jank).

#### Modified `#onScroll`

Branches between pagination mode and standard mode:

```typescript
#onScroll(): void {
    // ... calculate scrollIntoComponent, newRange ...

    this.#applyRangeUpdate(newRange);

    if (this.#isPaginationMode) {
        this.#checkPaginatedLoadMore(newRange);
        this.#checkLoadPrevious(newRange);
    } else {
        this.#checkLoadMore(scrollIntoComponent, viewportHeight);
    }
}
```

Also uses `#effectiveTotalItems` in the `calculateVisibleRange` call.

#### New methods: `#checkPaginatedLoadMore` and `#checkLoadPrevious`

Both re-arm automatically when the user scrolls back into loaded territory:

```typescript
#checkPaginatedLoadMore(newRange: VisibleRange): void {
    const offset: number = this.itemOffset();
    const loadedEnd: number = offset + this.items().length;

    if (loadedEnd >= this.#effectiveTotalItems) { return; }
    if (newRange.endIndex < loadedEnd) { this.#paginatedLoadMoreFired = false; return; }
    if (this.#paginatedLoadMoreFired) { return; }

    this.#paginatedLoadMoreFired = true;
    this.#ngZone.run(() => this.loadMore.emit());
}

#checkLoadPrevious(newRange: VisibleRange): void {
    const offset: number = this.itemOffset();

    if (offset <= 0) { this.#loadPreviousFired = false; return; }
    if (newRange.startIndex > offset) { this.#loadPreviousFired = false; return; }
    if (this.#loadPreviousFired) { return; }

    this.#loadPreviousFired = true;
    this.#ngZone.run(() => this.loadPrevious.emit());
}
```

The scroll-based re-arming (checking `newRange.endIndex < loadedEnd` / `newRange.startIndex > offset`) is essential. Without it, the flag gets stuck at `true` and no further loads happen.

### 2. Library Template — `projects/ngx-virtual-grid/src/lib/virtual-scroll.component.html`

Two changes:

```html
@for (item of renderedItems; track item.index; let first = $first) {
	<div
		class="ngx-vg__grid-item"
		role="listitem"
		[attr.aria-setsize]="ariaSetSize"
		[attr.aria-posinset]="item.index + 1"
		[style.grid-column-start]="first ? firstItemColumn : null">
```

- `aria-setsize` changed from `items().length` to `ariaSetSize` (accounts for `totalItems`).
- `grid-column-start` on the first item fixes column alignment when the first rendered item isn't at a row boundary.
- `let first = $first` added to the `@for` loop.

### 3. No changes needed to these library files

- `virtual-scroll.models.ts` — No changes.
- `range-manager.ts` — No changes.
- `grid-layout-calculator.ts` — No changes.
- `public-api.ts` — No changes.

---

## Demo Changes

The v19 demo was originally a single-page app (no router). We added a router to support the `/pagination` route with query params.

### 4. Bootstrap — `projects/demo/src/main.ts`

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
	providers: [provideRouter(routes)],
})
	.catch(err => console.error(err));
```

### 5. Routes — `projects/demo/src/app/app.routes.ts` (NEW)

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/demo/demo.component').then(m => m.DemoComponent),
	},
	{
		path: 'pagination',
		loadComponent: () => import('./pages/pagination/pagination.component').then(m => m.PaginationComponent),
	},
	{
		path: '**',
		redirectTo: '',
	},
];
```

### 6. App Shell — `projects/demo/src/app/app.component.ts`

Simplified to just a header with nav links + `<router-outlet>`:

```typescript
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, RouterLink, RouterLinkActive],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class AppComponent {}
```

### 7. App Shell Template — `projects/demo/src/app/app.component.html`

```html
<div class="header">
	<div>
		<h1>ngx-virtual-grid demo</h1>
	</div>
	<nav class="header__links">
		<a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Demo</a>
		<a routerLink="/pagination" routerLinkActive="active">Pagination</a>
		<a href="https://github.com/theryansmee/ngx-virtual-grid" target="_blank" rel="noopener">GitHub</a>
		<a href="https://www.npmjs.com/package/@theryansmee/ngx-virtual-grid" target="_blank" rel="noopener">npm</a>
	</nav>
</div>

<router-outlet></router-outlet>
```

### 8. App Shell Styles — `projects/demo/src/app/app.component.scss`

```scss
:host {
	display: block;
	font-family: sans-serif;
	padding: 24px;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 24px;

	h1 { margin: 0; }

	&__links {
		display: flex;
		gap: 16px;

		a {
			color: #3498db;
			text-decoration: none;
			font-weight: 600;

			&:hover { text-decoration: underline; }
			&.active { color: #1a1a1a; }
		}
	}
}
```

### 9. Demo Page — `projects/demo/src/app/pages/demo/` (NEW directory)

The original `app.component` content moved here. Three files:

**demo.component.ts** — Same logic as the original `app.component.ts` (loads 200 items, onLoadMore loads 50 more).

**demo.component.html** — Same template as the original (grid with colored cards).

**demo.component.scss** — Card styles extracted from the original `app.component.scss`.

### 10. Pagination Page — `projects/demo/src/app/pages/pagination/`

The pagination demo existed on the branch but needed rewriting for v19 (no signals for component state, `@ViewChild` instead of `viewChild.required`, `setInterval` for page tracking instead of `effect`).

Key design decisions:
- `totalItems` is **dynamic** — stays one batch ahead of loaded data so there's always virtual space to scroll into. No artificial cap.
- `?page=N` query param support via `ActivatedRoute.snapshot.queryParamMap`.
- Pre-loads the page before the target page so scrolling up has content immediately.
- `initialIndex` set to the target page's start offset so the grid scrolls there on init.
- Visible page tracked via `setInterval` (200ms) polling `grid.renderedItems` — uses the middle rendered item's index to compute the current page.
- URL updated via `Router.navigate` with `replaceUrl: true`.
- Simulated fetch delay is 50ms (short enough that loads chain smoothly).
- No `loading` guard on `onLoadMore` — allows the library's chained trigger checking to work without being blocked.

---

## Bugs Fixed Along the Way

### 1. Column alignment jitter

**Problem**: When the first rendered item's global index isn't at a row boundary (e.g., index 10 with 6 columns), CSS Grid auto-places it at column 0 instead of column 4. When items are prepended, existing items shift columns.

**Fix**: `firstItemColumn` getter computes the correct `grid-column-start` (1-based) for the first rendered item. Applied via `[style.grid-column-start]="first ? firstItemColumn : null"` in the template.

### 2. Page height fluctuation causing scroll jumps

**Problem**: When `renderedItems` becomes empty (user scrolls past loaded data), the spacers left a viewport-sized gap, dropping the total page height. Browser adjusts scroll → visual jump. When items load back, height jumps again.

**Fix**: Empty branch in `#updateSpacers` now splits `totalContentHeight` across the two spacers: `bottomSpacerHeight = totalContentHeight - topSpacerHeight`. Total height stays constant.

### 3. loadPrevious only fires once

**Problem**: `#loadPreviousFired` was only re-armed in `#handleItemsChange` (via the effect). Between the effect running and the next scroll event, the flag could get stuck.

**Fix**: `#checkLoadPrevious` and `#checkPaginatedLoadMore` re-arm based on scroll position: when `newRange.startIndex > offset`, reset `#loadPreviousFired`. Same pattern for `#checkPaginatedLoadMore` when `newRange.endIndex < loadedEnd`.

### 4. Load triggers never fire without scrolling

**Problem**: If all loaded items fit on screen (large viewport), no scroll event fires, so `loadMore` never triggers.

**Fix**: `#updateVisibleRange` checks load triggers after every layout calculation, not just on scroll. This also covers non-pagination mode.

---

## README Changes

- Added "Pagination mode with bidirectional loading" to features list.
- Added "Pagination mode" usage section with code example.
- Added `totalItems`, `itemOffset`, `initialIndex` to inputs table.
- Added `loadPrevious` to outputs table.
- Updated `loadMore` description for pagination mode behavior.
- Updated `index` template context description to mention `itemOffset`.

---

## v19 vs v22 API Differences

When porting to/from v22 (main branch), note these differences:

| Concern | v19 | v22 |
|---|---|---|
| Model types | `GridLayout`, `VisibleRange`, `RenderedItem` | `GridLayoutInterface`, `VisibleRangeInterface`, `RenderedItemInterface` |
| `renderedItems` | Plain `RenderedItem[]` property | `WritableSignal<RenderedItemInterface[]>` |
| `topSpacerHeight` / `bottomSpacerHeight` | Plain `number` properties | `WritableSignal<number>` |
| Change detection | `ChangeDetectorRef` with `detectChanges()` / `markForCheck()` | Signals auto-update, `void this.#hostEl.offsetHeight` for forced layout |
| Method names | `#updateVisibleRange`, `#updateRenderedItems` | `#updateVisibleRangeInterface`, `#updateRenderedItemInterfaces` |
| SSR guard | None (`afterNextRender` handles it) | `typeof getComputedStyle !== 'function'` check |
| Demo router | Added as part of this work | Already exists with sidebar layout |
| Page tracking | `setInterval` polling `grid.renderedItems` (plain array) | `effect()` watching `grid().renderedItems()` (signal) |
| `@ViewChild` | `@ViewChild(NgxVirtualGridComponent) private grid!` | `private readonly grid = viewChild.required(NgxVirtualGridComponent)` |

---

## Build & Verify

```bash
source ~/.nvm/nvm.sh && nvm use 22
pnpm install
pnpm run build:lib
pnpm run lint
pnpm run test:ci
pnpm start  # then visit http://localhost:4200/pagination?page=5
```
