import { Directive, TemplateRef } from '@angular/core';

@Directive({
	selector: '[ngxVirtualGridItem]',
	standalone: true,
})
export class VirtualGridItemDirective {
	constructor(public templateRef: TemplateRef<unknown>) {}
}
