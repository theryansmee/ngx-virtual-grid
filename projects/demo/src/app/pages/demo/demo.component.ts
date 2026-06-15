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
	public mode: 'grid' | 'list' = 'grid';
	public items: DemoItem[] = [];

	#nextId: number = 0;

	constructor() {
		this.#loadItems(200);
	}

	public onLoadMore(): void {
		this.#loadItems(50);
	}

	#loadItems(count: number): void {
		const newItems: DemoItem[] = [];

		for (let index: number = 0; index < count; index++) {
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
