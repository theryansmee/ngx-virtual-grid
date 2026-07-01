import { Component } from '@angular/core';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss'],
})
export class AppComponent {
	public menuOpen: boolean = false;

	public closeMenu(): void {
		this.menuOpen = false;
	}
}
