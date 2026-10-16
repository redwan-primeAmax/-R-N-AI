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

import { useState, useEffect } from 'react';
import { DataManager } from '../services/storage/DataManager';
import { db } from '../services/storage/DexieDB';
import { DEFAULT_NOTE_LIMIT } from '../constants/defaults';

export function useNoteLimit(limit: number = DEFAULT_NOTE_LIMIT) {
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const checkLimit = async () => {
      const id = ++requestId;
      try {
        const activeId = await DataManager.getActiveWorkspaceId();
        // Trashed records still occupy quota until permanently deleted, matching
        // NoteService.saveNote. Native indexed count avoids reading every body.
        const count = await db.notes.where('workspaceId').equals(activeId).count();
        if (mounted && id === requestId) {
          setCurrentCount(count);
          setIsOverLimit(count >= limit);
        }
      } catch (err) {
        console.error('useNoteLimit error:', err);
      }
    };

    checkLimit();
    window.addEventListener('workspace-notes-changed', checkLimit);
    return () => {
      mounted = false;
      window.removeEventListener('workspace-notes-changed', checkLimit);
    };
  }, [limit]);

  return { isOverLimit, currentCount, limit };
}
