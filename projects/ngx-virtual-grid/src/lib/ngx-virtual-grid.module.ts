import { NgModule } from '@angular/core';
import { NgxVirtualGridComponent } from './virtual-scroll.component';
import { VirtualGridItemDirective } from './virtual-scroll-item.directive';

/** @deprecated Import NgxVirtualGridComponent and VirtualGridItemDirective directly. */
@NgModule({
	imports: [
		NgxVirtualGridComponent,
		VirtualGridItemDirective,
	],
	exports: [
		NgxVirtualGridComponent,
		VirtualGridItemDirective,
	],
})
export class NgxVirtualGridModule {}
