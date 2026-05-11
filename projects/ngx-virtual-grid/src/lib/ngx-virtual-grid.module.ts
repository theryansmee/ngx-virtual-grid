import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxVirtualGridComponent } from './virtual-scroll.component';
import { VirtualScrollItemDirective } from './virtual-scroll-item.directive';

@NgModule({
    declarations: [NgxVirtualGridComponent, VirtualScrollItemDirective],
    imports: [CommonModule],
    exports: [NgxVirtualGridComponent, VirtualScrollItemDirective],
})
export class NgxVirtualGridModule {}
