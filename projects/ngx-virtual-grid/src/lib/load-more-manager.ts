export interface LoadMoreState {
	loadMoreFired: boolean;
	scrolledPastEnd: boolean;
	contentHeightAtLastLoad: number;
}

export interface LoadMoreResult {
	shouldEmit: boolean;
	state: LoadMoreState;
}

export function createLoadMoreState(): LoadMoreState {
	return { loadMoreFired: false, scrolledPastEnd: false, contentHeightAtLastLoad: 0 };
}

export function checkLoadMore(
	scrollIntoComponent: number,
	viewportHeight: number,
	totalContentHeight: number,
	loading: boolean,
	threshold: number,
	state: LoadMoreState,
): LoadMoreResult {
	if (totalContentHeight <= 0) {
		return { shouldEmit: false, state };
	}

	let loadMoreFired: boolean = state.loadMoreFired;
	let scrolledPastEnd: boolean = state.scrolledPastEnd;
	let contentHeightAtLastLoad: number = state.contentHeightAtLastLoad;

	const scrolledInto: number = scrollIntoComponent + viewportHeight;
	const wrapperEndVisible: boolean = scrolledInto >= totalContentHeight;
	const itemsDontFillViewport: boolean = totalContentHeight <= viewportHeight;

	// IMPORTANT: this runs BEFORE the loading early-return. Without it, scrolledPastEnd
	// never gets set while loading=true, and the content-grew re-arm allows infinite fires.
	// See fix-ddos-shit.md for the full story. Don't move this below the loading check.
	if (wrapperEndVisible && loadMoreFired && !itemsDontFillViewport) {
		scrolledPastEnd = true;
	}

	if (loading) {
		return { shouldEmit: false, state: { loadMoreFired, scrolledPastEnd, contentHeightAtLastLoad } };
	}

	// items replaced or reduced, full reset
	if (contentHeightAtLastLoad > totalContentHeight) {
		contentHeightAtLastLoad = 0;
		loadMoreFired = false;
		scrolledPastEnd = false;
	}

	// content grew — re-arm, but only if user hasn't scrolled past the end (e.g. into a footer).
	// scrolledPastEnd guard here prevents re-arm → fire → re-arm loops.
	if (contentHeightAtLastLoad > 0 && totalContentHeight > contentHeightAtLastLoad && !scrolledPastEnd) {
		loadMoreFired = false;
		contentHeightAtLastLoad = 0;
	}

	// suppress if scrolled past end. uses (loadMoreFired || scrolledPastEnd) because
	// after content grows the re-arm clears loadMoreFired, but scrolledPastEnd persists.
	if (wrapperEndVisible && (loadMoreFired || scrolledPastEnd) && !itemsDontFillViewport) {
		scrolledPastEnd = true;
		return { shouldEmit: false, state: { loadMoreFired, scrolledPastEnd, contentHeightAtLastLoad } };
	}

	// scrolled back up from past-end, clear and re-arm
	if (scrolledPastEnd && !wrapperEndVisible) {
		scrolledPastEnd = false;
		loadMoreFired = false;
	}

	const scrollRatio: number = scrolledInto / totalContentHeight;

	if (scrollRatio < threshold) {
		loadMoreFired = false;
		return { shouldEmit: false, state: { loadMoreFired, scrolledPastEnd, contentHeightAtLastLoad } };
	}

	if (loadMoreFired) {
		return { shouldEmit: false, state: { loadMoreFired, scrolledPastEnd, contentHeightAtLastLoad } };
	}

	loadMoreFired = true;
	contentHeightAtLastLoad = totalContentHeight;
	return { shouldEmit: true, state: { loadMoreFired, scrolledPastEnd, contentHeightAtLastLoad } };
}
