import { Directive, inject, TemplateRef } from '@angular/core';

@Directive({
	selector: '[ngxVirtualGridSkeleton]',
})
export class VirtualGridSkeletonDirective {
	public readonly templateRef: TemplateRef<unknown> = inject(TemplateRef);
}
