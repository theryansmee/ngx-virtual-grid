# ngx-virtual-grid

A responsive virtual-scrolling grid for Angular. Fixed-size items, auto-measured dimensions, CSS Grid layout.

[Live Demo](https://theryansmee.github.io/ngx-virtual-grid/) | [GitHub](https://github.com/theryansmee/ngx-virtual-grid) | [npm](https://www.npmjs.com/package/@theryansmee/ngx-virtual-grid)

## Features

- Virtual scrolling with CSS Grid layout
- Auto-measures item dimensions from the first rendered row
- Responsive — adapts to column count changes via CSS
- Infinite scroll with configurable threshold
- Works with both zoned and zoneless Angular apps
- SSR-safe (no DOM access during server-side rendering)

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
| `angular/20` | 20.x | 20.x.x | `latest` |

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
| `loadMoreThreshold` | `number` | `0.8` | Scroll ratio (0–1) at which the `loadMore` event fires |
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

## Prerequisites

- Node.js 20+ or 22+
- npm 10+
- Angular 20.x

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build:lib

# Start the demo app (builds library first, then serves demo)
npm start
```

The demo app runs at `http://localhost:4200/`.

### Available scripts

| Script | Description |
|---|---|
| `npm run build:lib` | Build the library for production |
| `npm run build:demo` | Build the demo application |
| `npm start` | Build library + serve demo app |
| `npm test` | Run library unit tests (watch mode) |
| `npm run test:ci` | Run library unit tests (single run) |
| `npm run lint` | Lint all projects |
| `npm run lint:fix` | Lint and auto-fix all projects |

## Publishing

```bash
npm run build:lib
cd dist/ngx-virtual-grid
npm publish
```

When publishing older Angular version branches, use the version-specific tag so it doesn't become `latest`:

```bash
npm publish --tag angular19
```

## Contributing

1. Branch off the appropriate `angular/*` branch for your target Angular version
2. Follow the existing code style (tabs, explicit types, explicit accessibility modifiers)
3. Add unit tests for new functionality
4. Ensure `npm run lint` and `npm run test:ci` pass before opening a PR

## License

MIT
