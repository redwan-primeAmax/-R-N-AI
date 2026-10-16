/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
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
