import { GridLayoutInterface } from './virtual-scroll.models';

export function calculateGridLayout(
	columnCount: number,
	rowHeight: number,
	itemHeight: number,
	totalItems: number,
): GridLayoutInterface {
	if (columnCount <= 0 || rowHeight <= 0 || totalItems === 0) {
		return { columnCount: Math.max(1, columnCount), rowHeight, totalRows: 0, totalContentHeight: 0 };
	}

	const totalRows: number = Math.ceil(totalItems / columnCount);
	const totalContentHeight: number = totalRows > 0
		? (totalRows - 1) * rowHeight + itemHeight
		: 0;

	return { columnCount, rowHeight, totalRows, totalContentHeight };
}
