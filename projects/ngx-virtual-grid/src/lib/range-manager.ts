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

	let startRow = Math.floor(scrollTop / rowHeight);
	let endRow = Math.ceil((scrollTop + viewportHeight) / rowHeight);

	// Apply buffer
	startRow = Math.max(0, startRow - bufferSize);
	endRow = Math.min(totalRows, endRow + bufferSize);

	const startIndex = startRow * columnCount;
	const endIndex = Math.min(endRow * columnCount, totalItems);

	return { startRow, endRow, startIndex, endIndex };
}
