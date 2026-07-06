import { Component, Signal, WritableSignal, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { NgxVirtualGridComponent, VirtualGridItemDirective, VirtualGridSkeletonDirective } from 'ngx-virtual-grid';

interface DemoItem {
	id: number;
	title: string;
}

@Component({
	selector: 'app-pagination',
	imports: [
		RouterLink,
		NgxVirtualGridComponent,
		VirtualGridItemDirective,
		VirtualGridSkeletonDirective,
	],
	templateUrl: './pagination.component.html',
	styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
	// signals throughout: the demo app is zoneless, so async state changes
	// (the fake API's setTimeout) must be signal writes to schedule render.
	public readonly layout: WritableSignal<'grid' | 'list'> = signal<'grid' | 'list'>('grid');

	public readonly displayPage: WritableSignal<number> = signal<number>(0);

	public readonly firstLoadedPage: WritableSignal<number> = signal<number>(0);

	public readonly items: WritableSignal<DemoItem[]> = signal<DemoItem[]>([]);

	public readonly isLoading: WritableSignal<boolean> = signal<boolean>(true);

	public readonly pageSize: number = 50;

	readonly #maxFakeItems: number = 100_000;

	private readonly paginatedGrid: Signal<NgxVirtualGridComponent | undefined> = viewChild<NgxVirtualGridComponent>('paginatedGrid');

	readonly #route: ActivatedRoute = inject(ActivatedRoute);

	readonly #router: Router = inject(Router);

	#lastLoadedPage: number = -1;

	#loadedPages: Set<number> = new Set();

	// page we still need to scroll to once its data has loaded. also suppresses
	// pageChanged/loadMore/pageNeeded handlers until the user is positioned.
	#pendingScrollPage: number | null = null;

	#initialised: boolean = false;

	constructor() {
		// subscribe (not snapshot) so clicking the ?page=500 link or editing the URL
		// re-initialises the demo. same-route navigation reuses this component
		// instance, so a constructor-only snapshot read would ignore the change.
		this.#route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params: ParamMap) => {
			const parsedPage: number = parseInt(params.get('page') ?? '', 10);
			const targetPage: number = !isNaN(parsedPage) && parsedPage >= 0 ? parsedPage : 0;

			// ignore the URL updates we write ourselves from onPageChanged
			if (this.#initialised && targetPage === this.displayPage()) {
				return;
			}

			this.#initialised = true;
			this.#initialiseForPage(targetPage);
		});
	}

	get #maxPage(): number {
		return Math.max(0, Math.ceil(this.#maxFakeItems / this.pageSize) - 1);
	}

	public onLayoutChange(newLayout: 'grid' | 'list'): void {
		this.layout.set(newLayout);
	}

	public onPageChanged(page: number): void {
		if (this.#pendingScrollPage !== null) {
			return;
		}

		this.displayPage.set(page);

		if (page <= 0) {
			this.#removePageParam();
			return;
		}

		this.#updatePageParam(page);
	}

	public onLoadMore(): void {
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

	#initialiseForPage(page: number): void {
		this.displayPage.set(page);
		this.firstLoadedPage.set(0);
		this.items.set([]);
		this.#lastLoadedPage = -1;
		this.#loadedPages = new Set();
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
				window.scrollTo({ top: 0 });
			}

			this.#pendingScrollPage = null;
		});
	}

	#simulateLoad(loadFn: () => void): void {
		this.isLoading.set(true);

		setTimeout(() => {
			loadFn();
			this.isLoading.set(false);
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

		const pageItems: DemoItem[] = this.#generatePageItems(page);

		if (this.items().length === 0) {
			this.firstLoadedPage.set(page);
		}

		this.#lastLoadedPage = Math.max(this.#lastLoadedPage, page);
		this.items.update((currentItems: DemoItem[]) => [
			...currentItems,
			...pageItems,
		]);
	}

	#prependPage(page: number): void {
		if (this.#loadedPages.has(page)) {
			return;
		}

		this.#loadedPages.add(page);

		const pageItems: DemoItem[] = this.#generatePageItems(page);
		this.firstLoadedPage.set(page);
		this.items.update((currentItems: DemoItem[]) => [
			...pageItems,
			...currentItems,
		]);
	}

	#generatePageItems(page: number): DemoItem[] {
		const start: number = page * this.pageSize;
		const end: number = Math.min(start + this.pageSize, this.#maxFakeItems);
		const items: DemoItem[] = [];

		for (let i: number = start; i < end; i++) {
			items.push({
				id: i,
				title: `Item ${i}`,
			});
		}

		return items;
	}

	#updatePageParam(page: number): void {
		this.#router.navigate([], {
			queryParams: { page },
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}

	#removePageParam(): void {
		this.#router.navigate([], {
			queryParams: { page: undefined },
			queryParamsHandling: 'merge',
			replaceUrl: true,
		});
	}
}
