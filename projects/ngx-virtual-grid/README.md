# ngx-virtual-grid

[![npm version](https://img.shields.io/npm/v/@theryansmee/ngx-virtual-grid.svg)](https://www.npmjs.com/package/@theryansmee/ngx-virtual-grid)
[![license](https://img.shields.io/npm/l/@theryansmee/ngx-virtual-grid.svg)](https://github.com/theryansmee/ngx-virtual-grid/blob/main/LICENSE)

A responsive virtual-scrolling grid for Angular with built-in infinite scroll. Uses CSS Grid for layout, auto-measures item dimensions, and only renders what's visible.

[Live Demo](https://theryansmee.github.io/ngx-virtual-grid/) | [GitHub](https://github.com/theryansmee/ngx-virtual-grid) | [npm](https://www.npmjs.com/package/@theryansmee/ngx-virtual-grid)

## Why ngx-virtual-grid?

Angular's CDK virtual scroll only supports single-column lists. If you need a responsive grid with virtual scrolling, you're on your own - the CDK doesn't handle multi-column layouts, and most virtual scroll libraries don't either.

ngx-virtual-grid gives you a real CSS Grid that only renders visible items. You control the layout with standard `grid-template-columns` and `gap` - the library reads the computed grid to figure out column count and row height automatically. No config objects, no pixel math.

## Features

- Virtual scrolling with CSS Grid layout
- Auto-measures item dimensions from the first rendered row
- Responsive - adapts to column count changes via CSS
- Infinite scroll with configurable threshold
- Works with both zoned and zoneless Angular apps
- SSR-safe with prerendering support

## Installation

```bash
npm install @theryansmee/ngx-virtual-grid
```

```bash
yarn add @theryansmee/ngx-virtual-grid
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
| `angular/21` | 21.x | 21.x.x | `latest` |

The `main` branch tracks the latest stable version.

## Usage

Import the component and directive directly (standalone):

```typescript
import { Component } from '@angular/core';
import { NgxVirtualGridComponent, VirtualGridItemDirective } from '@theryansmee/ngx-virtual-grid';

@Component({
  selector: 'app-example',
  imports: [NgxVirtualGridComponent, VirtualGridItemDirective],
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
| `loadMoreThreshold` | `number` | `0.8` | Scroll ratio (0-1) at which the `loadMore` event fires |
| `scrollParent` | `HTMLElement \| null` | `null` | Custom scroll container. Uses `window` if `null` |

### Outputs

| Output | Type | Description |
|---|---|---|
| `loadMore` | `void` | Emits when the scroll position crosses the `loadMoreThreshold`. Resets when the `items` array length changes. |

### Methods

| Method | Description |
|---|---|
| `scrollToIndex(index: number)` | Scroll to bring the item at `index` into view |
| `scrollToOffset(px: number)` | Scroll to an absolute pixel offset within the grid |
| `refresh()` | Re-measure dimensions and recalculate layout |

### Template context

The `ngxVirtualGridItem` template receives:

| Variable | Type | Description |
|---|---|---|
| `$implicit` | `T` | The data item |
| `index` | `number` | The item's index in the original array |

### Zoneless apps

The library works with both zoned and zoneless Angular apps. In zoneless mode, the `loadMore` output emits from a raw scroll event listener. If your handler modifies component state, use signals so the view updates:

```typescript
items = signal<Item[]>([]);

onLoadMore(): void {
  // Signal write triggers change detection in zoneless mode
  this.items.update(current => [...current, ...newItems]);
}
```

## License

MIT
