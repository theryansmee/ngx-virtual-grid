import { calculateGridLayout } from './grid-layout-calculator';

describe('calculateGridLayout', () => {
	it('should return empty layout for zero items', () => {
		const result = calculateGridLayout(1000, 200, 100, 10, 0);
		expect(result.totalRows).toBe(0);
		expect(result.totalContentHeight).toBe(0);
	});

	it('should return 1 column when container equals card width', () => {
		const result = calculateGridLayout(200, 200, 100, 0, 10);
		expect(result.columnCount).toBe(1);
		expect(result.totalRows).toBe(10);
	});

	it('should calculate correct column count without gap', () => {
		const result = calculateGridLayout(600, 200, 100, 0, 10);
		expect(result.columnCount).toBe(3);
		expect(result.totalRows).toBe(4); // ceil(10/3) = 4
	});

	it('should calculate correct column count with gap', () => {
		// Container: 630px, cards: 200px, gap: 10px
		// (630 + 10) / (200 + 10) = 640 / 210 = 3.04 -> 3 columns
		const result = calculateGridLayout(630, 200, 100, 10, 10);
		expect(result.columnCount).toBe(3);
	});

	it('should account for gap in rowHeight', () => {
		const result = calculateGridLayout(600, 200, 100, 20, 6);
		expect(result.rowHeight).toBe(120); // 100 + 20
	});

	it('should not include trailing gap in totalContentHeight', () => {
		// (600 + 20) / (200 + 20) = 620/220 = 2.81 -> 2 columns
		// 6 items / 2 cols = 3 rows
		// rowHeight = 100 + 20 = 120
		// totalContentHeight = 3 * 120 - 20 = 340
		const result = calculateGridLayout(600, 200, 100, 20, 6);
		expect(result.columnCount).toBe(2);
		expect(result.totalContentHeight).toBe(340);
	});

	it('should handle single item', () => {
		// (600 + 10) / (200 + 10) = 610/210 = 2.9 -> 2 columns
		const result = calculateGridLayout(600, 200, 100, 10, 1);
		expect(result.columnCount).toBe(2);
		expect(result.totalRows).toBe(1);
		expect(result.totalContentHeight).toBe(100); // 1 row * 110 - 10 = 100
	});

	it('should clamp to 1 column when container is smaller than card', () => {
		const result = calculateGridLayout(100, 200, 100, 0, 5);
		expect(result.columnCount).toBe(1);
		expect(result.totalRows).toBe(5);
	});

	it('should handle zero gap', () => {
		const result = calculateGridLayout(400, 200, 150, 0, 8);
		expect(result.columnCount).toBe(2);
		expect(result.rowHeight).toBe(150);
		expect(result.totalRows).toBe(4);
		expect(result.totalContentHeight).toBe(600); // 4 * 150 - 0
	});

	it('should handle zero container width gracefully', () => {
		const result = calculateGridLayout(0, 200, 100, 10, 5);
		expect(result.columnCount).toBe(1);
		expect(result.totalRows).toBe(0);
	});

	it('should handle zero card dimensions gracefully', () => {
		const result = calculateGridLayout(600, 0, 100, 10, 5);
		expect(result.totalRows).toBe(0);
	});

	it('should calculate correct layout for large item counts', () => {
		const result = calculateGridLayout(1200, 200, 150, 20, 10000);
		// (1200 + 20) / (200 + 20) = 1220 / 220 = 5.54 -> 5 columns
		expect(result.columnCount).toBe(5);
		expect(result.totalRows).toBe(2000); // ceil(10000/5)
		expect(result.rowHeight).toBe(170); // 150 + 20
		expect(result.totalContentHeight).toBe(2000 * 170 - 20);
	});
});
