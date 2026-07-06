import { Component } from '@angular/core';
import { NgxVirtualGridComponent, VirtualGridItemDirective } from 'ngx-virtual-grid';

interface DemoItem {
	id: number;
	title: string;
}

@Component({
	selector: 'app-demo',
	imports: [
		NgxVirtualGridComponent,
		VirtualGridItemDirective,
	],
	templateUrl: './demo.component.html',
	styleUrl: './demo.component.scss',
})
export class DemoComponent {
	public layout: 'grid' | 'list' = 'grid';

	public items: DemoItem[] = [];

	public readonly fetchSize: number = 50;

	#nextId: number = 0;

	constructor() {
		this.#loadItems(this.fetchSize);
	}

	public onLayoutChange(newLayout: 'grid' | 'list'): void {
		this.layout = newLayout;
	}

	public onLoadMore(): void {
		this.#loadItems(this.fetchSize);
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
