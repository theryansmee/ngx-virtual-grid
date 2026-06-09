export interface GridLayoutInterface {
	columnCount: number;
	rowHeight: number;
	totalRows: number;
	totalContentHeight: number;
}

export interface VisibleRangeInterface {
	startRow: number;
	endRow: number;
	startIndex: number;
	endIndex: number;
}

export interface RenderedItemInterface<T = unknown> {
	data: T;
	index: number;
}
