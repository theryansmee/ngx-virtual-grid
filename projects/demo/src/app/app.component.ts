import { Component, Signal, WritableSignal, afterNextRender, signal, viewChild } from '@angular/core';
import { NgxVirtualGridComponent, VirtualGridItemDirective, VirtualGridSkeletonDirective } from 'ngx-virtual-grid';

interface DemoItemInterface {
	id: number;
	title: string;
}

@Component({
	selector: 'app-root',
	imports: [
		NgxVirtualGridComponent,
		VirtualGridItemDirective,
		VirtualGridSkeletonDirective,
	],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class AppComponent {
	public mode: 'grid' | 'list' = 'grid';

	public items: DemoItemInterface[] = [];

	public readonly codeSnippet: string = `import { NgxVirtualGridComponent, VirtualGridItemDirective } from '@theryansmee/ngx-virtual-grid';

@Component({
  imports: [NgxVirtualGridComponent, VirtualGridItemDirective],
  template: \`
    <ngx-virtual-grid [items]="items" (loadMore)="onLoadMore()">
      <ng-template ngxVirtualGridItem let-item>
        {{ item.name }}
      </ng-template>
    </ngx-virtual-grid>
  \`,
  styles: \`ngx-virtual-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }\`,
})`;

	// pagination demo state is signal-based: the app is zoneless, so the fake
	// API's async updates must be signal writes to schedule a render.
	public readonly paginatedItems: WritableSignal<DemoItemInterface[]> = signal<DemoItemInterface[]>([]);

	public readonly paginationLoading: WritableSignal<boolean> = signal<boolean>(true);

	public readonly firstLoadedPage: WritableSignal<number> = signal<number>(0);

	public readonly viewingPage: WritableSignal<number> = signal<number>(0);

	public readonly pageSize: number = 50;

	public readonly paginationSnippet: string = `<ngx-virtual-grid
  [items]="items"
  [page]="firstLoadedPage"
  [pageSize]="50"
  [loading]="isLoading"
  (loadMore)="appendNextPage()"
  (pageNeeded)="prependPagesDownTo($event)"
  (pageChanged)="updateUrl($event)">

  <ng-template ngxVirtualGridItem let-item>
    {{ item.name }}
  </ng-template>

  <ng-template ngxVirtualGridSkeleton>
    <div class="my-skeleton"></div>
  </ng-template>
</ngx-virtual-grid>`;

	private readonly paginatedGrid: Signal<NgxVirtualGridComponent | undefined> = viewChild<NgxVirtualGridComponent>('paginatedGrid');

	#nextId: number = 0;

	#lastLoadedPage: number = -1;

	#loadedPages: Set<number> = new Set();

	// page we still need to scroll to once its data has loaded. also suppresses
	// the pagination handlers until the user is positioned.
	#pendingScrollPage: number | null = null;

	readonly #maxFakeItems: number = 100_000;

	constructor() {
		this.#loadItems(200);

		// the page is prerendered - query params and scrolling only exist in the
		// browser, so the pagination demo initialises after first render.
		afterNextRender(() => {
			const pageParam: string | null = new URLSearchParams(window.location.search).get('page');
			const parsedPage: number = parseInt(pageParam ?? '', 10);
			this.#initialiseForPage(!isNaN(parsedPage) && parsedPage >= 0 ? parsedPage : 0);
		});
	}

	public onLoadMore(): void {
		this.#loadItems(50);
	}

	public onPaginationLoadMore(): void {
		if (this.#pendingScrollPage !== null) {
			return;
		}

		const nextPage: number = this.#lastLoadedPage + 1;

		if (nextPage > this.#maxPage) {
			return;
		}

		this.#simulateLoad(() => {
			this.#appendPage(nextPage);
		});
	}

	public onPageNeeded(page: number): void {
		if (this.#pendingScrollPage !== null || this.#loadedPages.has(page)) {
			return;
		}

		this.#simulateLoad(() => {
			this.#loadPagesDownTo(page);
		});
	}

	public onPageChanged(page: number): void {
		if (this.#pendingScrollPage !== null) {
			return;
		}

		this.viewingPage.set(page);

		const url: URL = new URL(window.location.href);

		if (page <= 0) {
			url.searchParams.delete('page');
		} else {
			url.searchParams.set('page', String(page));
		}

		history.replaceState({}, '', url.toString());
	}

	get #maxPage(): number {
		return Math.max(0, Math.ceil(this.#maxFakeItems / this.pageSize) - 1);
	}

	#loadItems(count: number): void {
		const newItems: DemoItemInterface[] = [];

		for (let i: number = 0; i < count; i++) {
			newItems.push({
				id: this.#nextId,
				title: `Item ${this.#nextId}`,
			});
			this.#nextId++;
		}

		this.items = [
			...this.items,
			...newItems,
		];
	}

	#initialiseForPage(page: number): void {
		this.viewingPage.set(page);
		this.#pendingScrollPage = page;

		this.#simulateLoad(() => {
			if (page > 0) {
				this.#appendPage(page - 1);
			}

			this.#appendPage(page);
			this.#scrollToPendingPage();
		});
	}

	// runs AFTER the target page's data has loaded. scrolling any earlier would
	// position against the small skeleton-only layout, then the layout inflates
	// when data arrives and the viewport ends up nowhere near the target page.
	#scrollToPendingPage(): void {
		setTimeout(() => {
			const targetPage: number | null = this.#pendingScrollPage;

			if (targetPage === null) {
				return;
			}

			const grid: NgxVirtualGridComponent | undefined = this.paginatedGrid();

			if (!grid) {
				this.#scrollToPendingPage();
				return;
			}

			if (targetPage > 0) {
				grid.scrollToPage(targetPage);
			} else {
				grid.scrollToOffset(0);
			}

			this.#pendingScrollPage = null;
		});
	}

	#simulateLoad(loadFn: () => void): void {
		this.paginationLoading.set(true);

		setTimeout(() => {
			loadFn();
			this.paginationLoading.set(false);
		}, 600);
	}

	#loadPagesDownTo(targetPage: number): void {
		const clampedTarget: number = Math.max(0, targetPage);

		for (let page: number = this.firstLoadedPage() - 1; page >= clampedTarget; page--) {
			this.#prependPage(page);
		}
	}

	#appendPage(page: number): void {
		if (this.#loadedPages.has(page)) {
			return;
		}

		this.#loadedPages.add(page);

		const pageItems: DemoItemInterface[] = this.#generatePageItems(page);

		if (this.paginatedItems().length === 0) {
			this.firstLoadedPage.set(page);
		}

		this.#lastLoadedPage = Math.max(this.#lastLoadedPage, page);
		this.paginatedItems.update((currentItems: DemoItemInterface[]) => [
			...currentItems,
			...pageItems,
		]);
	}

	#prependPage(page: number): void {
		if (this.#loadedPages.has(page)) {
			return;
		}

		this.#loadedPages.add(page);

		const pageItems: DemoItemInterface[] = this.#generatePageItems(page);
		this.firstLoadedPage.set(page);
		this.paginatedItems.update((currentItems: DemoItemInterface[]) => [
			...pageItems,
			...currentItems,
		]);
	}

	#generatePageItems(page: number): DemoItemInterface[] {
		const start: number = page * this.pageSize;
		const end: number = Math.min(start + this.pageSize, this.#maxFakeItems);
		const items: DemoItemInterface[] = [];

		for (let i: number = start; i < end; i++) {
			items.push({
				id: i,
				title: `Item ${i}`,
			});
		}

		return items;
	}
}
