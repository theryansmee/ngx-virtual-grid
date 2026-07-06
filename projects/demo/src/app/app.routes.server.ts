import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
	{
		path: '',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'demo',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'pagination',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'getting-started',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'api',
		renderMode: RenderMode.Prerender,
	},
	{
		path: 'layouts',
		renderMode: RenderMode.Prerender,
	},
	{
		path: '**',
		renderMode: RenderMode.Prerender,
	},
];
