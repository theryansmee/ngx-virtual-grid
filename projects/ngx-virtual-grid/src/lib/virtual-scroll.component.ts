import {
	Component,
	Input,
	Output,
	EventEmitter,
	ContentChild,
	ElementRef,
	NgZone,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	AfterViewInit,
	OnChanges,
	OnDestroy,
	SimpleChanges,
	TrackByFunction,
	Inject,
	PLATFORM_ID,
	TemplateRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { VirtualGridItemDirective } from './virtual-scroll-item.directive';
import { calculateGridLayout } from './grid-layout-calculator';
import { calculateVisibleRange } from './range-manager';
import { GridLayout, VisibleRange, RenderedItem } from './virtual-scroll.models';

@Component({
	selector: 'ngx-virtual-grid',
	templateUrl: './virtual-scroll.component.html',
	styleUrls: ['./virtual-scroll.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxVirtualGridComponent implements AfterViewInit, OnChanges, OnDestroy {
	@Input()
	public items: unknown[] = [];

	@Input()
	public bufferSize: number = 3;

	@Input()
	public trackBy: TrackByFunction<unknown> | null = null;

	@Input()
	public loadMoreThreshold: number = 0.8;

	@Input()
	public scrollParent: HTMLElement | null = null;

	@Output()
	public loadMore: EventEmitter<void> = new EventEmitter<void>();

	@ContentChild(VirtualGridItemDirective)
	public itemDirective!: VirtualGridItemDirective;

	public renderedItems: RenderedItem[] = [];

	public topSpacerHeight: number = 0;

	public bottomSpacerHeight: number = 0;

	#ngZone: NgZone;

	#cdr: ChangeDetectorRef;

	#hostEl: HTMLElement;

	#columnCount: number = 0;

	#rowHeight: number = 0;

	#itemHeight: number = 0;

	#measured: boolean = false;

	#layout: GridLayout = { columnCount: 1, rowHeight: 0, totalRows: 0, totalContentHeight: 0 };

	#currentRange: VisibleRange = { startRow: 0, endRow: 0, startIndex: 0, endIndex: 0 };

	#resizeObserver: ResizeObserver | null = null;

	#isBrowser: boolean;

	#loadMoreFired: boolean = false;

	#scrolledPastEnd: boolean = false;

	#contentHeightAtLastLoad: number = 0;

	#boundOnScroll: (() => void) | null = null;

	#listenersAttached: boolean = false;

	public get itemTemplate(): TemplateRef<unknown> | null {
		return this.itemDirective?.templateRef ?? null;
	}

	constructor(
		ngZone: NgZone,
		cdr: ChangeDetectorRef,
		elRef: ElementRef<HTMLElement>,
		@Inject(PLATFORM_ID)
		platformId: object,
	) {
		this.#ngZone = ngZone;
		this.#cdr = cdr;
		this.#isBrowser = isPlatformBrowser(platformId);
		this.#hostEl = elRef.nativeElement;
	}

	public ngAfterViewInit(): void {
		if (!this.#isBrowser) {
			return;
		}

		if (this.items.length === 0) {
			return;
		}

		this.#measureAndInit();
	}

	public ngOnChanges(changes: SimpleChanges): void {
		this.#handleItemsChange(changes);
	}

	public ngOnDestroy(): void {
		this.#removeListeners();
	}

	public scrollToIndex(index: number): void {
		if (!this.#measured || this.#layout.rowHeight <= 0) {
			return;
		}

		const row: number = Math.floor(index / this.#layout.columnCount);
		const hostTop: number = this.#hostEl.getBoundingClientRect().top + this.#getScrollTop();
		const target: number = hostTop + row * this.#layout.rowHeight;
		this.#setScrollTop(target);
	}

	public scrollToOffset(px: number): void {
		const hostTop: number = this.#hostEl.getBoundingClientRect().top + this.#getScrollTop();
		this.#setScrollTop(hostTop + px);
	}

	public refresh(): void {
		this.#measured = false;

		if (this.items.length === 0) {
			return;
		}

		this.#measureAndInit();
	}

	public internalTrackBy: (_index: number, item: RenderedItem) => unknown = (_index: number, item: RenderedItem): unknown => {
		if (this.trackBy) {
			return this.trackBy(item.index, item.data);
		}

		return item.index;
	};

	#handleItemsChange(changes: SimpleChanges): void {
		if (!changes['items']) {
			return;
		}

		const newItems: unknown[] = changes['items'].currentValue as unknown[];

		if (!this.#measured && newItems.length > 0 && this.#isBrowser && this.itemDirective) {
			this.#measureAndInit();
			return;
		}

		if (this.#measured) {
			this.#recalculateLayout();
		}
	}

	#measureAndInit(): void {
		if (!this.itemDirective) {
			return;
		}

		// Read column count from the actual CSS Grid computed style
		this.#columnCount = this.#getColumnCountFromCSS();

		// Render enough items for measurement (at least 2 rows)
		const measureBatchSize: number = Math.min(this.items.length, this.#columnCount * 3);
		this.renderedItems = [];
		for (let i: number = 0; i < measureBatchSize; i++) {
			this.renderedItems.push({ data: this.items[i], index: i });
		}
		this.#cdr.detectChanges();

		// Measure row height from the rendered grid
		this.#measureRowHeight();

		if (!this.#measured) {
			return;
		}

		this.#recalculateLayout();
		this.#setupListeners();
	}

	#getColumnCountFromCSS(): number {
		const computed: string = getComputedStyle(this.#hostEl).gridTemplateColumns;
		if (!computed || computed === 'none') {
			return 1;
		}

		return computed.split(' ').filter((s: string) => s.length > 0).length;
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
			// Only one row available — use item height (no gap info)
			this.#rowHeight = this.#itemHeight;
		}

		this.#measured = this.#columnCount > 0 && this.#rowHeight > 0 && this.#itemHeight > 0;
	}

	#recalculateLayout(): void {
		this.#layout = calculateGridLayout(
			this.#columnCount,
			this.#rowHeight,
			this.#itemHeight,
			this.items.length,
		);

		this.#updateVisibleRange();
	}

	#updateVisibleRange(): void {
		const viewportHeight: number = this.#getViewportHeight();
		const hostRect: DOMRect = this.#hostEl.getBoundingClientRect();
		const scrollIntoComponent: number = Math.max(0, -hostRect.top);

		this.#currentRange = calculateVisibleRange(
			scrollIntoComponent,
			viewportHeight,
			this.#layout.rowHeight,
			this.#layout.totalRows,
			this.bufferSize,
			this.#layout.columnCount,
			this.items.length,
		);

		this.#updateRenderedItems();
		this.#updateSpacers();
		this.#cdr.markForCheck();
	}

	#updateRenderedItems(): void {
		const { startIndex, endIndex } = this.#currentRange;
		this.renderedItems = [];

		for (let i: number = startIndex; i < endIndex; i++) {
			this.renderedItems.push({ data: this.items[i], index: i });
		}
	}

	#updateSpacers(): void {
		const { startRow, endRow } = this.#currentRange;
		this.topSpacerHeight = startRow * this.#layout.rowHeight;
		const rowsBelow: number = this.#layout.totalRows - endRow;
		this.bottomSpacerHeight = Math.max(0, rowsBelow * this.#layout.rowHeight);
	}

	#setupListeners(): void {
		if (this.#listenersAttached) {
			return;
		}

		this.#listenersAttached = true;

		this.#ngZone.runOutsideAngular(() => {
			this.#boundOnScroll = this.#onScroll.bind(this);
			const scrollTarget: HTMLElement | Window = this.scrollParent || window;
			scrollTarget.addEventListener('scroll', this.#boundOnScroll, { passive: true });

			this.#resizeObserver = new ResizeObserver(() => this.#onResize());
			this.#resizeObserver.observe(this.#hostEl);
		});
	}

	#removeListeners(): void {
		if (this.#boundOnScroll) {
			const scrollTarget: HTMLElement | Window = this.scrollParent || window;
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
		const hostRect: DOMRect = this.#hostEl.getBoundingClientRect();
		const scrollIntoComponent: number = Math.max(0, -hostRect.top);

		const newRange: VisibleRange = calculateVisibleRange(
			scrollIntoComponent,
			viewportHeight,
			this.#layout.rowHeight,
			this.#layout.totalRows,
			this.bufferSize,
			this.#layout.columnCount,
			this.items.length,
		);

		this.#applyRangeUpdate(newRange);
		this.#checkLoadMore(scrollIntoComponent, viewportHeight);
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
			this.#cdr.markForCheck();
		});
	}

	#checkLoadMore(scrollIntoComponent: number, viewportHeight: number): void {
		if (this.#layout.totalContentHeight <= 0) {
			return;
		}

		const scrolledInto: number = scrollIntoComponent + viewportHeight;
		const wrapperEndVisible: boolean = scrolledInto >= this.#layout.totalContentHeight;

		if (wrapperEndVisible && this.#loadMoreFired) {
			this.#scrolledPastEnd = true;
			return;
		}

		if (this.#scrolledPastEnd && !wrapperEndVisible) {
			this.#scrolledPastEnd = false;
			this.#loadMoreFired = false;
		}

		const pageHeight: number = this.#layout.totalContentHeight - this.#contentHeightAtLastLoad;
		if (pageHeight <= 0) {
			return;
		}

		const pageScrolled: number = scrolledInto - this.#contentHeightAtLastLoad;
		const pageRatio: number = pageScrolled / pageHeight;

		if (pageRatio < this.loadMoreThreshold) {
			this.#loadMoreFired = false;
			return;
		}

		if (this.#loadMoreFired) {
			return;
		}

		this.#loadMoreFired = true;
		this.#contentHeightAtLastLoad = this.#layout.totalContentHeight;
		this.#ngZone.run(() => this.loadMore.emit());
	}

	#onResize(): void {
		if (!this.#measured) {
			return;
		}

		// Re-read column count and row height from the actual grid
		this.#columnCount = this.#getColumnCountFromCSS();
		this.#measureRowHeight();

		this.#ngZone.run(() => {
			this.#recalculateLayout();
		});
	}

	#getScrollTop(): number {
		if (this.scrollParent) {
			return this.scrollParent.scrollTop;
		}

		return window.scrollY || document.documentElement.scrollTop;
	}

	#setScrollTop(value: number): void {
		if (this.scrollParent) {
			this.scrollParent.scrollTop = value;
			return;
		}

		window.scrollTo({ top: value });
	}

	#getViewportHeight(): number {
		if (this.scrollParent) {
			return this.scrollParent.clientHeight;
		}

		return window.innerHeight;
	}
}
