export interface PageTrackingState {
	lastEmittedPageChanged: number;
	lastEmittedPageNeeded: number;
	lastPageInput: number;
}

export interface PageTrackingResult {
	emitPageChanged: number | null;
	emitPageNeeded: number | null;
	state: PageTrackingState;
}

export function createPageTrackingState(): PageTrackingState {
	return {
		lastEmittedPageChanged: -1,
		lastEmittedPageNeeded: -1,
		lastPageInput: -1,
	};
}

export function checkPageTracking(
	scrollIntoComponent: number,
	viewportHeight: number,
	rowHeight: number,
	columnCount: number,
	effectiveTotal: number,
	pageSize: number,
	page: number,
	bufferSize: number,
	state: PageTrackingState,
): PageTrackingResult {
	if (pageSize <= 0 || rowHeight <= 0) {
		return {
			emitPageChanged: null,
			emitPageNeeded: null,
			state,
		};
	}

	let lastEmittedPageChanged: number = state.lastEmittedPageChanged;
	let lastEmittedPageNeeded: number = state.lastEmittedPageNeeded;
	let lastPageInput: number = state.lastPageInput;
	let emitPageChanged: number | null = null;
	let emitPageNeeded: number | null = null;

	// the page input changed, meaning the consumer acted on the last pageNeeded
	// (or navigated). clear the de-dup so the same page can be requested again,
	// otherwise a dropped emission (e.g. consumer was mid-load) deadlocks catch-up.
	if (page !== lastPageInput) {
		lastPageInput = page;
		lastEmittedPageNeeded = -1;
	}

	const maxKnownPage: number = Math.max(0, Math.ceil(effectiveTotal / pageSize) - 1);

	// which page the user is viewing based on viewport center
	const midpoint: number = scrollIntoComponent + viewportHeight / 2;
	const midpointRow: number = Math.floor(midpoint / rowHeight);
	const midpointIndex: number = midpointRow * columnCount;
	const centerPage: number = Math.max(0, Math.min(Math.floor(midpointIndex / pageSize), maxKnownPage));

	if (centerPage !== lastEmittedPageChanged) {
		lastEmittedPageChanged = centerPage;
		emitPageChanged = centerPage;
	}

	// check if we need to load an earlier page based on how close the viewport top
	// is to the start of loaded data. the margin is one viewport plus the buffer zone,
	// NOT a whole page - a whole-page margin cascades after every prepend because the
	// user is usually still within the newly-loaded first page.
	const globalStart: number = page * pageSize;
	const loadedStartPx: number = Math.floor(globalStart / columnCount) * rowHeight;
	const prefetchMargin: number = viewportHeight + bufferSize * rowHeight;

	// the earliest page needed to cover the viewport top, at most the page adjacent
	// to the loaded data. a fast upward scroll can put the viewport many pages above
	// the loaded window; emitting the viewport's page (instead of always page - 1)
	// lets consumers backfill the whole gap instead of one page per emission.
	const topRow: number = Math.max(0, Math.floor(scrollIntoComponent / rowHeight));
	const topIndex: number = topRow * columnCount;
	const viewportTopPage: number = Math.floor(topIndex / pageSize);
	const neededPage: number = Math.max(0, Math.min(page - 1, viewportTopPage));
	const needsEarlierPage: boolean =
		page > 0 && scrollIntoComponent < loadedStartPx + prefetchMargin && neededPage !== lastEmittedPageNeeded;

	if (needsEarlierPage) {
		lastEmittedPageNeeded = neededPage;
		emitPageNeeded = neededPage;
	}

	return {
		emitPageChanged,
		emitPageNeeded,
		state: {
			lastEmittedPageChanged,
			lastEmittedPageNeeded,
			lastPageInput,
		},
	};
}
