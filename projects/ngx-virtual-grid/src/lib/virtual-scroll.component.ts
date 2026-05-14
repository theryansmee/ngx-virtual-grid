import {
	Component,
	DestroyRef,
	ElementRef,
	InputSignal,
	NgZone,
	ChangeDetectionStrategy,
	OutputEmitterRef,
	Signal,
	TemplateRef,
	WritableSignal,
	afterNextRender,
	input,
	output,
	contentChild,
	inject,
	effect,
	signal,
	linkedSignal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { VirtualGridItemDirective } from './virtual-scroll-item.directive';
import { calculateGridLayout } from './grid-layout-calculator';
import { calculateVisibleRange } from './range-manager';
import { GridLayout, VisibleRange, RenderedItem } from './virtual-scroll.models';

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

	public readonly loadMore: OutputEmitterRef<void> = output<void>();

	public readonly itemDirective: Signal<VirtualGridItemDirective | undefined> = contentChild(VirtualGridItemDirective);

	public readonly renderedItems: WritableSignal<RenderedItem[]> = signal<RenderedItem[]>([]);

	public readonly topSpacerHeight: WritableSignal<number> = signal<number>(0);

	public readonly bottomSpacerHeight: WritableSignal<number> = signal<number>(0);

	readonly #ngZone: NgZone = inject(NgZone);

	readonly #hostEl: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;

	readonly #destroyRef: DestroyRef = inject(DestroyRef);

	// Reset loadMoreFired when items count changes
	readonly #loadMoreFired: WritableSignal<boolean> = linkedSignal({
		source: () => this.items().length,
		computation: () => false,
	});

	#columnCount: number = 0;

	#rowHeight: number = 0;

	#itemHeight: number = 0;

	#measured: boolean = false;

	#layout: GridLayout = { columnCount: 1, rowHeight: 0, totalRows: 0, totalContentHeight: 0 };

	#currentRange: VisibleRange = { startRow: 0, endRow: 0, startIndex: 0, endIndex: 0 };

	#resizeObserver: ResizeObserver | null = null;

	#boundOnScroll: (() => void) | null = null;

	#listenersAttached: boolean = false;

	public get itemTemplate(): TemplateRef<unknown> | null {
		return this.itemDirective()?.templateRef ?? null;
	}

	constructor() {
		// Handles the synchronous-items case (items available at first render)
		afterNextRender(() => {
			if (this.items().length > 0) {
				this.#measureAndInit();
			}
		});

		// Handles the async-items case (items arriving after init) and subsequent changes.
		// Reading itemDirective() creates a dependency so the effect re-runs when
		// the content child becomes available.
		effect(() => {
			const newItems: unknown[] = this.items();
			const directive: VirtualGridItemDirective | undefined = this.itemDirective();
			this.#handleItemsChange(newItems, directive);
		});

		this.#destroyRef.onDestroy(() => this.#removeListeners());
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

		if (this.items().length === 0) {
			return;
		}

		this.#measureAndInit();
	}

	#handleItemsChange(newItems: unknown[], directive: VirtualGridItemDirective | undefined): void {
		if (!this.#measured && newItems.length > 0 && directive) {
			this.#measureAndInit();
			return;
		}

		if (this.#measured) {
			this.#recalculateLayout();
		}
	}

	#measureAndInit(): void {
		if (!this.itemDirective()) {
			return;
		}

		// Read column count from the actual CSS Grid computed style
		this.#columnCount = this.#getColumnCountFromCSS();

		// Render enough items for measurement (at least 2 rows)
		const items: unknown[] = this.items();
		const measureBatchSize: number = Math.min(items.length, this.#columnCount * 3);
		const measureItems: RenderedItem[] = [];
		for (let i: number = 0; i < measureBatchSize; i++) {
			measureItems.push({ data: items[i], index: i });
		}
		this.renderedItems.set(measureItems);

		// Force synchronous layout so we can measure
		void this.#hostEl.offsetHeight;

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
			this.items().length,
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
			this.bufferSize(),
			this.#layout.columnCount,
			this.items().length,
		);

		this.#updateRenderedItems();
		this.#updateSpacers();
	}

	#updateRenderedItems(): void {
		const { startIndex, endIndex } = this.#currentRange;
		const items: unknown[] = this.items();
		const newRendered: RenderedItem[] = [];

		for (let i: number = startIndex; i < endIndex; i++) {
			newRendered.push({ data: items[i], index: i });
		}

		this.renderedItems.set(newRendered);
	}

	#updateSpacers(): void {
		const { startRow, endRow } = this.#currentRange;
		this.topSpacerHeight.set(startRow * this.#layout.rowHeight);
		const rowsBelow: number = this.#layout.totalRows - endRow;
		this.bottomSpacerHeight.set(Math.max(0, rowsBelow * this.#layout.rowHeight));
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
		const hostRect: DOMRect = this.#hostEl.getBoundingClientRect();
		const scrollIntoComponent: number = Math.max(0, -hostRect.top);

		const newRange: VisibleRange = calculateVisibleRange(
			scrollIntoComponent,
			viewportHeight,
			this.#layout.rowHeight,
			this.#layout.totalRows,
			this.bufferSize(),
			this.#layout.columnCount,
			this.items().length,
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
		});
	}

	#checkLoadMore(scrollIntoComponent: number, viewportHeight: number): void {
		if (this.#loadMoreFired()) {
			return;
		}

		if (this.#layout.totalContentHeight <= 0) {
			return;
		}

		const scrolledInto: number = scrollIntoComponent + viewportHeight;
		const scrollRatio: number = scrolledInto / this.#layout.totalContentHeight;

		if (scrollRatio < this.loadMoreThreshold()) {
			return;
		}

		this.#loadMoreFired.set(true);
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
