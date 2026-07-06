import { ApplicationConfig, inject, Injectable, provideZonelessChangeDetection } from '@angular/core';
import { Title, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy, provideRouter } from '@angular/router';
import { routes } from './app.routes';

@Injectable()
class PageTitleStrategy extends TitleStrategy {
	readonly #title: Title = inject(Title);

	public override updateTitle(snapshot: RouterStateSnapshot): void {
		const pageTitle: string | undefined = this.buildTitle(snapshot);
		this.#title.setTitle(
			pageTitle ? `${pageTitle} | ngx-virtual-grid` : 'ngx-virtual-grid',
		);
	}
}

export const appConfig: ApplicationConfig = {
	providers: [
		provideZonelessChangeDetection(),
		provideClientHydration(withEventReplay()),
		provideRouter(routes),
		{ provide: TitleStrategy, useClass: PageTitleStrategy },
	],
};
