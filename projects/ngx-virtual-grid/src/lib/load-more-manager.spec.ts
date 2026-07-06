import { checkLoadMore, createLoadMoreState, LoadMoreResult, LoadMoreState } from './load-more-manager';

describe('checkLoadMore', () => {
	const threshold: number = 0.8;

	// helper: simulate a scroll event at a given position
	function check(
		scrollIntoComponent: number,
		viewportHeight: number,
		totalContentHeight: number,
		loading: boolean,
		state: LoadMoreState,
	): LoadMoreResult {
		return checkLoadMore(scrollIntoComponent, viewportHeight, totalContentHeight, loading, threshold, state);
	}

	it('should not fire when totalContentHeight is 0', () => {
		const result = check(0, 500, 0, false, createLoadMoreState());
		expect(result.shouldEmit).toBe(false);
	});

	it('should not fire when below threshold', () => {
		// scrolledInto = 300 + 500 = 800, ratio = 800/2000 = 0.4
		const result = check(300, 500, 2000, false, createLoadMoreState());
		expect(result.shouldEmit).toBe(false);
	});

	it('should fire when scroll ratio exceeds threshold', () => {
		// scrolledInto = 1200 + 500 = 1700, ratio = 1700/2000 = 0.85
		const result = check(1200, 500, 2000, false, createLoadMoreState());
		expect(result.shouldEmit).toBe(true);
		expect(result.state.loadMoreFired).toBe(true);
		expect(result.state.contentHeightAtLastLoad).toBe(2000);
	});

	it('should not fire twice at same position', () => {
		const first = check(1200, 500, 2000, false, createLoadMoreState());
		const second = check(1200, 500, 2000, false, first.state);
		expect(first.shouldEmit).toBe(true);
		expect(second.shouldEmit).toBe(false);
	});

	it('should not fire when loading is true', () => {
		const result = check(1200, 500, 2000, true, createLoadMoreState());
		expect(result.shouldEmit).toBe(false);
	});

	it('should re-arm when content grows and user is not past end', () => {
		// fire at 2000 height
		const fired = check(1200, 500, 2000, false, createLoadMoreState());
		// content grows to 3000, user still near threshold
		// scrolledInto = 2200 + 500 = 2700, ratio = 2700/3000 = 0.9
		const result = check(2200, 500, 3000, false, fired.state);
		expect(result.shouldEmit).toBe(true);
	});

	it('should full-reset when content shrinks (items replaced)', () => {
		const fired = check(1200, 500, 2000, false, createLoadMoreState());
		// content shrinks to 1000 (items replaced), user near bottom
		// scrolledInto = 400 + 500 = 900, ratio = 900/1000 = 0.9
		const result = check(400, 500, 1000, false, fired.state);
		expect(result.shouldEmit).toBe(true);
		expect(result.state.scrolledPastEnd).toBe(false);
	});

	it('should suppress when scrolled past end', () => {
		// fire at threshold
		const fired = check(1200, 500, 2000, false, createLoadMoreState());
		// scroll past end (footer visible)
		// scrolledInto = 1800 + 500 = 2300 >= 2000
		const pastEnd = check(1800, 500, 2000, false, fired.state);
		expect(pastEnd.shouldEmit).toBe(false);
		expect(pastEnd.state.scrolledPastEnd).toBe(true);
	});

	it('should re-arm when user scrolls back up from past end', () => {
		const fired = check(1200, 500, 2000, false, createLoadMoreState());
		const pastEnd = check(1800, 500, 2000, false, fired.state);
		// scroll back up, below threshold
		const backUp = check(200, 500, 2000, false, pastEnd.state);
		expect(backUp.state.scrolledPastEnd).toBe(false);
		expect(backUp.state.loadMoreFired).toBe(false);
		// scroll down to threshold again
		const reFire = check(1200, 500, 2000, false, backUp.state);
		expect(reFire.shouldEmit).toBe(true);
	});

	it('should fire when items dont fill viewport', () => {
		// totalContentHeight (300) < viewportHeight (500), always wrapperEndVisible
		const result = check(0, 500, 300, false, createLoadMoreState());
		expect(result.shouldEmit).toBe(true);
	});

	it('should not lock out when items dont fill viewport', () => {
		// fire when items small
		const fired = check(0, 500, 300, false, createLoadMoreState());
		// content grows but still doesn't fill viewport
		const result = check(0, 500, 400, false, fired.state);
		expect(result.shouldEmit).toBe(true);
	});

	// ========================================================================
	// THE REGRESSION TEST: the exact scenario from the DDoS bug.
	// If this test fails, you've reintroduced the infinite load loop.
	// ========================================================================

	it('should NOT fire after scrolling past end during loading then content grows', () => {
		// 1. fire at threshold
		const fired = check(1200, 500, 2000, false, createLoadMoreState());
		expect(fired.shouldEmit).toBe(true);

		// 2. loading starts (skeletons inflate content to 3000)
		// 3. user scrolls past everything into footer
		//    scrolledInto = 2800 + 500 = 3300 >= 3000
		const duringLoad = check(2800, 500, 3000, true, fired.state);
		expect(duringLoad.shouldEmit).toBe(false);
		expect(duringLoad.state.scrolledPastEnd).toBe(true); // key: flag set during loading

		// 4. loading completes, content grows (skeletons removed, real items added)
		//    user still in footer area, past the new end
		//    scrolledInto = 2800 + 500 = 3300 >= 2500
		const afterLoad = check(2800, 500, 2500, false, duringLoad.state);
		expect(afterLoad.shouldEmit).toBe(false); // must NOT fire — this was the bug
	});

	it('should NOT fire after scrolling past end during loading even without skeletons', () => {
		// same scenario but content height stays the same during loading (no skeletons)
		const fired = check(1200, 500, 2000, false, createLoadMoreState());

		// user scrolls past end while loading, content unchanged
		// scrolledInto = 1800 + 500 = 2300 >= 2000
		const duringLoad = check(1800, 500, 2000, true, fired.state);
		expect(duringLoad.state.scrolledPastEnd).toBe(true);

		// loading completes, content grows slightly but user still past end
		// scrolledInto = 1800 + 500 = 2300 >= 2200
		const afterLoad = check(1800, 500, 2200, false, duringLoad.state);
		expect(afterLoad.shouldEmit).toBe(false);
	});

	it('should fire after loading if content grew past the users scroll position', () => {
		// fire, then scroll past end during loading
		const fired = check(1200, 500, 2000, false, createLoadMoreState());
		const duringLoad = check(1800, 500, 2000, true, fired.state);

		// loading completes, content grew so much that user is now WITHIN it
		// scrolledInto = 1800 + 500 = 2300 < 2500 — user is at 92%, not past end
		const afterLoad = check(1800, 500, 2500, false, duringLoad.state);
		expect(afterLoad.shouldEmit).toBe(true);
	});

	it('should recover from past-end lockout after user scrolls back up', () => {
		// go through the full DDoS scenario
		const fired = check(1200, 500, 2000, false, createLoadMoreState());
		const duringLoad = check(2800, 500, 3000, true, fired.state);
		const afterLoad = check(2800, 500, 2500, false, duringLoad.state);
		expect(afterLoad.shouldEmit).toBe(false);

		// user scrolls back up
		const backUp = check(200, 500, 2500, false, afterLoad.state);
		expect(backUp.state.scrolledPastEnd).toBe(false);

		// scroll down to new threshold — should fire
		// scrolledInto = 1700 + 500 = 2200, ratio = 2200/2500 = 0.88
		const reFire = check(1700, 500, 2500, false, backUp.state);
		expect(reFire.shouldEmit).toBe(true);
	});

	it('should reset loadMoreFired when scrolling back below threshold', () => {
		const fired = check(1200, 500, 2000, false, createLoadMoreState());
		// scroll back up below threshold
		// scrolledInto = 200 + 500 = 700, ratio = 700/2000 = 0.35
		const result = check(200, 500, 2000, false, fired.state);
		expect(result.state.loadMoreFired).toBe(false);
	});
});
