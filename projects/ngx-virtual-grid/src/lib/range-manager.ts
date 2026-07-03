import { VisibleRange } from './virtual-scroll.models';

export function calculateVisibleRange(
	scrollTop: number,
	viewportHeight: number,
	rowHeight: number,
	totalRows: number,
	bufferSize: number,
	columnCount: number,
	totalItems: number,
): VisibleRange {
	if (totalRows === 0 || rowHeight <= 0) {
		return { startRow: 0, endRow: 0, startIndex: 0, endIndex: 0 };
	}

	let startRow: number = Math.floor(scrollTop / rowHeight);
	let endRow: number = Math.ceil((scrollTop + viewportHeight) / rowHeight);

	startRow = Math.max(0, startRow - bufferSize);
	endRow = Math.min(totalRows, endRow + bufferSize);

	const startIndex: number = startRow * columnCount;
	const endIndex: number = Math.min(endRow * columnCount, totalItems);

	return { startRow, endRow, startIndex, endIndex };
}
