import { Directive, TemplateRef } from '@angular/core';

@Directive({
	selector: '[ngxVirtualGridItem]',
})
export class VirtualGridItemDirective {
	constructor(public templateRef: TemplateRef<unknown>) {}
}
