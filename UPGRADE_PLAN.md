# Upgrade Plan: Angular 16 → 20

Each Angular major version gets its own branch (`angular/17`, `angular/18`, etc.) following the existing convention. Each branch is created from the previous version's branch.

## Branching Strategy

`main` **always tracks the latest stable version.** After each phase is complete and validated, merge the version branch into `main`:

```
angular/16 (current main)
  └─ angular/17  ──► merge into main
       └─ angular/18  ──► merge into main
            └─ angular/19  ──► merge into main
                 └─ angular/20  ──► merge into main (final)
```

- `main` = `angular/16` today → `angular/17` after Phase 1 → ... → `angular/20` after Phase 4
- The `angular/*` branches are preserved for maintenance patches on older versions
- GitHub Pages demo deploys from `main` (always shows the latest version)
- npm `latest` tag always matches `main`; older branches publish with version-specific tags (`--tag angular17`, etc.)

---

## Phase 1: Angular 17 — Standalone & Control Flow

**Branch:** `angular/17` (from `angular/16`)
**Library version:** `17.0.0`

### 1.1 Dependency Updates

| Package | From | To |
|---|---|---|
| `@angular/*` | `~16.2.12` | `~17.3.x` |
| `@angular/cli` | `~16.2.16` | `~17.3.x` |
| `@angular-devkit/build-angular` | `~16.2.16` | `~17.3.x` |
| `ng-packagr` | `~16.2.3` | `~17.3.x` |
| `typescript` | `~5.1.6` | `~5.3.3` |
| `zone.js` | `~0.13.3` | `~0.14.x` |
| `@angular-eslint/*` | `16.3.1` | `17.x` |
| `@typescript-eslint/*` | `5.62.0` | `6.x` |
| `@types/node` | `^18.0.0` | `^20.0.0` |

**Node.js requirement:** 18.13+ or 20.9+

### 1.2 Use `ng update` and Migration Schematics

Before making manual changes, run Angular's automated migrations:

```bash
# Update core Angular packages (runs schematics automatically)
ng update @angular/core@17 @angular/cli@17

# Automated standalone migration
ng generate @angular/core:standalone

# Automated control flow migration (*ngFor → @for, *ngIf → @if)
ng generate @angular/core:control-flow
```

Run these first, then review the output and make manual adjustments as described below.

> This applies to every phase — always run `ng update` first. Phase-specific schematics are noted where available (e.g., `signal-input-migration` in Phase 2).

### 1.3 Library — Standalone Components

Remove `NgxVirtualGridModule` and make both the component and directive standalone.

**`virtual-scroll.component.ts`** — Add `standalone: true` and move imports into the decorator:
```ts
@Component({
  selector: 'ngx-virtual-grid',
  standalone: true,
  imports: [NgFor, NgTemplateOutlet],
  templateUrl: './virtual-scroll.component.html',
  styleUrl: './virtual-scroll.component.scss', // singular
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

**`virtual-scroll-item.directive.ts`** — Add `standalone: true`:
```ts
@Directive({
  selector: '[ngxVirtualGridItem]',
  standalone: true,
})
```

**`ngx-virtual-grid.module.ts`** — Keep for one version as a deprecated re-export:
```ts
/** @deprecated Import NgxVirtualGridComponent and VirtualGridItemDirective directly. */
@NgModule({
  imports: [NgxVirtualGridComponent, VirtualGridItemDirective],
  exports: [NgxVirtualGridComponent, VirtualGridItemDirective],
})
export class NgxVirtualGridModule {}
```

### 1.3 Library — New Control Flow Syntax

**`virtual-scroll.component.html`** — Replace `*ngFor` with `@for`:
```html
<div
  class="ngx-vg__spacer-top"
  [style.height.px]="topSpacerHeight">
</div>

@for (item of renderedItems; track item.index) {
  <div
    class="ngx-vg__grid-item"
    role="listitem"
    [attr.aria-setsize]="items.length"
    [attr.aria-posinset]="item.index + 1">

    <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: item.data, index: item.index }">
    </ng-container>
  </div>
}

<div
  class="ngx-vg__spacer-bottom"
  [style.height.px]="bottomSpacerHeight">
</div>
```

> Note: `*ngTemplateOutlet` stays as-is — there is no control flow replacement for template outlets. The `NgFor` import can be removed from the component imports, but `NgTemplateOutlet` must remain.

**`@for` track expression:** Use `track item.index` directly rather than calling `internalTrackBy()`. `RenderedItem.index` is always unique (it's the original array position), making a function call unnecessary. The consumer-facing `trackBy` input was only used to derive a key from `item.data`, but since `item.index` maps 1:1 to the data array, it's sufficient. The `internalTrackBy` method and the `trackBy` input can be removed (this is a major version bump, so the breaking change is acceptable). If the `trackBy` input is kept for backward compatibility, use `track trackItem(item)` instead and delegate inside `trackItem`.

### 1.4 Demo App — Standalone Bootstrap

**`main.ts`** — Replace module bootstrap with standalone:
```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent);
```

**`app.component.ts`** — Make standalone, import the library directly:
```ts
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgxVirtualGridComponent, VirtualGridItemDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
```

**Delete:** `app.module.ts`, `environment.ts`, `environment.prod.ts` (not needed with new builder).

### 1.5 Build Config — `application` Builder

**`angular.json`** — Update the demo project's build architect:

```jsonc
"build": {
  "builder": "@angular-devkit/build-angular:application",
  "options": {
    "outputPath": "dist/demo",
    "index": "projects/demo/src/index.html",
    "browser": "projects/demo/src/main.ts",     // was "main"
    "polyfills": ["zone.js"],
    "tsConfig": "projects/demo/tsconfig.app.json",
    "inlineStyleLanguage": "scss",
    "assets": [
      { "glob": "**/*", "input": "projects/demo/src/assets", "output": "assets" },
      { "glob": "favicon.ico", "input": "projects/demo/src", "output": "" }
    ],
    "styles": ["projects/demo/src/styles.scss"],
    "scripts": []
  },
  "configurations": {
    "production": {
      "budgets": [ /* ... keep existing ... */ ],
      "outputHashing": "all"
    },
    "development": {
      "optimization": false,
      "sourceMap": true,
      "namedChunks": true
    }
  }
}
```

Update serve config — `browserTarget` → `buildTarget`:
```jsonc
"serve": {
  "builder": "@angular-devkit/build-angular:dev-server",
  "configurations": {
    "production": { "buildTarget": "demo:build:production" },
    "development": { "buildTarget": "demo:build:development" }
  }
}
```

Remove `extract-i18n` `browserTarget` → `buildTarget` as well.

Remove `buildOptimizer`, `vendorChunk`, `extractLicenses` from development config (no longer applicable to the `application` builder).

### 1.6 tsconfig Changes

**`tsconfig.json`**:
- Remove `useDefineForClassFields: false` (default is now `true`, which is correct for this codebase since it already uses `#privateFields`)
- Remove `downlevelIteration` (no longer needed at `es2022` target)

### 1.7 Public API Update

**`public-api.ts`**:
```ts
/** @deprecated Use standalone imports instead */
export { NgxVirtualGridModule } from './lib/ngx-virtual-grid.module';
export { NgxVirtualGridComponent } from './lib/virtual-scroll.component';
export { VirtualGridItemDirective } from './lib/virtual-scroll-item.directive';
export { GridLayout, VisibleRange, RenderedItem } from './lib/virtual-scroll.models';
export { calculateGridLayout } from './lib/grid-layout-calculator';
export { calculateVisibleRange } from './lib/range-manager';
```

### 1.8 ESLint Rule Fixes for `@typescript-eslint` v6

The `@typescript-eslint` v5→v6 upgrade has breaking rule changes that affect `.eslintrc.json`:

- `@typescript-eslint/comma-dangle` is **deprecated** — migrate to `@stylistic/comma-dangle` (install `@stylistic/eslint-plugin`) or use core `comma-dangle`.
- `@typescript-eslint/indent` is **deprecated** — migrate to `@stylistic/indent` or remove in favor of a formatter (e.g., Prettier).
- Several preset config names changed.

Audit every rule in `.eslintrc.json` against the v6 changelog and fix deprecation warnings before proceeding.

### 1.9 Library `package.json`

```json
{
  "peerDependencies": {
    "@angular/common": "^17.0.0",
    "@angular/core": "^17.0.0"
  }
}
```

---

## Phase 2: Angular 18 — Signal APIs & `inject()`

**Branch:** `angular/18` (from `angular/17`)
**Library version:** `18.0.0`

### 2.1 Dependency Updates

| Package | From | To |
|---|---|---|
| `@angular/*` | `~17.3.x` | `~18.2.x` |
| `@angular/cli` | `~17.3.x` | `~18.2.x` |
| `@angular-devkit/build-angular` | `~17.3.x` | `~18.2.x` |
| `ng-packagr` | `~17.3.x` | `~18.2.x` |
| `typescript` | `~5.3.3` | `~5.4.5` |
| `zone.js` | `~0.14.x` | `~0.14.x` |
| `@angular-eslint/*` | `17.x` | `18.x` |
| `@typescript-eslint/*` | `6.x` | `7.x` |

**Node.js requirement:** 18.19+ or 20.11+ or 22.0+

### 2.2 Use Signal Migration Schematics

```bash
ng update @angular/core@18 @angular/cli@18

# Automated signal migrations
ng generate @angular/core:signal-input-migration
ng generate @angular/core:signal-queries-migration
ng generate @angular/core:output-migration
ng generate @angular/core:inject-migration
```

Review the output, then adjust manually as described below.

### 2.3 Library — Signal Inputs

Replace all `@Input()` decorators with signal-based `input()` functions.

**`virtual-scroll.component.ts`**:
```ts
import { input, output, contentChild, inject, ... } from '@angular/core';

// Before (v17):
@Input() public items: unknown[] = [];
@Input() public bufferSize: number = 3;
@Input() public trackBy: TrackByFunction<unknown> | null = null;
@Input() public loadMoreThreshold: number = 0.8;
@Input() public scrollParent: HTMLElement | null = null;

// After (v18):
public readonly items = input<unknown[]>([]);
public readonly bufferSize = input<number>(3);
public readonly trackBy = input<TrackByFunction<unknown> | null>(null);
public readonly loadMoreThreshold = input<number>(0.8);
public readonly scrollParent = input<HTMLElement | null>(null);
```

### 2.3 Library — Signal Output

```ts
// Before:
@Output() public loadMore: EventEmitter<void> = new EventEmitter<void>();

// After:
public readonly loadMore = output<void>();
```

### 2.4 Library — Signal Content Query

```ts
// Before:
@ContentChild(VirtualGridItemDirective)
public itemDirective!: VirtualGridItemDirective;

// After:
public readonly itemDirective = contentChild(VirtualGridItemDirective);
```

The `itemTemplate` getter updates accordingly:
```ts
public get itemTemplate(): TemplateRef<unknown> | null {
  return this.itemDirective()?.templateRef ?? null;
}
```

### 2.5 Library — `inject()` Instead of Constructor DI

Replace the constructor with `inject()` calls:

```ts
// Before:
constructor(
  ngZone: NgZone,
  cdr: ChangeDetectorRef,
  elRef: ElementRef<HTMLElement>,
  @Inject(PLATFORM_ID) platformId: object,
) { ... }

// After:
readonly #ngZone = inject(NgZone);
readonly #cdr = inject(ChangeDetectorRef);
readonly #hostEl = inject(ElementRef<HTMLElement>).nativeElement;
readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
```

This eliminates the constructor entirely (or makes it empty).

### 2.7 Library — Replace `ngOnChanges` with `effect()`

Since inputs are now signals, replace `ngOnChanges` + `SimpleChanges` with an `effect()` that reacts to `items()` changes:

```ts
constructor() {
  effect(() => {
    const newItems = this.items();
    // Reading itemDirective() here makes the effect also track the content query.
    // This ensures the effect re-runs when the content child becomes available
    // (e.g., if items arrive before the directive is resolved).
    const directive = this.itemDirective();
    this.#handleItemsChange(newItems, directive);
  });
}
```

Remove the `OnChanges` interface and `ngOnChanges` method entirely. Update `#handleItemsChange` to accept the items array directly instead of `SimpleChanges`.

The `#handleItemsChange` method simplifies since it no longer needs to dig into `SimpleChanges`:
```ts
#handleItemsChange(newItems: unknown[], directive: VirtualGridItemDirective | undefined): void {
  if (newItems.length !== this.#lastItemCount) {
    this.#loadMoreFired = false;
    this.#lastItemCount = newItems.length;
  }

  if (!this.#measured && newItems.length > 0 && this.#isBrowser && directive) {
    this.#measureAndInit();
    return;
  }

  if (this.#measured) {
    this.#recalculateLayout();
  }
}
```

**Gotcha — `effect()` timing vs `ngAfterViewInit`:** The `effect()` replaces `ngOnChanges`, NOT `ngAfterViewInit`. The `ngAfterViewInit` hook must remain in this phase because measurement (`#measureAndInit`) accesses the DOM (`querySelectorAll`, `getBoundingClientRect`, `getComputedStyle`) and requires the view to be rendered. The `effect()` may fire before the component's view children are in the DOM on the very first change detection cycle.

The `effect()` handles the deferred initialization case (items arriving after init) because it re-runs when `items()` changes, and by that point the view is already initialized. `ngAfterViewInit` handles the eager initialization case (items available at component creation).

Both are needed in this phase. `ngAfterViewInit` is replaced with `afterNextRender` in Phase 3.

### 2.7 Library — Update All `this.items` References

Since `items` is now a signal, every reference to `this.items` must become `this.items()`:
- `this.items.length` → `this.items().length`
- `this.items[i]` → `this.items()[i]`
- Same for `this.bufferSize`, `this.scrollParent`, `this.trackBy`, `this.loadMoreThreshold`

Key places:
- `ngAfterViewInit`: `this.items().length`
- `#measureAndInit`: `this.items()` for array access
- `#updateVisibleRange`: `this.bufferSize()`, `this.items().length`
- `#onScroll`: `this.bufferSize()`, `this.items().length`
- `#setupListeners`: `this.scrollParent()`
- `#removeListeners`: `this.scrollParent()`
- `#getScrollTop` / `#setScrollTop` / `#getViewportHeight`: `this.scrollParent()`
- `internalTrackBy`: `this.trackBy()`
- `#checkLoadMore`: `this.loadMoreThreshold()`
- Template: `items().length` for `aria-setsize`

### 2.8 Demo App Updates

Update the demo component to align with new patterns:
- Use `inject()` if any DI is needed
- The demo template references to `items.length` become `items().length` if you also make the demo use signals (optional — only the library is published)

### 2.9 Library `package.json`

```json
{
  "peerDependencies": {
    "@angular/common": "^18.0.0",
    "@angular/core": "^18.0.0"
  }
}
```

---

## Phase 3: Angular 19 — Standalone Default & Cleanup

**Branch:** `angular/19` (from `angular/18`)
**Library version:** `19.0.0`

### 3.1 Dependency Updates

| Package | From | To |
|---|---|---|
| `@angular/*` | `~18.2.x` | `~19.2.x` |
| `@angular/cli` | `~18.2.x` | `~19.2.x` |
| `@angular-devkit/build-angular` | `~18.2.x` | `~19.2.x` |
| `ng-packagr` | `~18.2.x` | `~19.2.x` |
| `typescript` | `~5.4.5` | `~5.6.3` |
| `zone.js` | `~0.14.x` | `~0.15.x` |
| `@angular-eslint/*` | `18.x` | `19.x` |
| `@typescript-eslint/*` | `7.x` | `8.x` |

**Node.js requirement:** 18.19+ or 20.11+ or 22.0+

### 3.2 Library — Remove `standalone: true`

In Angular 19, `standalone: true` is the default. Remove it from both the component and directive decorators to reduce boilerplate:

```ts
// Before:
@Component({
  standalone: true,
  ...
})

// After:
@Component({
  ...
})
```

### 3.3 Library — Delete `NgxVirtualGridModule`

The module was deprecated in v17. Remove it entirely:

- **Delete** `ngx-virtual-grid.module.ts`
- **Remove** the module re-export from `public-api.ts`

### 3.4 Library — `afterNextRender` for Measurement

Replace `ngAfterViewInit` with `afterNextRender` for the measurement/initialization logic. This is SSR-safe by design and eliminates the need for `isPlatformBrowser` checks:

```ts
import { afterNextRender, DestroyRef } from '@angular/core';

// In constructor or field initializer:
constructor() {
  afterNextRender(() => {
    if (this.items().length > 0) {
      this.#measureAndInit();
    }
  });
}
```

Remove the `#isBrowser` field and the `isPlatformBrowser` import. Remove the `PLATFORM_ID` injection. Remove the `AfterViewInit` interface and `ngAfterViewInit` method.

**Gotcha — `afterNextRender` fires only once.** If `items()` is empty on first render (e.g., async data loading), the callback exits early and never fires again. This is fine because the `effect()` from Phase 2 handles the deferred case — it re-runs when `items()` changes and calls `#measureAndInit()` if not yet measured. By the time the effect re-runs from an input change, the DOM is guaranteed to be available (the view was already initialized on the first render).

In practice, `afterNextRender` handles the synchronous-items case, and the `effect()` handles the async-items case. The `#measured` flag prevents double initialization.

### 3.5 Library — `DestroyRef` Instead of `ngOnDestroy`

Replace the `OnDestroy` lifecycle hook with `DestroyRef`:

```ts
readonly #destroyRef = inject(DestroyRef);

// In #setupListeners:
this.#destroyRef.onDestroy(() => this.#removeListeners());
```

Remove the `OnDestroy` interface and `ngOnDestroy` method.

### 3.6 Library — Skip `linkedSignal` (Developer Preview)

`linkedSignal` is developer preview in v19. **Do not use it in a published library** — the API may change between v19 minor releases, which would force a library patch. Keep using the imperative approach for `renderedItems` in this phase. Adopt `linkedSignal` in Phase 4 (v20) where it's stable.

### 3.7 Migrate Testing from Karma to Web Test Runner

Karma has been deprecated since Angular 16. Angular 19 provides built-in support for the Web Test Runner:

1. **Remove** Karma-related devDependencies: `karma`, `karma-chrome-launcher`, `karma-coverage`, `karma-jasmine`, `karma-jasmine-html-reporter`
2. **Remove** `karma.conf.js` files from both projects
3. **Remove** `test.ts` bootstrap files
4. **Install** Web Test Runner: `@web/test-runner`
5. **Update** `angular.json` test architect to use `@angular-devkit/build-angular:web-test-runner`

```jsonc
"test": {
  "builder": "@angular-devkit/build-angular:web-test-runner",
  "options": {
    "tsConfig": "projects/ngx-virtual-grid/tsconfig.spec.json"
  }
}
```

Update `tsconfig.spec.json` to remove `files: ["src/test.ts"]`.

**Gotcha — Spec compatibility:** The existing Jasmine specs (`range-manager.spec.ts`, `grid-layout-calculator.spec.ts`) are pure logic tests with no Karma-specific APIs, so they should work without modification. However, verify that any custom Karma config (browser launchers, code coverage thresholds, reporters) has equivalent Web Test Runner configuration. The `karma.conf.js` files should be reviewed before deletion to ensure nothing is lost.

### 3.8 Library `package.json`

```json
{
  "peerDependencies": {
    "@angular/common": "^19.0.0",
    "@angular/core": "^19.0.0"
  }
}
```

---

## Phase 4: Angular 20 — Zoneless & Modern Signals

**Branch:** `angular/20` (from `angular/19`)
**Library version:** `20.0.0`

### 4.1 Dependency Updates

| Package | From | To |
|---|---|---|
| `@angular/*` | `~19.2.x` | `~20.0.x` |
| `@angular/cli` | `~19.2.x` | `~20.0.x` |
| `@angular-devkit/build-angular` | `~19.2.x` | `~20.0.x` |
| `ng-packagr` | `~19.2.x` | `~20.0.x` |
| `typescript` | `~5.6.3` | `~5.8.x` |
| `zone.js` | Remove (zoneless) | — |
| `@angular-eslint/*` | `19.x` | `20.x` |
| `@typescript-eslint/*` | `8.x` | `8.x` |

**Node.js requirement:** 20.x+ or 22.x+

### 4.2 Library — Zoneless Change Detection

Angular 20 stabilizes zoneless change detection. The library must work in **both** zoned and zoneless consumer apps. Key changes:

1. **Keep `NgZone` — do NOT remove it.** This is critical for backward compatibility. In zoned apps, `zone.js` patches `addEventListener`, so every scroll event triggers a full `ApplicationRef.tick()` traversal. The current `runOutsideAngular` pattern prevents this. Removing `NgZone` would cause a performance regression for all zoned consumers.

   `NgZone` always exists — in zoneless apps it's `NoopNgZone`, where `runOutsideAngular` and `run` are harmless no-ops. So keeping it costs nothing in zoneless mode:

   ```ts
   readonly #ngZone = inject(NgZone);

   // In #setupListeners — works correctly in both modes:
   // - Zoned: registers outside zone, avoids CD on every scroll
   // - Zoneless: NoopNgZone, runOutsideAngular is a no-op
   this.#ngZone.runOutsideAngular(() => {
     scrollTarget.addEventListener('scroll', this.#boundOnScroll, { passive: true });
   });
   ```

2. **Remove `ChangeDetectorRef`.** Replace `markForCheck()` / `detectChanges()` with signal writes. Since inputs are already signals (from v18), and `renderedItems` / `topSpacerHeight` / `bottomSpacerHeight` become writable signals, the template reacts automatically. Signal writes inside `NgZone.run()` trigger change detection in both modes.

3. **Convert remaining mutable state to signals:**

```ts
public readonly renderedItems = signal<RenderedItem[]>([]);
public readonly topSpacerHeight = signal<number>(0);
public readonly bottomSpacerHeight = signal<number>(0);
```

Update the template to read signal values:
```html
<div class="ngx-vg__spacer-top" [style.height.px]="topSpacerHeight()"></div>

@for (item of renderedItems(); track item.index) {
  ...
}

<div class="ngx-vg__spacer-bottom" [style.height.px]="bottomSpacerHeight()"></div>
```

4. **Update scroll/resize handlers.** Keep `NgZone.run()` for the range update (ensures CD in zoned mode). Signal writes inside the `run()` callback also notify the zoneless scheduler:

```ts
#applyRangeUpdate(newRange: VisibleRange): void {
  if (!rangeChanged) {
    return;
  }

  this.#ngZone.run(() => {
    this.#currentRange = newRange;
    this.renderedItems.set(this.#buildRenderedItems());
    this.topSpacerHeight.set(startRow * this.#layout.rowHeight);
    this.bottomSpacerHeight.set(Math.max(0, rowsBelow * this.#layout.rowHeight));
  });
}
```

> Angular batches signal writes within the same synchronous block, so writing to 3 signals triggers only one change detection cycle.

### 4.3 Library — `linkedSignal` (Stable)

`linkedSignal` is stable in Angular 20. Use it for state that resets when inputs change:

```ts
// Reset loadMoreFired when items count changes
readonly #loadMoreFired = linkedSignal({
  source: () => this.items().length,
  computation: () => false,
});
```

### 4.4 Library — `resource()` API (If Applicable)

The `resource()` API is stable in Angular 20. While this library doesn't do async data fetching itself, consider documenting or providing an example of using `resource()` with the grid in the demo app for loading items.

### 4.5 Library — Test in Both Zoned and Zoneless Modes

Since the library must work in both modes, the test suite should validate both. Add a second test configuration or a test helper:

```ts
describe('NgxVirtualGridComponent (zoneless)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });
  // ... same integration tests ...
});
```

At minimum, run the full spec suite once with zone.js and once with `provideZonelessChangeDetection()` to catch regressions in either mode.

### 4.6 Library — `output()` Emit from Scroll Handler

The `loadMore` output emits from inside the scroll event handler (not a framework event). In zoneless mode, `OutputEmitterRef.emit()` notifies template-bound subscribers, but the subscriber's callback (the consumer's `(loadMore)="onLoadMore()"` handler) runs outside the framework's awareness. If the consumer's handler modifies state, they must use signals (or call `ChangeDetectorRef.markForCheck()` in zoned mode) for their view to update.

This is the consumer's responsibility, not the library's, but it should be documented in the README's usage section for v20.

### 4.7 Demo App — Zoneless Bootstrap

**`main.ts`**:
```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

Remove `zone.js` from `polyfills` in `angular.json`.
Remove `zone.js` from workspace `package.json` dependencies.

### 4.8 ESLint — Flat Config Migration

Angular 20 and `@angular-eslint` 20.x support ESLint flat config. Migrate from `.eslintrc.json` to `eslint.config.js`:

```js
const angular = require('angular-eslint');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { files: ['**/*.ts'], extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended], rules: { /* existing rules */ } },
  { files: ['**/*.html'], extends: [...angular.configs.templateRecommended], rules: {} },
);
```

Delete `.eslintrc.json`.

### 4.9 README Updates

Update the version support table:

```markdown
| Branch | Angular | Library version | npm tag |
|---|---|---|---|
| `angular/14` | 14.x | `14.x.x` | `angular14` |
| `angular/15` | 15.x | `15.x.x` | `angular15` |
| `angular/16` | 16.x | `16.x.x` | `angular16` |
| `angular/17` | 17.x | `17.x.x` | `angular17` |
| `angular/18` | 18.x | `18.x.x` | `angular18` |
| `angular/19` | 19.x | `19.x.x` | `angular19` |
| `angular/20` | 20.x | `20.x.x` | `latest` |
```

Update the prerequisites to Node.js 20+ and npm 10+.

Update the consumer usage docs to show standalone imports (no module).

### 4.10 Library `package.json`

```json
{
  "peerDependencies": {
    "@angular/common": "^20.0.0",
    "@angular/core": "^20.0.0"
  }
}
```

### 4.11 Demo Deployment — GitHub Pages

Host the demo app on GitHub Pages so users can see the library in action.

**Setup (one-time):**

```bash
# Install the deployment tool
ng add angular-cli-ghpages
```

**Add a deploy script to workspace `package.json`:**
```json
"deploy:demo": "ng deploy demo --base-href=/ngx-virtual-grid/"
```

**Deploy:**
```bash
npm run build:lib
npm run deploy:demo
```

This builds the demo app and pushes the output to the `gh-pages` branch. The site is available at:
`https://theryansmee.github.io/ngx-virtual-grid/`

**Enable GitHub Pages** in the repo settings:
- Go to Settings → Pages
- Source: "Deploy from a branch"
- Branch: `gh-pages`, folder: `/ (root)`

**Optional — Automate with GitHub Actions:**

Create `.github/workflows/deploy-demo.yml` to auto-deploy when `main` is updated:

```yaml
name: Deploy Demo
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build:lib
      - run: npx ng build demo --configuration production --base-href /ngx-virtual-grid/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/demo
      - id: deployment
        uses: actions/deploy-pages@v4
```

> Since `main` always tracks the latest stable version, the demo site always shows the current release. No manual deploys needed after this is set up.

**Update README** — Add a "Live Demo" link at the top:
```markdown
[Live Demo](https://theryansmee.github.io/ngx-virtual-grid/)
```

### 4.12 Update `main` Branch

After v20 is complete and validated, merge `angular/20` into `main` so `main` tracks the latest. This also triggers the GitHub Actions workflow to deploy the demo site.

---

## Gotchas & Risks Summary

This section consolidates all identified risks across phases for quick reference.

### Cross-Phase: ESLint Breaking Changes

Every `@typescript-eslint` major bump (5→6→7→8) has rule renames and deprecations. The current `.eslintrc.json` uses `@typescript-eslint/indent` and `@typescript-eslint/comma-dangle`, both deprecated in v6 and moved to `@stylistic/eslint-plugin`. Each phase requires auditing the lint config — not just bumping versions. Budget time for this in every phase.

### Cross-Phase: RxJS Compatibility

The workspace uses `rxjs ~7.8.0`. The library itself does not import RxJS, but it's a workspace dependency. Angular 17–19 are compatible with RxJS 7.x. Angular 20 may recommend RxJS 7.8+ or 8.x. Validate compatibility at each step and update if needed.

### Cross-Phase: Always Run `ng update` First

Angular provides migration schematics that automate many changes (standalone, control flow, signal inputs, inject, etc.). Always run `ng update` and the relevant schematics before making manual edits. This avoids rework and catches edge cases the schematics handle automatically.

### Phase 1: `@for` Track Expression

The `@for` `track` clause is an expression, not a function reference like `*ngFor`'s `trackBy`. Use `track item.index` directly — it's simpler and more efficient than calling a function. Decide whether to keep or remove the consumer-facing `trackBy` input (major version bump allows breaking changes).

### Phase 2: `effect()` Does Not Replace `ngAfterViewInit`

The `effect()` replaces `ngOnChanges` only. `ngAfterViewInit` must stay because DOM measurement requires the view to be rendered. The `effect()` handles deferred initialization (items arriving after init). Both coexist until Phase 3 replaces `ngAfterViewInit` with `afterNextRender`.

### Phase 2: `effect()` Implicit Signal Dependencies

When `#handleItemsChange` reads `this.itemDirective()` inside the `effect()`, it creates an implicit dependency on the content query signal. This is intentional — it ensures the effect re-runs when the content child becomes available — but should be documented with a comment.

### Phase 3: `afterNextRender` Fires Only Once

If `items()` is empty on first render, `afterNextRender` exits early and never fires again. The `effect()` from Phase 2 covers this case. The `#measured` flag prevents double initialization. Both mechanisms are needed.

### Phase 3: `linkedSignal` Is Developer Preview

Do not use `linkedSignal` in a published library in v19. The API may change between minor releases. Defer to Phase 4 where it's stable.

### Phase 4: Do NOT Remove `NgZone` (Performance)

Removing `NgZone` causes a performance regression for zoned consumers. `zone.js` patches `addEventListener`, so every scroll event triggers `ApplicationRef.tick()` without `runOutsideAngular`. Keep `NgZone` — in zoneless mode it's `NoopNgZone` where `runOutsideAngular`/`run` are harmless no-ops.

### Phase 4: `output()` Emit Outside Framework Events

`loadMore.emit()` fires from a raw scroll event listener. In zoneless consumer apps, the subscriber's handler must use signals for their view to update. Document this in the README.

### Phase 4: Test Both Zoned and Zoneless

The library is consumed by both types of apps. Run the test suite under both `zone.js` and `provideZonelessChangeDetection()` to catch mode-specific regressions.

---

## Summary of Feature Adoption by Version

| Feature | Introduced | Adopted In |
|---|---|---|
| Standalone components | v14 (opt-in) | **v17** |
| `@for` / `@if` control flow | v17 | **v17** |
| `application` builder (esbuild) | v17 | **v17** |
| `styleUrl` (singular) | v17 | **v17** |
| Signal inputs (`input()`) | v17.1 (preview), v18 (stable) | **v18** |
| Signal outputs (`output()`) | v17.3 (preview), v18 (stable) | **v18** |
| Signal queries (`contentChild()`) | v17.2 (preview), v18 (stable) | **v18** |
| `inject()` function | v14+ | **v18** |
| `effect()` for reactive state | v16 (preview), v18 (stable) | **v18** |
| `standalone: true` as default | v19 | **v19** |
| `afterNextRender` | v17 (preview), v19 (stable) | **v19** |
| `DestroyRef` | v16 | **v19** |
| Web Test Runner | v19 | **v19** |
| Zoneless change detection | v18 (exp), v20 (stable) | **v20** |
| `linkedSignal()` | v19 (preview), v20 (stable) | **v20** |
| ESLint flat config | v18+ | **v20** |
| Remove `NgxVirtualGridModule` | — | **v19** |

## Files Changed Per Phase

### Phase 1 (v17) — 13 files
- `package.json` — dependency versions
- `.eslintrc.json` — fix deprecated `@typescript-eslint` v6 rules
- `angular.json` — application builder, buildTarget
- `tsconfig.json` — remove useDefineForClassFields, downlevelIteration
- `projects/ngx-virtual-grid/package.json` — peer deps
- `projects/ngx-virtual-grid/src/lib/virtual-scroll.component.ts` — standalone, imports, remove trackBy input / internalTrackBy
- `projects/ngx-virtual-grid/src/lib/virtual-scroll.component.html` — @for control flow with `track item.index`
- `projects/ngx-virtual-grid/src/lib/virtual-scroll-item.directive.ts` — standalone
- `projects/ngx-virtual-grid/src/lib/ngx-virtual-grid.module.ts` — deprecate, re-export
- `projects/ngx-virtual-grid/src/public-api.ts` — deprecation comment
- `projects/demo/src/main.ts` — bootstrapApplication
- `projects/demo/src/app/app.component.ts` — standalone
- `projects/demo/src/app/app.module.ts` — DELETE

### Phase 2 (v18) — 6 files
- `package.json` — dependency versions
- `.eslintrc.json` — fix deprecated `@typescript-eslint` v7 rules (if any)
- `projects/ngx-virtual-grid/package.json` — peer deps
- `projects/ngx-virtual-grid/src/lib/virtual-scroll.component.ts` — signal inputs/outputs/queries, inject(), effect() (keep ngAfterViewInit)
- `projects/ngx-virtual-grid/src/lib/virtual-scroll.component.html` — items().length
- `projects/demo/src/app/app.component.ts` — minor updates

### Phase 3 (v19) — 10+ files
- `package.json` — dependency versions, remove karma deps
- `angular.json` — web-test-runner
- `projects/ngx-virtual-grid/package.json` — peer deps
- `projects/ngx-virtual-grid/src/lib/virtual-scroll.component.ts` — remove standalone:true, afterNextRender, DestroyRef
- `projects/ngx-virtual-grid/src/lib/virtual-scroll-item.directive.ts` — remove standalone:true
- `projects/ngx-virtual-grid/src/lib/ngx-virtual-grid.module.ts` — DELETE
- `projects/ngx-virtual-grid/src/public-api.ts` — remove module export
- `projects/ngx-virtual-grid/tsconfig.spec.json` — remove test.ts file ref
- `projects/ngx-virtual-grid/karma.conf.js` — DELETE
- `projects/demo/karma.conf.js` — DELETE
- `projects/ngx-virtual-grid/src/test.ts` — DELETE
- `projects/demo/src/test.ts` — DELETE

### Phase 4 (v20) — 12+ files
- `package.json` — dependency versions, remove zone.js from workspace, add deploy:demo script
- `angular.json` — remove zone.js polyfill from demo
- `projects/ngx-virtual-grid/package.json` — peer deps
- `projects/ngx-virtual-grid/src/lib/virtual-scroll.component.ts` — signals for all template state, remove CDR (keep NgZone), linkedSignal, dual-mode tests
- `projects/ngx-virtual-grid/src/lib/virtual-scroll.component.html` — read signals in template
- `projects/ngx-virtual-grid/src/lib/range-manager.spec.ts` — add zoneless test variants
- `projects/demo/src/main.ts` — provideZonelessChangeDetection
- `.eslintrc.json` — DELETE
- `eslint.config.js` — CREATE (flat config)
- `.github/workflows/deploy-demo.yml` — CREATE (auto-deploy demo to GitHub Pages)
- `README.md` — update version table, prerequisites, usage docs, zoneless guidance, live demo link

## Execution Order

For each phase:
1. Create branch from previous version
2. Run `ng update` for core Angular packages (runs migration schematics)
3. Run any additional migration schematics (standalone, control-flow, signal-input, etc.)
4. Update remaining dependencies manually
5. Make manual code changes
6. Run `npm run build:lib` — verify library builds
7. Run `npm run test:ci` — verify tests pass
8. Run `npm run lint` — verify lint passes
9. Run `npm start` — verify demo app works
10. Commit with message format: `Upgrade to v{N}`
11. Merge into `main`

**After Phase 4 only:**
12. Enable GitHub Pages in repo settings (one-time)
13. Verify demo auto-deploys to `https://theryansmee.github.io/ngx-virtual-grid/`
