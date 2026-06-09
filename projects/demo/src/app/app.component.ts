import { Component } from '@angular/core';
import { NgxVirtualGridComponent, VirtualGridItemDirective } from 'ngx-virtual-grid';

interface DemoItemInterface {
	id: number;
	title: string;
}

@Component({
	selector: 'app-root',
	imports: [
		NgxVirtualGridComponent,
		VirtualGridItemDirective,
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

	#nextId: number = 0;

	constructor() {
		this.#loadItems(200);
	}

	public onLoadMore(): void {
		this.#loadItems(50);
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
}
