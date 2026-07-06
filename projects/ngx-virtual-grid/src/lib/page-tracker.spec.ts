import { checkPageTracking, createPageTrackingState, PageTrackingResult, PageTrackingState } from './page-tracker';

describe('checkPageTracking', () => {
	// layout: 5 columns, 200px row height, 60 items per page
	const cols: number = 5;
	const rowHeight: number = 200;
	const pageSize: number = 60;
	const viewport: number = 700;
	const bufferSize: number = 2;
	// prefetch margin = viewport + bufferSize * rowHeight = 700 + 400 = 1100px

	function check(
		scrollIntoComponent: number,
		effectiveTotal: number,
		page: number,
		state: PageTrackingState,
	): PageTrackingResult {
		return checkPageTracking(
			scrollIntoComponent,
			viewport,
			rowHeight,
			cols,
			effectiveTotal,
			pageSize,
			page,
			bufferSize,
			state,
		);
	}

	describe('pageChanged', () => {
		it('should emit page 0 at the top', () => {
			const result = check(0, 300, 0, createPageTrackingState());
			expect(result.emitPageChanged).toBe(0);
		});

		it('should not re-emit the same page', () => {
			const first = check(0, 300, 0, createPageTrackingState());
			const second = check(100, 300, 0, first.state);
			expect(second.emitPageChanged).toBeNull();
		});

		it('should emit a new page when scrolling into it', () => {
			// page 0 = items 0-59, page 1 = items 60-119
			// 60 items / 5 cols = 12 rows. page 1 starts at row 12 = 2400px
			// viewport center at midpoint = scroll + 350
			// to center on page 1: scroll ≈ 2400 - 350 = 2050
			const first = check(0, 300, 0, createPageTrackingState());
			const second = check(2400, 300, 0, first.state);
			expect(second.emitPageChanged).toBe(1);
		});

		it('should clamp to maxKnownPage', () => {
			// 300 items / 60 per page = 5 pages (0-4). Scroll way past end.
			const result = check(99999, 300, 0, createPageTrackingState());
			expect(result.emitPageChanged).toBe(4);
		});

		it('should return null when pageSize is 0', () => {
			const result = checkPageTracking(0, viewport, rowHeight, cols, 300, 0, 0, bufferSize, createPageTrackingState());
			expect(result.emitPageChanged).toBeNull();
		});
	});

	describe('pageNeeded', () => {
		it('should not emit when page is 0 (nothing earlier to load)', () => {
			const result = check(0, 300, 0, createPageTrackingState());
			expect(result.emitPageNeeded).toBeNull();
		});

		it('should emit page-1 when top edge is at the start of loaded data', () => {
			// page=3, data starts at global index 180 (row 36 = 7200px)
			const result = check(7200, 300, 3, createPageTrackingState());
			expect(result.emitPageNeeded).toBe(2);
		});

		it('should emit page-1 when top edge is within the prefetch margin', () => {
			// page=3, loaded start = 7200px, margin ends at 8300px
			const result = check(8200, 300, 3, createPageTrackingState());
			expect(result.emitPageNeeded).toBe(2);
		});

		it('should not emit when top edge is exactly at the prefetch margin', () => {
			// page=3, loaded start = 7200px, 7200 + 1100 = 8300. strict < means no emit.
			const result = check(8300, 300, 3, createPageTrackingState());
			expect(result.emitPageNeeded).toBeNull();
		});

		it('should not emit when scrolled well below the loaded start', () => {
			// page=3, loaded start = 7200px. 9800 is far outside the 1100px margin.
			const result = check(9800, 300, 3, createPageTrackingState());
			expect(result.emitPageNeeded).toBeNull();
		});

		it('should not re-emit the same needed page', () => {
			const first = check(7200, 300, 3, createPageTrackingState());
			expect(first.emitPageNeeded).toBe(2);
			const second = check(7300, 300, 3, first.state);
			expect(second.emitPageNeeded).toBeNull();
		});

		it('should emit a new needed page after page input changes', () => {
			// page=3 emits need for page 2
			const first = check(7200, 300, 3, createPageTrackingState());
			expect(first.emitPageNeeded).toBe(2);

			// consumer loaded page 2, now page=2
			// scroll up near page 2 start: globalStart = 120, row 24 = 4800px
			const second = check(4800, 360, 2, first.state);
			expect(second.emitPageNeeded).toBe(1);
		});

		// ====================================================================
		// FAST UPWARD SCROLL: flinging the scrollbar far above the loaded data
		// must emit the page under the viewport (so consumers can backfill the
		// whole gap), and catch-up must keep chaining after each prepend even
		// though prepends never fire scroll events.
		// ====================================================================

		it('should emit the viewport page when scrolled far above the loaded data', () => {
			// page=8, loaded start = row 96 = 19200px. user flings up to page 2:
			// scroll = 4800px -> row 24 -> index 120 -> page 2.
			const result = check(4800, 540, 8, createPageTrackingState());
			expect(result.emitPageNeeded).toBe(2);
		});

		it('should never emit above page-1 even when the viewport is inside loaded data', () => {
			// page=3, viewport top inside the loaded window (viewport page = 3),
			// clamped down to page - 1 = 2
			const result = check(7200, 300, 3, createPageTrackingState());
			expect(result.emitPageNeeded).toBe(2);
		});

		it('should re-emit after the page input changes so catch-up chains (stall regression)', () => {
			// user is at page 2, data starts at page 8 -> needs page 2
			const first = check(4800, 540, 8, createPageTrackingState());
			expect(first.emitPageNeeded).toBe(2);

			// consumer only prepended one page (page input 8 -> 7). the viewport
			// still needs page 2. the page change resets the de-dup, so the same
			// needed page is emitted again instead of deadlocking in blank space.
			const second = check(4800, 540, 7, first.state);
			expect(second.emitPageNeeded).toBe(2);
		});

		it('should not re-emit while the page input is unchanged', () => {
			const first = check(4800, 540, 8, createPageTrackingState());
			expect(first.emitPageNeeded).toBe(2);

			// consumer hasn't acted yet (page input still 8), scroll wiggles
			const second = check(4900, 540, 8, first.state);
			expect(second.emitPageNeeded).toBeNull();
		});

		// ====================================================================
		// CASCADE REGRESSION: after a prepend the user is usually still within
		// the newly-loaded first page. The old whole-page trigger requested the
		// NEXT earlier page immediately, chaining one API call per prepend.
		// ====================================================================

		it('should NOT cascade to the next page after a prepend', () => {
			// deep-linked to page 8: loaded start = row 96 = 19200px.
			// user sits just above the window start at 19000px -> needs page 7.
			const first = check(19000, 540, 8, createPageTrackingState());
			expect(first.emitPageNeeded).toBe(7);

			// page 7 prepended, page input becomes 7: loaded start = row 84 = 16800px.
			// same scroll position is now 2200px below the loaded start, far outside
			// the 1100px margin. the old code emitted 6 here.
			const second = check(19000, 540, 7, first.state);
			expect(second.emitPageNeeded).toBeNull();
		});
	});
});
