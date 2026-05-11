import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxVirtualGridModule } from 'ngx-virtual-grid';
import { AppComponent } from './app.component';

@NgModule({
	declarations: [AppComponent],
	imports: [BrowserModule, NgxVirtualGridModule],
	bootstrap: [AppComponent],
})
export class AppModule {}
