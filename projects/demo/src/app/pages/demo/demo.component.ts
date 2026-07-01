import { Component } from '@angular/core';

interface DemoItem {
	id: number;
	title: string;
}

@Component({
	selector: 'app-demo',
	templateUrl: './demo.component.html',
	styleUrls: ['./demo.component.scss'],
})
export class DemoComponent {
	public mode: 'grid' | 'list' = 'grid';
	public items: DemoItem[] = [];

	#nextId: number = 0;

	constructor() {
		this.#loadItems(200);
	}

	public trackById(_index: number, item: unknown): number {
		return (item as DemoItem).id;
	}

	public onLoadMore(): void {
		this.#loadItems(50);
	}

	#loadItems(count: number): void {
		const newItems: DemoItem[] = [];

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
}
