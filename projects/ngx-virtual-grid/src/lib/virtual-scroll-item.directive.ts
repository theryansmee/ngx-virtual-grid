import { Directive, TemplateRef, inject } from '@angular/core';

@Directive({
	selector: '[ngxVirtualGridItem]',
})
export class VirtualGridItemDirective {
	public readonly templateRef: TemplateRef<unknown> = inject(TemplateRef);
}
