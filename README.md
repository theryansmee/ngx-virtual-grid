# ngx-virtual-grid

[![npm version](https://img.shields.io/npm/v/@theryansmee/ngx-virtual-grid.svg)](https://www.npmjs.com/package/@theryansmee/ngx-virtual-grid)
[![npm downloads](https://img.shields.io/npm/dw/@theryansmee/ngx-virtual-grid.svg)](https://www.npmjs.com/package/@theryansmee/ngx-virtual-grid)
[![license](https://img.shields.io/npm/l/@theryansmee/ngx-virtual-grid.svg)](https://github.com/theryansmee/ngx-virtual-grid/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@theryansmee/ngx-virtual-grid)](https://bundlephobia.com/package/@theryansmee/ngx-virtual-grid)

A responsive virtual-scrolling grid for Angular with built-in infinite scroll. Uses CSS Grid for layout, auto-measures item dimensions, and only renders what's visible.

**Angular CDK's virtual scroller only supports single-column lists.** If you need a responsive grid with virtual scrolling, `ngx-virtual-grid` fills that gap.

[Live Demo](https://theryansmee.github.io/ngx-virtual-grid/) | [GitHub](https://github.com/theryansmee/ngx-virtual-grid) | [npm](https://www.npmjs.com/package/@theryansmee/ngx-virtual-grid)

## Why ngx-virtual-grid?

Angular CDK's `cdk-virtual-scroll-viewport` only handles single-column lists. If you need a responsive multi-column grid with virtual scrolling, you're on your own.

ngx-virtual-grid gives you a real CSS Grid that only renders visible items. You control the layout with standard `grid-template-columns` and `gap` - the library reads the computed grid to figure out column count and row height automatically. No config objects, no pixel math.

It also works as a single-column virtual list - just set `grid-template-columns: 1fr`.

## Features

- Virtual scrolling with CSS Grid layout
- Auto-measures item dimensions from the first rendered row
- Responsive - adapts to column count changes via CSS
- Infinite scroll with configurable threshold
- Pagination support - start at any page, accumulate data as you scroll
- Skeleton loading - show placeholder items while data loads
- Works as a grid or a single-column list
- Works with both zoned and zoneless Angular apps
- SSR-safe with prerendering support

## Installation

```bash
npm install @theryansmee/ngx-virtual-grid
```

```bash
yarn add @theryansmee/ngx-virtual-grid
```

```bash
pnpm add @theryansmee/ngx-virtual-grid
```

## Angular Version Support

Each Angular major version is maintained on its own branch:

| Branch | Angular | Library | npm tag |
|---|---|---|---|
| `angular/14` | 14.x | 14.x.x | `angular14` |
| `angular/15` | 15.x | 15.x.x | `angular15` |
| `angular/16` | 16.x | 16.x.x | `angular16` |
| `angular/17` | 17.x | 17.x.x | `angular17` |
| `angular/18` | 18.x | 18.x.x | `angular18` |
| `angular/19` | 19.x | 19.x.x | `angular19` |
| `angular/20` | 20.x | 20.x.x | `angular20` |
| `angular/21` | 21.x | 21.x.x | `angular21` |
| `angular/22` | 22.x | 22.x.x | `latest` |

The `main` branch tracks the latest stable version.

> **Feature availability:** Pagination and skeleton loading require `22.0.4+`, `21.0.5+`, `20.0.7+`, or `19.0.7+`. They are not available on the Angular 14-18 branches.

## Usage

Import the component and directive directly (standalone):

```typescript
import { Component } from '@angular/core';
import { NgxVirtualGridComponent, VirtualGridItemDirective, VirtualGridSkeletonDirective } from '@theryansmee/ngx-virtual-grid';

@Component({
  selector: 'app-example',
  imports: [NgxVirtualGridComponent, VirtualGridItemDirective, VirtualGridSkeletonDirective],
  template: `
    <ngx-virtual-grid
      [items]="items"
      [bufferSize]="3"
      [loadMoreThreshold]="0.8"
      (loadMore)="onLoadMore()">

      <ng-template ngxVirtualGridItem let-item let-index="index">
        <div class="card">{{ item.name }}</div>
      </ng-template>
    </ngx-virtual-grid>
  `,
  styles: [`
    ngx-virtual-grid {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
  `],
})
export class ExampleComponent {
  items: any[] = [];

  onLoadMore(): void {
    // Load more items...
  }
}
```

### Grid layout

The component renders as a CSS Grid container. Control the number and size of columns with standard CSS on the `<ngx-virtual-grid>` element:

```css
ngx-virtual-grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

The library auto-detects the column count and row height from the computed grid layout.

### Single-column list mode

For a virtual scrolling list instead of a grid, use a single column:

```css
ngx-virtual-grid {
  grid-template-columns: 1fr;
  gap: 8px;
}
```

Same component, same API - the layout adapts automatically based on your CSS.

### Pagination

> Requires `22.0.4+`, `21.0.5+`, `20.0.7+`, or `19.0.7+` (not available on Angular 14-18).

For large datasets where you load pages of data from an API, use the `page` and `pageSize` inputs. The library creates virtual space above loaded data using `page * pageSize` and uses `loadMore` to grow downward - just like infinite scroll.

```typescript
@Component({
  // ...
})
export class SearchResultsComponent {
  items: Result[] = [];
  firstLoadedPage: number = 0;
  lastLoadedPage: number = -1;
  isLoading: boolean = false;
  readonly pageSize: number = 50;

  constructor() {
    // Load initial page (e.g. from URL param)
    this.loadPage(0);
  }

  onLoadMore(): void {
    // loadMore fires when scrolling down - append the next page
    this.loadPage(this.lastLoadedPage + 1);
  }

  onPageNeeded(page: number): void {
    // may be several pages above the loaded data after a fast scroll.
    // load one adjacent page at a time; the grid re-emits until covered.
    this.loadPage(Math.max(page, this.firstLoadedPage - 1));
  }

  onPageChanged(page: number): void {
    // Update URL so the user can navigate back to this position
  }

  loadPage(page: number): void {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.api.getResults(page, this.pageSize).subscribe(response => {
      if (this.items.length === 0) {
        this.firstLoadedPage = page;
        this.lastLoadedPage = page;
        this.items = response.items;
      } else if (page < this.firstLoadedPage) {
        this.firstLoadedPage = page;
        this.items = [...response.items, ...this.items];
      } else {
        this.lastLoadedPage = page;
        this.items = [...this.items, ...response.items];
      }
      this.isLoading = false;
    });
  }
}
```

```html
<ngx-virtual-grid
  [items]="items"
  [page]="firstLoadedPage"
  [pageSize]="pageSize"
  [loading]="isLoading"
  (loadMore)="onLoadMore()"
  (pageNeeded)="onPageNeeded($event)"
  (pageChanged)="onPageChanged($event)">

  <ng-template ngxVirtualGridItem let-item>
    <div class="result">{{ item.name }}</div>
  </ng-template>
</ngx-virtual-grid>
```

**How it works:**

- `page` is the page of the first item in your array (0-indexed). Keep it at the lowest loaded page; the library turns `page * pageSize` into virtual space above
- `loadMore` fires when scrolling down approaches the end of loaded items - append the next page. The threshold is measured within the loaded data, so deep-linking to a high page doesn't fire it on arrival
- `pageNeeded` asks for earlier pages. Normally that means `page - 1` as the user nears the top of loaded data, but a fast scroll that jumps above the loaded data emits the page under the viewport instead - prepend down to it. If more pages are still needed, the grid asks again each time `page` changes
- Prepending an earlier page never re-triggers `loadMore` - the library detects prepends and keeps its forward-load state
- `pageChanged` fires when the viewport center crosses a page boundary - useful for updating the URL
- Items accumulate as the user scrolls, and you never need to know the total count - the bottom just grows via `loadMore` like a normal infinite scroller

### Skeleton loading

> Requires `22.0.4+`, `21.0.5+`, `20.0.7+`, or `19.0.7+` (not available on Angular 14-18).

Show placeholder items while data loads. Provide a skeleton template and set `loading` to `true` - the library renders the right number of skeletons to fill the visible area, matching the grid layout.

```html
<ngx-virtual-grid
  [items]="items"
  [loading]="isLoading"
  (loadMore)="onLoadMore()">

  <ng-template ngxVirtualGridItem let-item>
    <app-card [data]="item"></app-card>
  </ng-template>

  <ng-template ngxVirtualGridSkeleton>
    <app-card-skeleton></app-card-skeleton>
  </ng-template>
</ngx-virtual-grid>
```

Works with both paginated and non-paginated modes:

- **Non-paginated**: skeletons appear below loaded items when `loading` is `true`
- **Paginated**: skeletons fill visible slots in virtual space above (unloaded earlier pages) and below (loadMore pending)
- **Initial load**: when `items` is empty and `loading` is `true`, skeletons fill the viewport and are used for dimension measurement

The skeleton count is calculated automatically - same number of items the virtual scroller would normally render (viewport rows x columns + buffer).

### Custom scroll parent

By default the component listens for scroll events on `window`. To use a custom scroll container, pass it via the `scrollParent` input:

```html
<div #scrollContainer style="height: 600px; overflow-y: auto;">
  <ngx-virtual-grid [items]="items" [scrollParent]="scrollContainer">
    ...
  </ngx-virtual-grid>
</div>
```

## API

### Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `items` | `unknown[]` | `[]` | Array of data items to render |
| `bufferSize` | `number` | `3` | Number of extra rows to render above and below the viewport |
| `loadMoreThreshold` | `number` | `0.8` | Scroll ratio (0-1) at which the `loadMore` event fires. Measured within the loaded data, so deep-linked pages don't fire immediately |
| `scrollParent` | `HTMLElement \| null` | `null` | Custom scroll container. Uses `window` if `null` |
| `page` | `number` | `0` | The page (0-indexed) that the first item in `items` belongs to. Keep it set to the lowest loaded page - it creates `page * pageSize` items of virtual space above. |
| `pageSize` | `number` | `0` | Number of items per page. Enables pagination when > 0. |
| `loading` | `boolean` | `false` | When `true` and a skeleton template is provided, renders skeleton placeholders in visible slots that don't have data. |

### Outputs

| Output | Type | Description |
|---|---|---|
| `loadMore` | `void` | Emits when the scroll position crosses the `loadMoreThreshold` within the loaded data. Re-arms when more items are appended; prepending an earlier page does not re-arm it. |
| `pageNeeded` | `number` | Asks for earlier pages: emits `page - 1` when the viewport nears the top of loaded data, or the viewport's own page after a fast scroll jumps above it. Asks again on each `page` change until the viewport is covered. |
| `pageChanged` | `number` | Emits the current page number when the viewport center crosses a page boundary. Useful for updating the URL. |

### Methods

| Method | Description |
|---|---|
| `scrollToIndex(index: number)` | Scroll to bring the item at `index` into view |
| `scrollToOffset(pixels: number)` | Scroll to an absolute pixel offset within the grid |
| `scrollToPage(page: number)` | Scroll to the start of the given page (requires `pageSize` > 0) |
| `refresh()` | Re-measure dimensions and recalculate layout |

### Template context

The `ngxVirtualGridItem` template receives:

| Variable | Type | Description |
|---|---|---|
| `$implicit` | `T` | The data item |
| `index` | `number` | The item's global index. Same as the array index in non-paginated mode; offset by `page * pageSize` in paginated mode |

The `ngxVirtualGridSkeleton` template receives `$implicit` as the global index of the skeleton slot.

### Zoneless apps

The library works with both zoned and zoneless Angular apps. In zoneless mode, the `loadMore` output emits from a raw scroll event listener. If your handler modifies component state, use signals so the view updates:

```typescript
items = signal<Item[]>([]);

onLoadMore(): void {
  // Signal write triggers change detection in zoneless mode
  this.items.update(current => [...current, ...newItems]);
}
```

## Prerequisites

- Node.js 22.22+
- pnpm 11+
- Angular 22.x

## Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm run build:lib

# Start the demo app (builds library first, then serves demo)
pnpm start
```

The demo app runs at `http://localhost:4200/`.

### Available scripts

| Script | Description |
|---|---|
| `pnpm run build:lib` | Build the library for production |
| `pnpm run build:demo` | Build the demo application |
| `pnpm start` | Build library + serve demo app |
| `pnpm test` | Run library unit tests (watch mode) |
| `pnpm run test:ci` | Run library unit tests (single run) |
| `pnpm run lint` | Lint all projects |
| `pnpm run lint:fix` | Lint and auto-fix all projects |

## Publishing

```bash
pnpm run build:lib
cd dist/ngx-virtual-grid
pnpm publish
```

When publishing older Angular version branches, use the version-specific tag so it doesn't become `latest`:

```bash
pnpm publish --tag angular21
```

## Contributing

1. Branch off the appropriate `angular/*` branch for your target Angular version
2. Follow the existing code style (tabs, explicit types, explicit accessibility modifiers)
3. Add unit tests for new functionality
4. Ensure `pnpm run lint` and `pnpm run test:ci` pass before opening a PR

## License

MIT
