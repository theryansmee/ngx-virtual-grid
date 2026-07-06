export interface LoadMoreState {
	loadMoreFired: boolean;
	scrolledPastEnd: boolean;
	loadedEndAtLastLoad: number;
}

export interface LoadMoreResult {
	shouldEmit: boolean;
	state: LoadMoreState;
}

export function createLoadMoreState(): LoadMoreState {
	return {
		loadMoreFired: false,
		scrolledPastEnd: false,
		loadedEndAtLastLoad: 0,
	};
}

export function checkLoadMore(
	scrollIntoComponent: number,
	viewportHeight: number,
	totalContentHeight: number,
	loadedStartPx: number,
	loadedEndPx: number,
	loading: boolean,
	threshold: number,
	state: LoadMoreState,
): LoadMoreResult {
	const loadedWindowHeight: number = loadedEndPx - loadedStartPx;

	if (totalContentHeight <= 0 || loadedWindowHeight <= 0) {
		return {
			shouldEmit: false,
			state,
		};
	}

	let loadMoreFired: boolean = state.loadMoreFired;
	let scrolledPastEnd: boolean = state.scrolledPastEnd;
	let loadedEndAtLastLoad: number = state.loadedEndAtLastLoad;

	const scrolledInto: number = scrollIntoComponent + viewportHeight;
	// past-end geometry uses the FULL grid height (virtual pages above + skeletons).
	// this is the physical content the user can scroll past into a footer.
	const wrapperEndVisible: boolean = scrolledInto >= totalContentHeight;
	const itemsDontFillViewport: boolean = totalContentHeight <= viewportHeight;

	// IMPORTANT: must run BEFORE the loading early-return. Without it, scrolledPastEnd
	// never gets set while loading=true, and the loaded-data-grew re-arm allows infinite
	// fires: fire -> skeletons inflate -> user scrolls into footer -> items land -> re-arm
	// -> fire again, forever. Regression-tested in the DDoS block of the spec file.
	// Don't move this below the loading check.
	if (wrapperEndVisible && loadMoreFired && !itemsDontFillViewport) {
		scrolledPastEnd = true;
	}

	if (loading) {
		return {
			shouldEmit: false,
			state: {
				loadMoreFired,
				scrolledPastEnd,
				loadedEndAtLastLoad,
			},
		};
	}

	// loaded data end moved up (items replaced or reduced), full reset.
	// skeletons never move loadedEndPx, so transient skeleton deflation can't trigger this.
	if (loadedEndAtLastLoad > loadedEndPx) {
		loadedEndAtLastLoad = 0;
		loadMoreFired = false;
		scrolledPastEnd = false;
	}

	// loaded data grew (new page appended), re-arm so the next scroll past threshold
	// fires loadMore again. clears scrolledPastEnd if the user is no longer past the new end.
	// keeps scrolledPastEnd if they're still past end to prevent infinite fire loops.
	// prepends don't change loadedEndPx (page drops, items grow by the same amount),
	// so a prepend never re-arms here.
	const loadedDataGrew: boolean = loadedEndAtLastLoad > 0 && loadedEndPx > loadedEndAtLastLoad;

	if (loadedDataGrew && !wrapperEndVisible) {
		scrolledPastEnd = false;
	}

	if (loadedDataGrew && !scrolledPastEnd) {
		loadMoreFired = false;
		loadedEndAtLastLoad = 0;
	}

	// suppress if scrolled past end. checks both flags because after loaded data grows
	// the re-arm clears loadMoreFired, but scrolledPastEnd persists.
	if (wrapperEndVisible && (loadMoreFired || scrolledPastEnd) && !itemsDontFillViewport) {
		scrolledPastEnd = true;
		return {
			shouldEmit: false,
			state: {
				loadMoreFired,
				scrolledPastEnd,
				loadedEndAtLastLoad,
			},
		};
	}

	// scrolled back up from past end, clear and re-arm
	if (scrolledPastEnd && !wrapperEndVisible) {
		scrolledPastEnd = false;
		loadMoreFired = false;
	}

	// threshold is measured within the loaded data window, not the full grid height.
	// with pagination, virtual pages above would otherwise pin the ratio near 1 for
	// deep-linked users, firing loadMore the moment they touch the scrollbar.
	const scrollRatio: number = (scrolledInto - loadedStartPx) / loadedWindowHeight;

	if (scrollRatio < threshold) {
		loadMoreFired = false;
		return {
			shouldEmit: false,
			state: {
				loadMoreFired,
				scrolledPastEnd,
				loadedEndAtLastLoad,
			},
		};
	}

	if (loadMoreFired) {
		return {
			shouldEmit: false,
			state: {
				loadMoreFired,
				scrolledPastEnd,
				loadedEndAtLastLoad,
			},
		};
	}

	loadMoreFired = true;
	loadedEndAtLastLoad = loadedEndPx;
	return {
		shouldEmit: true,
		state: {
			loadMoreFired,
			scrolledPastEnd,
			loadedEndAtLastLoad,
		},
	};
}
