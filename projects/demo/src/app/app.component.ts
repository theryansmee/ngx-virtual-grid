import { Component } from '@angular/core';
import { NgxVirtualGridComponent, VirtualGridItemDirective } from 'ngx-virtual-grid';

interface DemoItem {
	id: number;
	title: string;
	color: string;
}

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [
		NgxVirtualGridComponent,
		VirtualGridItemDirective,
	],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss',
})
export class AppComponent {
	public items: DemoItem[] = [];

	#nextId: number = 0;

	readonly #colors: string[] = [
		'#e74c3c',
		'#3498db',
		'#2ecc71',
		'#f39c12',
		'#9b59b6',
		'#1abc9c',
		'#e67e22',
		'#34495e',
	];

	constructor() {
		this.#loadItems(200);
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
				color: this.#colors[this.#nextId % this.#colors.length],
			});
			this.#nextId++;
		}

		this.items = [
			...this.items,
			...newItems,
		];
	}
}
