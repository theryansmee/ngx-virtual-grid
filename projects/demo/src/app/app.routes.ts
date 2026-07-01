import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
		title: 'Home',
	},
	{
		path: 'demo',
		loadComponent: () => import('./pages/demo/demo.component').then(m => m.DemoComponent),
		title: 'Demo',
	},
	{
		path: 'getting-started',
		loadComponent: () => import('./pages/getting-started/getting-started.component').then(m => m.GettingStartedComponent),
		title: 'Getting Started',
	},
	{
		path: 'api',
		loadComponent: () => import('./pages/api/api.component').then(m => m.ApiComponent),
		title: 'API Reference',
	},
	{
		path: 'layouts',
		loadComponent: () => import('./pages/layouts/layouts.component').then(m => m.LayoutsComponent),
		title: 'Layouts',
	},
	{ path: '**', redirectTo: '' },
];
