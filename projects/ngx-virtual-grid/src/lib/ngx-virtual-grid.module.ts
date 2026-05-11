import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxVirtualGridComponent } from './virtual-scroll.component';
import { VirtualGridItemDirective } from './virtual-scroll-item.directive';

@NgModule({
	declarations: [
		NgxVirtualGridComponent,
		VirtualGridItemDirective,
	],
	imports: [CommonModule],
	exports: [
		NgxVirtualGridComponent,
		VirtualGridItemDirective,
	],
})
export class NgxVirtualGridModule {}
