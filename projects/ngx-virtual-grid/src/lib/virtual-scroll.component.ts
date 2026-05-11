import {
    Component,
    Input,
    Output,
    EventEmitter,
    ContentChild,
    ViewChild,
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
    ViewContainerRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { VirtualScrollItemDirective } from './virtual-scroll-item.directive';
import { calculateGridLayout } from './grid-layout-calculator';
import { calculateVisibleRange } from './range-manager';
import { GridLayout, VisibleRange, RenderedItem } from './virtual-scroll.models';

@Component({
    selector: 'ngx-virtual-grid',
    templateUrl: './virtual-scroll.component.html',
    styleUrls: ['./virtual-scroll.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxVirtualGridComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() items: any[] = [];
    @Input() gap = 0;
    @Input() bufferSize = 3;
    @Input() trackBy: TrackByFunction<any> | null = null;
    @Input() loadMoreThreshold = 0.8;
    @Input() scrollParent: HTMLElement | null = null;
    @Input() minItemWidth = 0;

    @Output() loadMore = new EventEmitter<void>();

    @ContentChild(VirtualScrollItemDirective) itemDirective!: VirtualScrollItemDirective;
    @ViewChild('measureContainer', { static: true, read: ViewContainerRef }) measureContainerRef!: ViewContainerRef;

    renderedItems: RenderedItem[] = [];
    columnCount = 1;
    topSpacerHeight = 0;
    bottomSpacerHeight = 0;

    private hostEl: HTMLElement;
    private cardWidth = 0;
    private cardHeight = 0;
    private measured = false;
    private layout: GridLayout = { columnCount: 1, rowHeight: 0, totalRows: 0, totalContentHeight: 0 };
    private currentRange: VisibleRange = { startRow: 0, endRow: 0, startIndex: 0, endIndex: 0 };
    private resizeObserver: ResizeObserver | null = null;
    private isBrowser: boolean;
    private loadMoreFired = false;
    private lastItemCount = 0;
    private boundOnScroll: (() => void) | null = null;
    private listenersAttached = false;

    get itemTemplate() {
        return this.itemDirective?.templateRef;
    }

    constructor(
        private ngZone: NgZone,
        private cdr: ChangeDetectorRef,
        private elRef: ElementRef<HTMLElement>,
        @Inject(PLATFORM_ID) private platformId: object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        this.hostEl = this.elRef.nativeElement;
    }

    ngAfterViewInit(): void {
        if (!this.isBrowser) { return; }
        if (this.items.length > 0) {
            this.measureAndInit();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['items']) {
            const newItems = changes['items'].currentValue as any[];

            if (newItems.length !== this.lastItemCount) {
                this.loadMoreFired = false;
                this.lastItemCount = newItems.length;
            }

            if (!this.measured && newItems.length > 0 && this.isBrowser && this.itemDirective) {
                this.measureAndInit();
            } else if (this.measured) {
                this.recalculateLayout();
            }
        }

        if (this.measured && (changes['gap'] || changes['bufferSize'])) {
            this.recalculateLayout();
        }
    }

    ngOnDestroy(): void {
        this.removeListeners();
    }

    scrollToIndex(index: number): void {
        if (!this.measured || this.layout.rowHeight <= 0) { return; }
        const row = Math.floor(index / this.layout.columnCount);
        const hostTop = this.hostEl.getBoundingClientRect().top + this.getScrollTop();
        const target = hostTop + row * this.layout.rowHeight;
        this.setScrollTop(target);
    }

    scrollToOffset(px: number): void {
        const hostTop = this.hostEl.getBoundingClientRect().top + this.getScrollTop();
        this.setScrollTop(hostTop + px);
    }

    refresh(): void {
        this.measured = false;
        if (this.items.length > 0) {
            this.measureAndInit();
        }
    }

    internalTrackBy = (_index: number, item: RenderedItem): any => {
        if (this.trackBy) {
            return this.trackBy(item.index, item.data);
        }
        return item.index;
    };

    private measureAndInit(): void {
        if (!this.itemDirective) { return; }
        this.measureCardSize();
        if (!this.measured) { return; }
        this.recalculateLayout();
        this.setupListeners();
    }

    private measureCardSize(): void {
        const templateRef = this.itemDirective.templateRef;

        const measureEl = this.measureContainerRef.element.nativeElement as HTMLElement;
        if (this.minItemWidth > 0) {
            measureEl.style.width = this.minItemWidth + 'px';
        }

        const viewRef = this.measureContainerRef.createEmbeddedView(templateRef, {
            $implicit: this.items[0],
            index: 0,
        });
        viewRef.detectChanges();

        const rootNode = viewRef.rootNodes.find(
            (node: Node) => node.nodeType === Node.ELEMENT_NODE
        ) as HTMLElement | undefined;

        if (rootNode) {
            this.cardWidth = this.minItemWidth > 0 ? this.minItemWidth : rootNode.offsetWidth;
            this.cardHeight = rootNode.offsetHeight;
            this.measured = this.cardWidth > 0 && this.cardHeight > 0;
        }

        this.measureContainerRef.clear();
        measureEl.style.width = '';
    }

    private recalculateLayout(): void {
        const containerWidth = this.hostEl.clientWidth;

        this.layout = calculateGridLayout(
            containerWidth,
            this.cardWidth,
            this.cardHeight,
            this.gap,
            this.items.length
        );
        this.columnCount = this.layout.columnCount;

        this.updateVisibleRange();
    }

    private updateVisibleRange(): void {
        const viewportHeight = this.getViewportHeight();
        const hostRect = this.hostEl.getBoundingClientRect();
        const scrollIntoComponent = Math.max(0, -hostRect.top);

        const newRange = calculateVisibleRange(
            scrollIntoComponent,
            viewportHeight,
            this.layout.rowHeight,
            this.layout.totalRows,
            this.bufferSize,
            this.layout.columnCount,
            this.items.length
        );

        this.currentRange = newRange;
        this.updateRenderedItems();
        this.updateSpacers();
        this.cdr.markForCheck();
    }

    private updateRenderedItems(): void {
        const { startIndex, endIndex } = this.currentRange;
        this.renderedItems = [];
        for (let i = startIndex; i < endIndex; i++) {
            this.renderedItems.push({ data: this.items[i], index: i });
        }
    }

    private updateSpacers(): void {
        const { startRow, endRow } = this.currentRange;
        this.topSpacerHeight = startRow * this.layout.rowHeight;
        const rowsBelow = this.layout.totalRows - endRow;
        this.bottomSpacerHeight = Math.max(0, rowsBelow * this.layout.rowHeight);
    }

    private setupListeners(): void {
        if (this.listenersAttached) { return; }
        this.listenersAttached = true;

        this.ngZone.runOutsideAngular(() => {
            this.boundOnScroll = this.onScroll.bind(this);
            const scrollTarget = this.scrollParent || window;
            scrollTarget.addEventListener('scroll', this.boundOnScroll, { passive: true });

            this.resizeObserver = new ResizeObserver(() => this.onResize());
            this.resizeObserver.observe(this.hostEl);
        });
    }

    private removeListeners(): void {
        if (this.boundOnScroll) {
            const scrollTarget = this.scrollParent || window;
            scrollTarget.removeEventListener('scroll', this.boundOnScroll);
            this.boundOnScroll = null;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.listenersAttached = false;
    }

    private onScroll(): void {
        const viewportHeight = this.getViewportHeight();
        const hostRect = this.hostEl.getBoundingClientRect();
        const scrollIntoComponent = Math.max(0, -hostRect.top);

        const newRange = calculateVisibleRange(
            scrollIntoComponent,
            viewportHeight,
            this.layout.rowHeight,
            this.layout.totalRows,
            this.bufferSize,
            this.layout.columnCount,
            this.items.length
        );

        const rangeChanged =
            newRange.startRow !== this.currentRange.startRow ||
            newRange.endRow !== this.currentRange.endRow;

        if (rangeChanged) {
            this.ngZone.run(() => {
                this.currentRange = newRange;
                this.updateRenderedItems();
                this.updateSpacers();
                this.cdr.markForCheck();
            });
        }

        if (!this.loadMoreFired && this.layout.totalContentHeight > 0) {
            const scrolledInto = scrollIntoComponent + viewportHeight;
            const scrollRatio = scrolledInto / this.layout.totalContentHeight;
            if (scrollRatio >= this.loadMoreThreshold) {
                this.loadMoreFired = true;
                this.ngZone.run(() => this.loadMore.emit());
            }
        }
    }

    private onResize(): void {
        if (!this.measured) { return; }

        const containerWidth = this.hostEl.clientWidth;

        this.layout = calculateGridLayout(
            containerWidth,
            this.cardWidth,
            this.cardHeight,
            this.gap,
            this.items.length
        );
        this.columnCount = this.layout.columnCount;

        this.ngZone.run(() => {
            this.updateVisibleRange();
        });
    }

    private getScrollTop(): number {
        if (this.scrollParent) {
            return this.scrollParent.scrollTop;
        }
        return window.scrollY || document.documentElement.scrollTop;
    }

    private setScrollTop(value: number): void {
        if (this.scrollParent) {
            this.scrollParent.scrollTop = value;
        } else {
            window.scrollTo({ top: value });
        }
    }

    private getViewportHeight(): number {
        if (this.scrollParent) {
            return this.scrollParent.clientHeight;
        }
        return window.innerHeight;
    }
}
