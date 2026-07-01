# Large Screen Fix: loadMore never fires when items fit on screen

## The Bug

If the viewport is tall enough to display all initially loaded items without scrolling, `loadMore` (and `loadPrevious` in pagination mode) never fires. The user sees only the initial batch with no way to load more.

This affects **all versions** (v14–v19+), both standard infinite scroll and pagination mode.

### Root Cause

Load triggers (`#checkLoadMore`, `#checkPaginatedLoadMore`, `#checkLoadPrevious`) were only called from `#onScroll`. If the content doesn't overflow the viewport, no scroll event fires, so the triggers never run.

## The Fix

In `#updateVisibleRange`, after computing the range and updating spacers, check load triggers. This method runs on every layout recalculation (init, items change, resize), not just on scroll.

### Before

```typescript
#updateVisibleRange(): void {
    // ... calculate range, update items, update spacers
    this.#cdr.markForCheck();
}
```

### After

```typescript
#updateVisibleRange(): void {
    const viewportHeight: number = this.#getViewportHeight();
    const hostRect: DOMRect = this.#hostEl.getBoundingClientRect();
    const scrollIntoComponent: number = Math.max(0, -hostRect.top);

    this.#currentRange = calculateVisibleRange(/* ... */);

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
}
```

### For versions without pagination mode

On branches that don't have pagination support, the fix is simpler — just add the standard `#checkLoadMore` call:

```typescript
#updateVisibleRange(): void {
    const viewportHeight: number = this.#getViewportHeight();
    const hostRect: DOMRect = this.#hostEl.getBoundingClientRect();
    const scrollIntoComponent: number = Math.max(0, -hostRect.top);

    this.#currentRange = calculateVisibleRange(/* ... */);

    this.#updateRenderedItems();
    this.#updateSpacers();
    this.#cdr.markForCheck();

    this.#checkLoadMore(scrollIntoComponent, viewportHeight);
}
```

Note: `scrollIntoComponent` and `viewportHeight` are already computed at the top of the method — they just need to be passed to `#checkLoadMore` at the end.

## How to verify

1. Resize the browser window to be very tall (or reduce the initial item count)
2. Load the demo — items should keep loading until the screen is full
3. Scrolling should continue to work normally after that
