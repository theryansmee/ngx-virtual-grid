import { Routes } from '@angular/router';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/home/home.component').then(module => module.HomeComponent),
		title: 'Home',
	},
	{
		path: 'demo',
		loadComponent: () => import('./pages/demo/demo.component').then(module => module.DemoComponent),
		title: 'Demo',
	},
	{
		path: 'getting-started',
		loadComponent: () => import('./pages/getting-started/getting-started.component').then(module => module.GettingStartedComponent),
		title: 'Getting Started',
	},
	{
		path: 'api',
		loadComponent: () => import('./pages/api/api.component').then(module => module.ApiComponent),
		title: 'API Reference',
	},
	{
		path: 'layouts',
		loadComponent: () => import('./pages/layouts/layouts.component').then(module => module.LayoutsComponent),
		title: 'Layouts',
	},
	{
		path: '**',
		redirectTo: '',
	},
];
