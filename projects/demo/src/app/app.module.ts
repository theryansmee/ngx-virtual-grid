import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { NgxVirtualGridModule } from 'ngx-virtual-grid';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { DemoComponent } from './pages/demo/demo.component';
import { GettingStartedComponent } from './pages/getting-started/getting-started.component';
import { ApiComponent } from './pages/api/api.component';
import { LayoutsComponent } from './pages/layouts/layouts.component';

const routes: Routes = [
	{ path: '', component: HomeComponent, title: 'Home' },
	{ path: 'demo', component: DemoComponent, title: 'Demo' },
	{ path: 'getting-started', component: GettingStartedComponent, title: 'Getting Started' },
	{ path: 'api', component: ApiComponent, title: 'API Reference' },
	{ path: 'layouts', component: LayoutsComponent, title: 'Layouts' },
	{ path: '**', redirectTo: '' },
];

@NgModule({
	declarations: [
		AppComponent,
		HomeComponent,
		DemoComponent,
		GettingStartedComponent,
		ApiComponent,
		LayoutsComponent,
	],
	imports: [
		BrowserModule,
		RouterModule.forRoot(routes),
		NgxVirtualGridModule,
	],
	bootstrap: [AppComponent],
})
export class AppModule {}
