import { Directive, TemplateRef } from '@angular/core';

@Directive({
    selector: '[ngxVirtualScrollItem]',
})
export class VirtualScrollItemDirective {
    constructor(public templateRef: TemplateRef<any>) {}
}
