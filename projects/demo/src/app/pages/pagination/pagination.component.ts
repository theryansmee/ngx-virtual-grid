import { Component, afterNextRender, inject, viewChild, Signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
	public layout: 'grid' | 'list' = 'grid';

	public displayPage: number = 0;

	public firstLoadedPage: number = 0;

	public items: DemoItem[] = [];

	public isLoading: boolean = true;

	public readonly pageSize: number = 50;

	readonly #maxFakeItems: number = 100_000;

	private readonly paginatedGrid: Signal<NgxVirtualGridComponent | undefined> = viewChild<NgxVirtualGridComponent>('paginatedGrid');

	readonly #route: ActivatedRoute = inject(ActivatedRoute);

	readonly #router: Router = inject(Router);

	#lastLoadedPage: number = -1;

	#loadedPages: Set<number> = new Set();

	constructor() {
		const pageParam: string | null = this.#route.snapshot.queryParamMap.get('page');
		const parsedPage: number = pageParam !== null ? parseInt(pageParam, 10) : NaN;

		if (!isNaN(parsedPage) && parsedPage >= 0) {
			this.displayPage = parsedPage;
		}

		if (this.displayPage > 0) {
			this.#simulateLoad(() => {
				this.#appendPage(this.displayPage - 1);
				this.#appendPage(this.displayPage);
			});
		} else {
			this.#simulateLoad(() => {
				this.#appendPage(0);
			});
		}

		if (this.displayPage > 0) {
			afterNextRender(() => {
				setTimeout(() => this.paginatedGrid()?.scrollToPage(this.displayPage));
			});
		}
	}

	get #maxPage(): number {
		return Math.max(0, Math.ceil(this.#maxFakeItems / this.pageSize) - 1);
	}

	public onLayoutChange(newLayout: 'grid' | 'list'): void {
		this.layout = newLayout;
	}

	public onPageChanged(page: number): void {
		this.displayPage = page;

		if (page <= 0) {
			this.#removePageParam();
			return;
		}

		this.#updatePageParam(page);
	}

	public onLoadMore(): void {
		const nextPage: number = this.#lastLoadedPage + 1;

		if (nextPage > this.#maxPage) {
			return;
		}

		this.#simulateLoad(() => {
			this.#appendPage(nextPage);
		});
	}

	public onPageNeeded(page: number): void {
		if (this.#loadedPages.has(page)) {
			return;
		}

		this.#simulateLoad(() => {
			this.#loadPagesDownTo(page);
		});
	}

	#simulateLoad(loadFn: () => void): void {
		this.isLoading = true;

		setTimeout(() => {
			loadFn();
			this.isLoading = false;
		}, 600);
	}

	#loadPagesDownTo(targetPage: number): void {
		const clampedTarget: number = Math.max(0, targetPage);

		for (let page: number = this.firstLoadedPage - 1; page >= clampedTarget; page--) {
			this.#prependPage(page);
		}
	}

	#appendPage(page: number): void {
		if (this.#loadedPages.has(page)) {
			return;
		}

		this.#loadedPages.add(page);

		const pageItems: DemoItem[] = this.#generatePageItems(page);

		if (this.items.length === 0) {
			this.firstLoadedPage = page;
		}

		this.#lastLoadedPage = Math.max(this.#lastLoadedPage, page);
		this.items = [
			...this.items,
			...pageItems,
		];
	}

	#prependPage(page: number): void {
		if (this.#loadedPages.has(page)) {
			return;
		}

		this.#loadedPages.add(page);

		const pageItems: DemoItem[] = this.#generatePageItems(page);
		this.firstLoadedPage = page;
		this.items = [
			...pageItems,
			...this.items,
		];
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
