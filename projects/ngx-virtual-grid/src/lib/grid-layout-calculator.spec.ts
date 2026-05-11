import { calculateGridLayout } from './grid-layout-calculator';

describe('calculateGridLayout', () => {

	it('should return empty layout for zero items', () => {
		const result = calculateGridLayout(4, 120, 100, 0);
		expect(result.totalRows).toBe(0);
		expect(result.totalContentHeight).toBe(0);
	});

	it('should calculate correct total rows', () => {
		const result = calculateGridLayout(3, 120, 100, 10);
		expect(result.totalRows).toBe(4); // ceil(10/3) = 4
	});

	it('should calculate totalContentHeight without trailing gap', () => {
		// 3 cols, rowHeight=120 (100 item + 20 gap), 6 items = 2 rows
		// totalContentHeight = (2 - 1) * 120 + 100 = 220
		const result = calculateGridLayout(3, 120, 100, 6);
		expect(result.totalRows).toBe(2);
		expect(result.totalContentHeight).toBe(220);
	});

	it('should handle single item', () => {
		const result = calculateGridLayout(4, 120, 100, 1);
		expect(result.totalRows).toBe(1);
		expect(result.totalContentHeight).toBe(100); // (1 - 1) * 120 + 100
	});

	it('should handle single column', () => {
		const result = calculateGridLayout(1, 150, 150, 5);
		expect(result.totalRows).toBe(5);
		expect(result.totalContentHeight).toBe(4 * 150 + 150); // (5-1)*150 + 150 = 750
	});

	it('should handle row height equal to item height (no gap)', () => {
		const result = calculateGridLayout(2, 150, 150, 8);
		expect(result.totalRows).toBe(4);
		expect(result.totalContentHeight).toBe(3 * 150 + 150); // 600
	});

	it('should pass through columnCount and rowHeight', () => {
		const result = calculateGridLayout(5, 170, 150, 100);
		expect(result.columnCount).toBe(5);
		expect(result.rowHeight).toBe(170);
		expect(result.totalRows).toBe(20); // ceil(100/5)
	});

	it('should handle zero columnCount gracefully', () => {
		const result = calculateGridLayout(0, 100, 80, 5);
		expect(result.columnCount).toBe(1);
		expect(result.totalRows).toBe(0);
	});

	it('should handle zero rowHeight gracefully', () => {
		const result = calculateGridLayout(3, 0, 0, 5);
		expect(result.totalRows).toBe(0);
	});

	it('should calculate correct layout for large item counts', () => {
		const result = calculateGridLayout(5, 170, 150, 10000);
		expect(result.columnCount).toBe(5);
		expect(result.totalRows).toBe(2000);
		expect(result.totalContentHeight).toBe(1999 * 170 + 150);
	});
});
