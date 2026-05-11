export interface GridLayout {
	columnCount: number;
	rowHeight: number;
	totalRows: number;
	totalContentHeight: number;
}

export interface VisibleRange {
	startRow: number;
	endRow: number;
	startIndex: number;
	endIndex: number;
}

export interface RenderedItem<T = any> {
	data: T;
	index: number;
}
