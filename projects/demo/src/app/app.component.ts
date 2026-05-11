import { Component } from '@angular/core';

interface DemoItem {
    id: number;
    title: string;
    color: string;
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    items: DemoItem[] = [];

    private nextId = 0;
    private readonly colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

    constructor() {
        this.loadItems(200);
    }

    trackById(_index: number, item: DemoItem): number {
        return item.id;
    }

    onLoadMore(): void {
        this.loadItems(50);
    }

    private loadItems(count: number): void {
        const newItems: DemoItem[] = [];
        for (let i = 0; i < count; i++) {
            newItems.push({
                id: this.nextId,
                title: `Item ${this.nextId}`,
                color: this.colors[this.nextId % this.colors.length],
            });
            this.nextId++;
        }
        this.items = [...this.items, ...newItems];
    }
}
