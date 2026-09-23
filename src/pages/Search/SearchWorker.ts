/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { searchWithRST, searchWithRSTParallel, initializeRST } from './RSTSearch/RSTSearch';
import { Note } from './RSTSearch/types';

let localNotes: Note[] = [];

self.onmessage = async (e: MessageEvent) => {
  const { type, notes, query, isAccurateMode, requestId } = e.data;

  if (type === 'SYNC') {
    localNotes = notes || [];
    initializeRST(localNotes);
    self.postMessage({ type: 'SYNC_COMPLETE', requestId });
    return;
  }

  if (type === 'INVALIDATE' || type === 'FORCE_REFRESH') {
    localNotes = [];
    self.postMessage({ type: 'INVALIDATE_COMPLETE', requestId });
    return;
  }

  if (type === 'SEARCH') {
    try {
      const startTime = performance.now();
      
      // Fast single-pass execution using pre-built global index
      const results = localNotes.length > 5000 
        ? await searchWithRSTParallel(localNotes, query, isAccurateMode)
        : searchWithRST(localNotes, query, isAccurateMode);
      
      const endTime = performance.now();
      const timeMs = (endTime - startTime).toFixed(2);

      self.postMessage({
        type: 'SEARCH_RESULTS',
        results,
        timeMs,
        requestId,
        status: 'success'
      });
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown search error',
        requestId,
        status: 'error'
      });
    }
  }
};
