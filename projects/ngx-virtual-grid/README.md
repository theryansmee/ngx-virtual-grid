# ngx-virtual-grid

A responsive virtual-scrolling grid for Angular. Renders only the visible items using CSS Grid layout with auto-measured dimensions.

## Features

- Virtual scrolling for large lists in a grid layout
- CSS Grid powered - column count is driven by your own CSS (`grid-template-columns`)
- Auto-measures row height from rendered items (no manual sizing config)
- Infinite scroll support via `loadMore` event
- Custom scroll container support
- `OnPush` change detection
- SSR safe (no-ops on the server)

## Installation

```bash
# Angular 16
npm install ngx-virtual-grid@angular16

# Angular 15
npm install ngx-virtual-grid@angular15

# Angular 14
npm install ngx-virtual-grid@angular14
```

## Version Compatibility

| Angular | Library version | Install tag |
|---|---|---|
| 16.x | `16.x.x` | `@angular16` |
| 15.x | `15.x.x` | `@angular15` |
| 14.x | `14.x.x` | `@angular14` |

## Usage

### 1. Import the module

```typescript
import { NgxVirtualGridModule } from 'ngx-virtual-grid';

@NgModule({
	imports: [NgxVirtualGridModule],
})
export class AppModule {}
```

### 2. Add the component to your template

```html
<ngx-virtual-grid
	class="my-grid"
	[items]="items"
	[bufferSize]="3"
	[trackBy]="trackById"
	[loadMoreThreshold]="0.8"
	(loadMore)="onLoadMore()">

	<ng-template ngxVirtualGridItem let-item let-index="index">
		<div class="card">
		  #{{ index }} - {{ item.title }}
		</div>
	</ng-template>
</ngx-virtual-grid>
```

### 3. Define your grid columns with CSS

The component reads column count from `grid-template-columns` on the host element. You control the layout:

```css
.my-grid {
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 16px;
}
```

The component sets `display: grid` on itself — you only need to define the column template and gap.

## API

### Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `items` | `unknown[]` | `[]` | The full data array |
| `bufferSize` | `number` | `3` | Extra rows rendered above/below the viewport |
| `trackBy` | `TrackByFunction<unknown>` | `null` | Optional track-by function for `*ngFor` |
| `loadMoreThreshold` | `number` | `0.8` | Scroll ratio (0-1) at which `loadMore` fires |
| `scrollParent` | `HTMLElement` | `null` | Custom scroll container (defaults to `window`) |

### Outputs

| Output | Type | Description |
|---|---|---|
| `loadMore` | `EventEmitter<void>` | Emitted once when the user scrolls past the threshold. Resets when `items.length` changes. |

### Methods

| Method | Description |
|---|---|
| `scrollToIndex(index: number)` | Scroll to bring the given item index into view |
| `scrollToOffset(px: number)` | Scroll to an absolute pixel offset within the grid |
| `refresh()` | Force re-measure of row height and column count |

### Template Context

Inside the `ngxVirtualGridItem` template:

| Variable | Type | Description |
|---|---|---|
| `$implicit` | `unknown` | The item data from the `items` array |
| `index` | `number` | The item's index in the original array |

## How It Works

1. The component reads `grid-template-columns` from the computed style to determine column count
2. It renders a small batch of items and measures the actual row height from the DOM
3. On scroll, it calculates which rows are visible (plus a buffer) and renders only those items
4. Top and bottom spacer divs maintain the correct total scroll height
5. On resize, columns and row height are re-measured and the layout recalculates

## License

UNLICENSED
