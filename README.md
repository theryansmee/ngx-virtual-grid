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

ngx-virtual-grid gives you a real CSS Grid that only renders visible items. You control the layout with standard `grid-template-columns` and `gap` — the library reads the computed grid to figure out column count and row height automatically. No config objects, no pixel math.

It also works as a single-column virtual list — just set `grid-template-columns: 1fr`.

## Features

- Virtual scrolling with CSS Grid layout
- Auto-measures item dimensions from the first rendered row
- Responsive — adapts to column count changes via CSS
- Infinite scroll with configurable threshold
- Works as a grid or a single-column list
- SSR-safe

## Installation

```bash
npm install @theryansmee/ngx-virtual-grid
```

## Angular Version Support

Each Angular major version is maintained on its own branch:

| Branch | Angular | Library | npm tag |
|---|---|---|---|
| `angular/14` | 14.x | 14.x.x | `angular14` |
| `angular/15` | 15.x | 15.x.x | `angular17` |
| `angular/16` | 16.x | 16.x.x | `angular17` |
| `angular/17` | 17.x | 17.x.x | `angular17` |
| `angular/18` | 18.x | 18.x.x | `angular18` |
| `angular/19` | 19.x | 19.x.x | `angular19` |
| `angular/20` | 20.x | 20.x.x | `angular20` |
| `angular/21` | 21.x | 21.x.x | `angular21` |
| `angular/22` | 22.x | 22.x.x | `latest` |

The `main` branch tracks the latest stable version.

## Usage

Import the component and directive directly (standalone):

```typescript
import { Component } from '@angular/core';
import { NgxVirtualGridComponent, VirtualGridItemDirective } from '@theryansmee/ngx-virtual-grid';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [NgxVirtualGridComponent, VirtualGridItemDirective],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss',
})
export class ExampleComponent {}
```

Use the component in your template:

```html
<ngx-virtual-grid
  [items]="items"
  [bufferSize]="3"
  [loadMoreThreshold]="0.8"
  (loadMore)="onLoadMore()">

  <ng-template ngxVirtualGridItem let-item let-index="index">
    <div class="card">{{ item.name }}</div>
  </ng-template>
</ngx-virtual-grid>
```

Style the grid with CSS:

```css
ngx-virtual-grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
```

### Grid layout

The component renders as a CSS Grid container. Control the number and size of columns with standard CSS on the `<ngx-virtual-grid>` element. The library auto-detects the column count and row height from the computed grid layout.

### Single-column list mode

For a virtual scrolling list instead of a grid, use a single column:

```css
ngx-virtual-grid {
  grid-template-columns: 1fr;
  gap: 8px;
}
```

Same component, same API — the layout adapts automatically based on your CSS.

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

## Prerequisites

- Node.js 16+
- Angular 17.x

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
npm publish --tag angular17
```

## Contributing

1. Branch off the appropriate `angular/*` branch for your target Angular version
2. Follow the existing code style (tabs, explicit types, explicit accessibility modifiers)
3. Add unit tests for new functionality
4. Ensure `npm run lint` and `npm run test:ci` pass before opening a PR

## License

MIT
