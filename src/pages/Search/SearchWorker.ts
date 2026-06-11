/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { searchWithRSTParallel, initializeRST } from './RSTSearch/RSTSearch';
import { Note } from './RSTSearch/types';

/**
 * World-Class Stateful RST Search Worker
 * 
 * Unlike standard workers, this stores the entire dataset in-memory inside 
 * the worker thread. The main UI thread only sends "SYNC" when data changes
 * and "SEARCH" for queries.
 */

let localNotes: Note[] = [];

self.onmessage = async (e: MessageEvent) => {
  const { type, notes, query, isAccurateMode, requestId } = e.data;

  // 1. DATA SYNC - Only happens once or when a note is added/edited
  if (type === 'SYNC') {
    localNotes = notes || [];
    initializeRST(localNotes);
    self.postMessage({ type: 'SYNC_COMPLETE', requestId });
    return;
  }

  if (type === 'INVALIDATE' || type === 'FORCE_REFRESH') {
    localNotes = [];           // Force empty/stale
    self.postMessage({ type: 'INVALIDATE_COMPLETE', requestId });
    return;
  }

  // 2. ACTUAL SEARCH - Zero-copy query handling
  if (type === 'SEARCH') {
    try {
      const startTime = performance.now();
      
      // Execute the high-performance parallel chunked RST Core Scan
      const results = await searchWithRSTParallel(localNotes, query, isAccurateMode);
      
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
