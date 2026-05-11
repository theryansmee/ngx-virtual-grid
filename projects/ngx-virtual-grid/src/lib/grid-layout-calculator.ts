import { GridLayout } from './virtual-scroll.models';

export function calculateGridLayout(
	containerWidth: number,
	cardWidth: number,
	cardHeight: number,
	gap: number,
	totalItems: number
): GridLayout {
	if (containerWidth <= 0 || cardWidth <= 0 || cardHeight <= 0 || totalItems === 0) {
		return { columnCount: 1, rowHeight: cardHeight + gap, totalRows: 0, totalContentHeight: 0 };
	}

	const columnCount = Math.max(1, Math.floor((containerWidth + gap) / (cardWidth + gap)));
	const rowHeight = cardHeight + gap;
	const totalRows = Math.ceil(totalItems / columnCount);
	const totalContentHeight = totalRows > 0 ? totalRows * rowHeight - gap : 0;

	return { columnCount, rowHeight, totalRows, totalContentHeight };
}
