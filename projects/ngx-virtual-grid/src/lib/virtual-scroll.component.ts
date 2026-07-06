import {
	Component,
	DestroyRef,
	ElementRef,
	InputSignal,
	NgZone,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	OutputEmitterRef,
	Signal,
	TemplateRef,
	afterNextRender,
	input,
	output,
	contentChild,
	inject,
	effect,
	untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { VirtualGridItemDirective } from './virtual-scroll-item.directive';
import { VirtualGridSkeletonDirective } from './virtual-scroll-skeleton.directive';
import { calculateGridLayout } from './grid-layout-calculator';
import { calculateVisibleRange } from './range-manager';
import { GridLayout, VisibleRange, RenderedItem } from './virtual-scroll.models';
import { checkLoadMore, createLoadMoreState, LoadMoreState } from './load-more-manager';

@Component({
	selector: 'ngx-virtual-grid',
	imports: [NgTemplateOutlet],
	templateUrl: './virtual-scroll.component.html',
	styleUrl: './virtual-scroll.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxVirtualGridComponent {
	public readonly items: InputSignal<unknown[]> = input<unknown[]>([]);

	public readonly bufferSize: InputSignal<number> = input<number>(3);

	public readonly loadMoreThreshold: InputSignal<number> = input<number>(0.8);

	public readonly scrollParent: InputSignal<HTMLElement | null> = input<HTMLElement | null>(null);

	public readonly page: InputSignal<number> = input<number>(0);

	public readonly pageSize: InputSignal<number> = input<number>(0);

	public readonly loading: InputSignal<boolean> = input<boolean>(false);

	public readonly loadMore: OutputEmitterRef<void> = output<void>();

	public readonly pageNeeded: OutputEmitterRef<number> = output<number>();

	public readonly pageChanged: OutputEmitterRef<number> = output<number>();

	public readonly itemDirective: Signal<VirtualGridItemDirective | undefined> = contentChild(VirtualGridItemDirective);

	public readonly skeletonDirective: Signal<VirtualGridSkeletonDirective | undefined> = contentChild(VirtualGridSkeletonDirective);

	public renderedItems: RenderedItem[] = [];

	public topSpacerHeight: number = 0;

	public bottomSpacerHeight: number = 0;

	public columnOffsetCells: unknown[] = [];

	readonly #ngZone: NgZone = inject(NgZone);

	readonly #changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);

	readonly #hostEl: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;

	readonly #destroyRef: DestroyRef = inject(DestroyRef);

	#columnCount: number = 0;

	#rowHeight: number = 0;

	#itemHeight: number = 0;

	#measured: boolean = false;

	#layout: GridLayout = { columnCount: 1, rowHeight: 0, totalRows: 0, totalContentHeight: 0 };

	#currentRange: VisibleRange = { startRow: 0, endRow: 0, startIndex: 0, endIndex: 0 };

	#resizeObserver: ResizeObserver | null = null;

	#loadMoreState: LoadMoreState = createLoadMoreState();

	#boundOnScroll: (() => void) | null = null;

	#lastEmittedPageNeeded: number = -1;

	#lastEmittedPageChanged: number = -1;

	#listenersAttached: boolean = false;

	public get itemTemplate(): TemplateRef<unknown> | null {
		return this.itemDirective()?.templateRef ?? null;
	}

	public get skeletonTemplate(): TemplateRef<unknown> | null {
		return this.skeletonDirective()?.templateRef ?? null;
	}

	constructor() {
		// items or skeletons available at first render
		afterNextRender(() => {
			if (this.items().length > 0 || (this.loading() && this.skeletonDirective())) {
				this.#measureAndInit();
			}
		});

		// items arriving after init or changing later
		effect(() => {
			const newItems: unknown[] = this.items();
			const directive: VirtualGridItemDirective | undefined = this.itemDirective();
			this.page();
			this.pageSize();
			this.#lastEmittedPageNeeded = -1;
			this.#lastEmittedPageChanged = -1;
			// Reset fire/height tracking so a fresh navigation can trigger loadMore.
			// Keep scrolledPastEnd — it tracks physical scroll position and guards against the DDoS loop.
			this.#loadMoreState = { ...this.#loadMoreState, loadMoreFired: false, contentHeightAtLastLoad: 0 };
			untracked(() => this.#handleItemsChange(newItems, directive));
		});

		// loading state changes
		effect(() => {
			const isLoading: boolean = this.loading();
			untracked(() => {
				if (!this.#measured && isLoading && this.items().length === 0 && this.skeletonDirective()) {
					this.#measureAndInit();
				} else if (this.#measured) {
					this.#recalculateLayout();
				}
			});
		});

		this.#destroyRef.onDestroy(() => this.#removeListeners());
	}

	public scrollToIndex(index: number): void {
		if (!this.#measured || this.#layout.rowHeight <= 0) {
			return;
		}

		const row: number = Math.floor(index / this.#layout.columnCount);
		const hostOffsetInScroller: number = this.#getHostOffsetInScroller();
		this.#setScrollTop(hostOffsetInScroller + row * this.#layout.rowHeight);
	}

	public scrollToOffset(px: number): void {
		const hostOffsetInScroller: number = this.#getHostOffsetInScroller();
		this.#setScrollTop(hostOffsetInScroller + px);
	}

	public refresh(): void {
		this.#measured = false;

		if (this.items().length === 0 && !(this.loading() && this.skeletonDirective())) {
			return;
		}

		this.#measureAndInit();
	}

	public scrollToPage(page: number): void {
		const pageSizeValue: number = this.pageSize();

		if (pageSizeValue <= 0) {
			return;
		}

		this.scrollToIndex(page * pageSizeValue);
	}

	#handleItemsChange(newItems: unknown[], directive: VirtualGridItemDirective | undefined): void {
		const canMeasureFromItems: boolean = newItems.length > 0 && !!directive;
		const canMeasureFromSkeletons: boolean = newItems.length === 0 && this.loading() && !!this.skeletonDirective();

		if (!this.#measured && (canMeasureFromItems || canMeasureFromSkeletons)) {
			this.#measureAndInit();
			return;
		}

		if (this.#measured) {
			this.#recalculateLayout();
		}
	}

	#measureAndInit(): void {
		const itemDir: VirtualGridItemDirective | undefined = this.itemDirective();
		const skeletonDir: VirtualGridSkeletonDirective | undefined = this.skeletonDirective();
		const items: unknown[] = this.items();
		const useSkeletons: boolean = items.length === 0 && this.loading() && !!skeletonDir;

		if (!itemDir && !skeletonDir) {
			return;
		}

		if (items.length === 0 && !useSkeletons) {
			return;
		}

		this.#columnCount = this.#getColumnCountFromCSS();

		// render enough items for measurement
		const measureBatchSize: number = useSkeletons
			? this.#columnCount * 3
			: Math.min(items.length, this.#columnCount * 3);
		this.renderedItems = [];
		for (let i: number = 0; i < measureBatchSize; i++) {
			this.renderedItems.push({
				data: useSkeletons ? null : items[i],
				index: i,
				skeleton: useSkeletons,
			});
		}
		this.#changeDetectorRef.detectChanges();

		this.#measureRowHeight();

		if (!this.#measured) {
			return;
		}

		this.#recalculateLayout();
		this.#setupListeners();

		const viewportHeight: number = this.#getViewportHeight();
		const scrollIntoComponent: number = this.#getScrollIntoComponent();
		this.#checkLoadMore(scrollIntoComponent, viewportHeight);
	}

	#getColumnCountFromCSS(): number {
		const gridTemplateColumns: string = getComputedStyle(this.#hostEl).gridTemplateColumns;

		if (!gridTemplateColumns || gridTemplateColumns === 'none') {
			return 1;
		}

		return gridTemplateColumns.split(' ').filter((column: string) => column.length > 0).length;
	}

	#measureRowHeight(): void {
		const gridItems: NodeListOf<Element> = this.#hostEl.querySelectorAll(':scope > .ngx-vg__grid-item');

		if (gridItems.length === 0) {
			return;
		}

		const firstItem: HTMLElement = gridItems[0] as HTMLElement;
		const firstRect: DOMRect = firstItem.getBoundingClientRect();
		this.#itemHeight = firstRect.height;

		if (gridItems.length > this.#columnCount) {
			const secondRowItem: HTMLElement = gridItems[this.#columnCount] as HTMLElement;
			const secondRect: DOMRect = secondRowItem.getBoundingClientRect();
			this.#rowHeight = secondRect.top - firstRect.top;
		} else {
			// only one row, use item height (no gap info)
			this.#rowHeight = this.#itemHeight;
		}

		this.#measured = this.#columnCount > 0 && this.#rowHeight > 0 && this.#itemHeight > 0;
	}

	#effectiveTotalItems(): number {
		const pageSizeValue: number = this.pageSize();
		const itemCount: number = this.items().length;

		let total: number;
		if (pageSizeValue <= 0) {
			total = itemCount;
		} else {
			total = this.page() * pageSizeValue + itemCount;
		}

		if (this.loading() && this.skeletonDirective()) {
			total += this.#getSkeletonCount();
		}

		return total;
	}

	#getSkeletonCount(): number {
		if (!this.#measured || this.#layout.rowHeight <= 0) {
			return this.#columnCount * 3;
		}

		const viewportHeight: number = this.#getViewportHeight();
		const rowsInViewport: number = Math.ceil(viewportHeight / this.#layout.rowHeight);
		return (rowsInViewport + this.bufferSize() * 2) * this.#layout.columnCount;
	}

	#recalculateLayout(): void {
		this.#layout = calculateGridLayout(
			this.#columnCount,
			this.#rowHeight,
			this.#itemHeight,
			this.#effectiveTotalItems(),
		);

		this.#updateVisibleRange();
	}

	#updateVisibleRange(): void {
		const viewportHeight: number = this.#getViewportHeight();
		const scrollIntoComponent: number = this.#getScrollIntoComponent();

		this.#currentRange = calculateVisibleRange(
			scrollIntoComponent,
			viewportHeight,
			this.#layout.rowHeight,
			this.#layout.totalRows,
			this.bufferSize(),
			this.#layout.columnCount,
			this.#effectiveTotalItems(),
		);

		this.#updateRenderedItems();
		this.#updateSpacers();
		this.#changeDetectorRef.markForCheck();
	}

	#updateRenderedItems(): void {
		const { startIndex, endIndex } = this.#currentRange;
		const items: unknown[] = this.items();
		const hasSkeleton: boolean = !!this.skeletonDirective() && this.loading();
		this.renderedItems = [];

		const pageSizeValue: number = this.pageSize();
		if (pageSizeValue > 0) {
			const globalStart: number = this.page() * pageSizeValue;
			const globalEnd: number = globalStart + items.length;

			for (let i: number = startIndex; i < endIndex; i++) {
				if (i >= globalStart && i < globalEnd) {
					this.renderedItems.push({ data: items[i - globalStart], index: i, skeleton: false });
				} else if (hasSkeleton) {
					this.renderedItems.push({ data: null, index: i, skeleton: true });
				}
			}
		} else {
			for (let i: number = startIndex; i < endIndex; i++) {
				if (i < items.length) {
					this.renderedItems.push({ data: items[i], index: i, skeleton: false });
				} else if (hasSkeleton) {
					this.renderedItems.push({ data: null, index: i, skeleton: true });
				}
			}
		}
	}

	#updateSpacers(): void {
		if (this.renderedItems.length === 0) {
			this.columnOffsetCells = [];
			this.topSpacerHeight = this.#layout.totalContentHeight;
			this.bottomSpacerHeight = 0;
			return;
		}

		const firstIndex: number = this.renderedItems[0].index;
		const lastIndex: number = this.renderedItems[this.renderedItems.length - 1].index;

		const firstRow: number = Math.floor(firstIndex / this.#layout.columnCount);
		const lastRow: number = Math.floor(lastIndex / this.#layout.columnCount);

		const columnOffset: number = firstIndex % this.#layout.columnCount;
		this.columnOffsetCells = columnOffset > 0 ? new Array(columnOffset) : [];

		this.topSpacerHeight = firstRow * this.#layout.rowHeight;
		const rowsBelow: number = this.#layout.totalRows - (lastRow + 1);
		this.bottomSpacerHeight = Math.max(0, rowsBelow * this.#layout.rowHeight);
	}

	#setupListeners(): void {
		if (this.#listenersAttached) {
			return;
		}

		this.#listenersAttached = true;

		this.#ngZone.runOutsideAngular(() => {
			this.#boundOnScroll = this.#onScroll.bind(this);
			const scrollTarget: HTMLElement | Window = this.scrollParent() || window;
			scrollTarget.addEventListener('scroll', this.#boundOnScroll, { passive: true });

			this.#resizeObserver = new ResizeObserver(() => this.#onResize());
			this.#resizeObserver.observe(this.#hostEl);
		});
	}

	#removeListeners(): void {
		if (this.#boundOnScroll) {
			const scrollTarget: HTMLElement | Window = this.scrollParent() || window;
			scrollTarget.removeEventListener('scroll', this.#boundOnScroll);
			this.#boundOnScroll = null;
		}

		if (this.#resizeObserver) {
			this.#resizeObserver.disconnect();
			this.#resizeObserver = null;
		}

		this.#listenersAttached = false;
	}

	#onScroll(): void {
		const viewportHeight: number = this.#getViewportHeight();
		const scrollIntoComponent: number = this.#getScrollIntoComponent();

		const newRange: VisibleRange = calculateVisibleRange(
			scrollIntoComponent,
			viewportHeight,
			this.#layout.rowHeight,
			this.#layout.totalRows,
			this.bufferSize(),
			this.#layout.columnCount,
			this.#effectiveTotalItems(),
		);

		this.#applyRangeUpdate(newRange);
		this.#checkLoadMore(scrollIntoComponent, viewportHeight);
		this.#checkPageNeeded(scrollIntoComponent, viewportHeight);
	}

	#applyRangeUpdate(newRange: VisibleRange): void {
		const rangeChanged: boolean =
			newRange.startRow !== this.#currentRange.startRow ||
			newRange.endRow !== this.#currentRange.endRow;

		if (!rangeChanged) {
			return;
		}

		this.#ngZone.run(() => {
			this.#currentRange = newRange;
			this.#updateRenderedItems();
			this.#updateSpacers();
			this.#changeDetectorRef.markForCheck();
		});
	}

	#checkLoadMore(scrollIntoComponent: number, viewportHeight: number): void {
		const result = checkLoadMore(
			scrollIntoComponent,
			viewportHeight,
			this.#layout.totalContentHeight,
			this.loading(),
			this.loadMoreThreshold(),
			this.#loadMoreState,
		);

		this.#loadMoreState = result.state;

		if (result.shouldEmit) {
			this.#ngZone.run(() => this.loadMore.emit());
		}
	}

	#checkPageNeeded(scrollIntoComponent: number, viewportHeight: number): void {
		const pageSizeValue: number = this.pageSize();

		if (pageSizeValue <= 0) {
			return;
		}

		const effectiveTotal: number = this.#effectiveTotalItems();
		const maxKnownPage: number = Math.max(0, Math.ceil(effectiveTotal / pageSizeValue) - 1);

		// Viewport center → pageChanged (for display/URL)
		const midpoint: number = scrollIntoComponent + viewportHeight / 2;
		const midpointRow: number = Math.floor(midpoint / this.#layout.rowHeight);
		const midpointIndex: number = midpointRow * this.#layout.columnCount;
		const centerPage: number = Math.max(0, Math.min(Math.floor(midpointIndex / pageSizeValue), maxKnownPage));

		if (centerPage !== this.#lastEmittedPageChanged) {
			this.#lastEmittedPageChanged = centerPage;
			this.#ngZone.run(() => this.pageChanged.emit(centerPage));
		}

		// Viewport top edge → pageNeeded (for loading earlier pages when scrolling up)
		const pageValue: number = this.page();

		if (pageValue <= 0) {
			return;
		}

		const globalStart: number = pageValue * pageSizeValue;
		const topRow: number = Math.floor(scrollIntoComponent / this.#layout.rowHeight);
		const topIndex: number = Math.max(0, topRow * this.#layout.columnCount);

		if (topIndex > globalStart + pageSizeValue) {
			return;
		}

		const neededPage: number = pageValue - 1;

		if (neededPage === this.#lastEmittedPageNeeded) {
			return;
		}

		this.#lastEmittedPageNeeded = neededPage;
		this.#ngZone.run(() => this.pageNeeded.emit(neededPage));
	}

	#onResize(): void {
		if (!this.#measured) {
			return;
		}

		this.#columnCount = this.#getColumnCountFromCSS();
		this.#measureRowHeight();

		this.#ngZone.run(() => {
			this.#recalculateLayout();
		});
	}

	#getScrollIntoComponent(): number {
		const hostRect: DOMRect = this.#hostEl.getBoundingClientRect();
		const parent: HTMLElement | null = this.scrollParent();

		if (parent) {
			return Math.max(0, parent.getBoundingClientRect().top - hostRect.top);
		}

		return Math.max(0, -hostRect.top);
	}

	#getHostOffsetInScroller(): number {
		const hostRect: DOMRect = this.#hostEl.getBoundingClientRect();
		const parent: HTMLElement | null = this.scrollParent();

		if (parent) {
			return hostRect.top - parent.getBoundingClientRect().top + parent.scrollTop;
		}

		return hostRect.top + (window.scrollY || document.documentElement.scrollTop);
	}

	#getScrollTop(): number {
		const parent: HTMLElement | null = this.scrollParent();
		if (parent) {
			return parent.scrollTop;
		}

		return window.scrollY || document.documentElement.scrollTop;
	}

	#setScrollTop(value: number): void {
		const parent: HTMLElement | null = this.scrollParent();
		if (parent) {
			parent.scrollTop = value;
			return;
		}

		window.scrollTo({ top: value });
	}

	#getViewportHeight(): number {
		const parent: HTMLElement | null = this.scrollParent();
		if (parent) {
			return parent.clientHeight;
		}

		return window.innerHeight;
	}
}
