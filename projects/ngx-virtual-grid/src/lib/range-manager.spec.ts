import { calculateVisibleRange } from './range-manager';

describe('calculateVisibleRange', () => {
    it('should return empty range for zero rows', () => {
        const result = calculateVisibleRange(0, 500, 100, 0, 3, 3, 0);
        expect(result.startRow).toBe(0);
        expect(result.endRow).toBe(0);
        expect(result.startIndex).toBe(0);
        expect(result.endIndex).toBe(0);
    });

    it('should return empty range for zero rowHeight', () => {
        const result = calculateVisibleRange(0, 500, 0, 10, 3, 3, 30);
        expect(result.startIndex).toBe(0);
        expect(result.endIndex).toBe(0);
    });

    it('should calculate visible range at top of scroll', () => {
        // scrollTop=0, viewport=500, rowHeight=100, totalRows=20, buffer=2, cols=3, items=60
        const result = calculateVisibleRange(0, 500, 100, 20, 2, 3, 60);
        // Visible rows: floor(0/100)=0 to ceil(500/100)=5
        // With buffer: max(0, 0-2)=0 to min(20, 5+2)=7
        expect(result.startRow).toBe(0);
        expect(result.endRow).toBe(7);
        expect(result.startIndex).toBe(0);
        expect(result.endIndex).toBe(21); // 7 * 3
    });

    it('should calculate visible range in the middle', () => {
        // scrollTop=1000, viewport=500, rowHeight=100, totalRows=50, buffer=2, cols=4, items=200
        const result = calculateVisibleRange(1000, 500, 100, 50, 2, 4, 200);
        // Visible: floor(1000/100)=10 to ceil(1500/100)=15
        // Buffer: max(0, 10-2)=8 to min(50, 15+2)=17
        expect(result.startRow).toBe(8);
        expect(result.endRow).toBe(17);
        expect(result.startIndex).toBe(32); // 8 * 4
        expect(result.endIndex).toBe(68); // 17 * 4
    });

    it('should clamp at bottom of scroll', () => {
        // scrollTop=4500, viewport=500, rowHeight=100, totalRows=50, buffer=3, cols=2, items=100
        const result = calculateVisibleRange(4500, 500, 100, 50, 3, 2, 100);
        // Visible: floor(4500/100)=45 to ceil(5000/100)=50
        // Buffer: max(0, 45-3)=42 to min(50, 50+3)=50
        expect(result.startRow).toBe(42);
        expect(result.endRow).toBe(50);
        expect(result.startIndex).toBe(84); // 42 * 2
        expect(result.endIndex).toBe(100); // min(50*2, 100)
    });

    it('should handle buffer larger than available rows', () => {
        // Only 3 rows, buffer of 5
        const result = calculateVisibleRange(0, 500, 100, 3, 5, 2, 6);
        expect(result.startRow).toBe(0);
        expect(result.endRow).toBe(3);
        expect(result.startIndex).toBe(0);
        expect(result.endIndex).toBe(6);
    });

    it('should handle single row', () => {
        const result = calculateVisibleRange(0, 500, 100, 1, 2, 5, 5);
        expect(result.startRow).toBe(0);
        expect(result.endRow).toBe(1);
        expect(result.startIndex).toBe(0);
        expect(result.endIndex).toBe(5);
    });

    it('should handle partial last row', () => {
        // 7 items in 3 columns = 3 rows (last row has 1 item)
        const result = calculateVisibleRange(0, 500, 100, 3, 1, 3, 7);
        expect(result.startRow).toBe(0);
        expect(result.endRow).toBe(3);
        expect(result.startIndex).toBe(0);
        expect(result.endIndex).toBe(7); // Not 9 (3*3), capped at totalItems
    });

    it('should handle zero buffer', () => {
        const result = calculateVisibleRange(200, 300, 100, 10, 0, 3, 30);
        // Visible: floor(200/100)=2 to ceil(500/100)=5
        // No buffer applied
        expect(result.startRow).toBe(2);
        expect(result.endRow).toBe(5);
        expect(result.startIndex).toBe(6);
        expect(result.endIndex).toBe(15);
    });
});
