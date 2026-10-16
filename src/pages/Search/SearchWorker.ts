/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import { searchWithRST, initializeRST, invalidateRST } from './RSTSearch/RSTSearch';
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
    invalidateRST();
    self.postMessage({ type: 'INVALIDATE_COMPLETE', requestId });
    return;
  }

  if (type === 'SEARCH') {
    try {
      const startTime = performance.now();
      
      // Fast single-pass execution using pre-built global index
      const results = searchWithRST(localNotes, query, isAccurateMode);
      
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
